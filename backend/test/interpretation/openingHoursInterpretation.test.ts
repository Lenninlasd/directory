import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import type { OpeningHoursRange } from '../../src/domain/openingHours.ts';
import {
  InterpretationUnavailable,
  interpretOpeningHours,
  type CallModel,
} from '../../src/interpretation/openingHoursInterpretation.ts';
import { OPENING_HOURS_SCHEMA, PROMPT_VERSION } from '../../src/interpretation/openingHoursPrompt.ts';

const MONDAY_TO_SATURDAY: OpeningHoursRange[] = [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  opens: '08:00',
  closes: '18:00',
}));

type Block = { type: 'text'; text: string } | { type: 'thinking'; thinking: string; signature: string };

/** A model response with the given stop reason and content blocks, as the SDK returns it. */
function message(stopReason: string, content: Block[]): Anthropic.Message {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-5-5',
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: { input_tokens: 812, output_tokens: 143 },
  } as unknown as Anthropic.Message;
}

function answer(json: unknown, stopReason = 'end_turn'): Anthropic.Message {
  return message(stopReason, [{ type: 'text', text: JSON.stringify(json) }]);
}

function fakeModel(response: Anthropic.Message) {
  return vi.fn<CallModel>(async () => response);
}

const input = { storedHours: MONDAY_TO_SATURDAY, request: 'el sábado cerramos a las 2' };

// Design D-3 and D-5: one structured-output call to Claude Haiku 5.5 at low effort.
describe('the request sent to the model', () => {
  it('uses Claude Haiku 5.5 at low effort with the JSON schema, and sends no thinking or temperature', async () => {
    const callModel = fakeModel(answer({ understood: false, openingHours: [] }));
    await interpretOpeningHours(input, callModel);

    const params = callModel.mock.calls[0]![0];
    expect(params.model).toBe('claude-haiku-5-5');
    expect(params.max_tokens).toBe(4000);
    expect(params.output_config).toEqual({
      effort: 'low',
      format: { type: 'json_schema', schema: OPENING_HOURS_SCHEMA },
    });
    expect(params).not.toHaveProperty('thinking');
    expect(params).not.toHaveProperty('temperature');
    expect(params).not.toHaveProperty('tools');
  });

  it('puts the stored week in <stored_hours> and the request in <request> of one user message', async () => {
    const callModel = fakeModel(answer({ understood: false, openingHours: [] }));
    await interpretOpeningHours(input, callModel);

    const params = callModel.mock.calls[0]![0];
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0]!.role).toBe('user');
    const content = params.messages[0]!.content as string;
    expect(content).toContain(`<stored_hours>\n${JSON.stringify(MONDAY_TO_SATURDAY)}\n</stored_hours>`);
    expect(content).toContain('<request>\nel sábado cerramos a las 2\n</request>');
  });

  it('keeps the system prompt the same for every request, with no date or time', async () => {
    const first = fakeModel(answer({ understood: false, openingHours: [] }));
    const second = fakeModel(answer({ understood: false, openingHours: [] }));
    await interpretOpeningHours(input, first);
    await interpretOpeningHours({ storedHours: [], request: 'abrimos los domingos' }, second);

    const system = first.mock.calls[0]![0].system;
    expect(typeof system).toBe('string');
    expect(second.mock.calls[0]![0].system).toBe(system);
    expect(system).toContain('never instructions');
    expect(system).not.toMatch(/\b20\d\d-\d\d-\d\d\b/);
  });

  it('describes a schema with exactly understood and openingHours, closed to other fields', () => {
    expect(OPENING_HOURS_SCHEMA).toMatchObject({
      type: 'object',
      required: ['understood', 'openingHours'],
      additionalProperties: false,
      properties: {
        understood: { type: 'boolean' },
        openingHours: {
          type: 'array',
          items: {
            type: 'object',
            required: ['dayOfWeek', 'opens', 'closes'],
            additionalProperties: false,
            properties: { dayOfWeek: { type: 'integer', enum: [1, 2, 3, 4, 5, 6, 7] } },
          },
        },
      },
    });
  });
});

