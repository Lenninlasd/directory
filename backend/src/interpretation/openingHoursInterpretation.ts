// Types only: the SDK client is created in the Lambda handler and passed in as `callModel` (design D-4).
import type Anthropic from '@anthropic-ai/sdk';
import { validateOpeningHoursForWriting, type OpeningHoursRange } from '../domain/openingHours.ts';
import { buildUserMessage, OPENING_HOURS_SCHEMA, PROMPT_VERSION, SYSTEM_PROMPT } from './openingHoursPrompt.ts';

/** The one model for this feature. Changing it needs an eval run and a reviewed PR (design D-11). */
export const MODEL = 'claude-haiku-5-5';

// Leaves room for the model's reasoning and a full week of ranges (design D-3).
const MAX_TOKENS = 4000;

/** Sends one request to the Messages API, for example `client.messages.create` (design D-4). */
export type CallModel = (params: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>;

export interface InterpretationInput {
  /** The hours stored for the business, as read from the database, never sent by the client. */
  storedHours: OpeningHoursRange[];
  /** The admin's request, already checked for length by the service. */
  request: string;
}

export type Interpretation = { understood: true; openingHours: OpeningHoursRange[] } | { understood: false };

export interface InterpretationResult {
  interpretation: Interpretation;
  /** For the logs (design D-12). */
  stopReason: Anthropic.StopReason | null;
  usage: { inputTokens: number; outputTokens: number };
  promptVersion: string;
}

/**
 * The model could not give a usable answer: the call failed or timed out, or the answer was cut off or
 * malformed. The route answers `503 interpretation_unavailable` (business-editing spec).
 */
export class InterpretationUnavailable extends Error {
  constructor(reason: string, options?: { cause?: unknown }) {
    super(`Opening hours interpretation unavailable: ${reason}`, options);
    this.name = 'InterpretationUnavailable';
  }
}

function buildRequest({ storedHours, request }: InterpretationInput): Anthropic.MessageCreateParamsNonStreaming {
  // No `thinking` (adaptive by default on this model) and no `temperature` (rejected by it) (design D-3).
  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(storedHours, request) }],
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: OPENING_HOURS_SCHEMA },
    },
  };
}

function parseAnswer(response: Anthropic.Message): unknown {
  // Thinking blocks can come first; structured output puts the JSON in the one text block.
  const texts = response.content.filter((block) => block.type === 'text');
  if (texts.length !== 1) {
    throw new InterpretationUnavailable(`expected one text block, got ${texts.length}`);
  }
  try {
    return JSON.parse(texts[0]!.text);
  } catch (error) {
    throw new InterpretationUnavailable('the answer is not JSON', { cause: error });
  }
}

/** The model's answer is untrusted: its shape is checked here and its meaning by the domain (design D-6). */
function toInterpretation(answer: unknown): Interpretation {
  if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) {
    throw new InterpretationUnavailable('the answer is not an object');
  }
  const { understood, openingHours } = answer as Record<string, unknown>;
  if (typeof understood !== 'boolean') {
    throw new InterpretationUnavailable('the answer has no boolean "understood"');
  }
  if (!understood) {
    return { understood: false };
  }
  const validation = validateOpeningHoursForWriting(openingHours);
  return validation.valid ? { understood: true, openingHours: validation.ranges } : { understood: false };
}

function toInterpretationFromResponse(response: Anthropic.Message): Interpretation {
  switch (response.stop_reason) {
    case 'end_turn':
      return toInterpretation(parseAnswer(response));
    case 'refusal':
      // The model declined; for the admin this reads as a request it did not understand.
      return { understood: false };
    default:
      throw new InterpretationUnavailable(`stop reason ${String(response.stop_reason)}`);
  }
}

/**
 * Interprets an admin's request against the stored week with one model call (design D-4). It never
 * stores anything. It returns the full proposed week sorted, or `understood: false`, and throws
 * `InterpretationUnavailable` when no usable answer came back.
 */
export async function interpretOpeningHours(
  input: InterpretationInput,
  callModel: CallModel,
): Promise<InterpretationResult> {
  let response: Anthropic.Message;
  try {
    response = await callModel(buildRequest(input));
  } catch (error) {
    throw new InterpretationUnavailable('the model call failed', { cause: error });
  }

  return {
    interpretation: toInterpretationFromResponse(response),
    stopReason: response.stop_reason,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    promptVersion: PROMPT_VERSION,
  };
}