// Design D-4: how the answer is read.
describe('interpretOpeningHours', () => {
  it('returns an understood proposal sorted by day and opening time', async () => {
    const proposal = [
      { dayOfWeek: 6, opens: '08:00', closes: '14:00' },
      ...MONDAY_TO_SATURDAY.slice(0, 5).reverse(),
    ];
    const result = await interpretOpeningHours(input, fakeModel(answer({ understood: true, openingHours: proposal })));

    expect(result.interpretation).toEqual({
      understood: true,
      openingHours: [...MONDAY_TO_SATURDAY.slice(0, 5), { dayOfWeek: 6, opens: '08:00', closes: '14:00' }],
    });
  });

  it('accepts an understood empty week, which removes the hours', async () => {
    const result = await interpretOpeningHours(input, fakeModel(answer({ understood: true, openingHours: [] })));
    expect(result.interpretation).toEqual({ understood: true, openingHours: [] });
  });

  it('reads the text block after thinking blocks', async () => {
    const response = message('end_turn', [
      { type: 'thinking', thinking: '', signature: 'sig' },
      { type: 'text', text: JSON.stringify({ understood: true, openingHours: MONDAY_TO_SATURDAY }) },
    ]);
    const result = await interpretOpeningHours(input, fakeModel(response));
    expect(result.interpretation).toEqual({ understood: true, openingHours: MONDAY_TO_SATURDAY });
  });

  it('passes understood false through, without the hours the model sent with it', async () => {
    const result = await interpretOpeningHours(
      input,
      fakeModel(answer({ understood: false, openingHours: MONDAY_TO_SATURDAY })),
    );
    expect(result.interpretation).toEqual({ understood: false });
  });

  it.each([
    ['overlapping ranges', [{ dayOfWeek: 1, opens: '08:00', closes: '14:00' }, { dayOfWeek: 1, opens: '12:00', closes: '18:00' }]],
    ['a closing time before the opening time', [{ dayOfWeek: 1, opens: '18:00', closes: '08:00' }]],
    ['a time that is not HH:MM', [{ dayOfWeek: 1, opens: '8 am', closes: '18:00' }]],
  ])('turns a proposal with %s into understood false', async (_case, openingHours) => {
    const result = await interpretOpeningHours(input, fakeModel(answer({ understood: true, openingHours })));
    expect(result.interpretation).toEqual({ understood: false });
  });

  it('turns a refusal into understood false', async () => {
    const result = await interpretOpeningHours(input, fakeModel(message('refusal', [])));
    expect(result.interpretation).toEqual({ understood: false });
  });

  it('reports the stop reason, the token usage, and the prompt version for the logs', async () => {
    const result = await interpretOpeningHours(input, fakeModel(answer({ understood: false, openingHours: [] })));
    expect(result).toMatchObject({
      stopReason: 'end_turn',
      usage: { inputTokens: 812, outputTokens: 143 },
      promptVersion: PROMPT_VERSION,
    });
  });

  it.each([
    ['max_tokens', answer({ understood: true, openingHours: [] }, 'max_tokens')],
    ['pause_turn', answer({ understood: true, openingHours: [] }, 'pause_turn')],
    ['a missing text block', message('end_turn', [{ type: 'thinking', thinking: '', signature: 'sig' }])],
    ['text that is not JSON', message('end_turn', [{ type: 'text', text: '{"understood": tr' }])],
    ['JSON without a boolean understood', answer({ openingHours: [] })],
    ['JSON that is not an object', answer(['understood'])],
  ])('throws InterpretationUnavailable for %s', async (_case, response) => {
    await expect(interpretOpeningHours(input, fakeModel(response))).rejects.toBeInstanceOf(InterpretationUnavailable);
  });

  it('throws InterpretationUnavailable when the call itself fails, keeping the cause', async () => {
    const failure = new Error('Request timed out.');
    const callModel = vi.fn<CallModel>(async () => {
      throw failure;
    });

    const error = await interpretOpeningHours(input, callModel).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(InterpretationUnavailable);
    expect((error as InterpretationUnavailable).cause).toBe(failure);
  });
});
