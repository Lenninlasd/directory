import {
  normalizeOpeningHours,
  validateOpeningHoursForWriting,
  type OpeningHoursRange,
} from '../domain/openingHours.ts';
import {
  interpretOpeningHours,
  type CallModel,
  type InterpretationResult,
} from '../interpretation/openingHoursInterpretation.ts';

/** The stored hours of one active business as JSON text, or `null` when there is no such business. */
export type FindOpeningHours = (id: string) => Promise<{ openingHours: string | null } | null>;

/** Stores a checked week as JSON text. `false` when no active business has that id. */
export type UpdateOpeningHours = (id: string, openingHoursJson: string) => Promise<boolean>;

export interface InterpretBusinessOpeningHoursDependencies {
  findOpeningHours: FindOpeningHours;
  /** Reads this environment's Anthropic API key, for example from SSM Parameter Store (design D-8). */
  readAnthropicApiKey: () => Promise<string>;
  /** Creates the model call with that key (design D-11). */
  createCallModel: (apiKey: string) => CallModel;
}

export interface SaveBusinessOpeningHoursDependencies {
  updateOpeningHours: UpdateOpeningHours;
}

export type InterpretBusinessOpeningHoursOutcome =
  | { status: 'invalid_request' }
  | { status: 'not_found' }
  | { status: 'interpreted'; result: InterpretationResult };

export type SaveBusinessOpeningHoursOutcome =
  | { status: 'not_found' }
  | { status: 'invalid_opening_hours'; problems: string[] }
  | { status: 'saved'; openingHours: OpeningHoursRange[] };

const MAX_REQUEST_LENGTH = 300;

// The canonical form only. PostgreSQL accepts other spellings too, but the API only hands out this one,
// and a malformed id must answer `404` before it reaches the `uuid` cast (design D-10).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isBusinessId(id: string): boolean {
  return UUID.test(id);
}

/** The request text trimmed, or `null` unless it is a string of 1 to 300 characters after trimming. */
function toRequestText(request: unknown): string | null {
  if (typeof request !== 'string') {
    return null;
  }
  const text = request.trim();
  return text.length >= 1 && text.length <= MAX_REQUEST_LENGTH ? text : null;
}

/**
 * Proposes a new week for one business from the admin's request (business-editing spec, "Opening hours
 * interpretation"). It never writes. The checks go from cheapest to most expensive, so an invalid
 * request, a bad id, or an unknown business never reads the Anthropic key or calls the model.
 * `InterpretationUnavailable` and failures to read the database or the key are thrown to the caller.
 */
export async function interpretBusinessOpeningHours(
  input: { id: string; request: unknown },
  { findOpeningHours, readAnthropicApiKey, createCallModel }: InterpretBusinessOpeningHoursDependencies,
): Promise<InterpretBusinessOpeningHoursOutcome> {
  const request = toRequestText(input.request);
  if (request === null) {
    return { status: 'invalid_request' };
  }
  if (!isBusinessId(input.id)) {
    return { status: 'not_found' };
  }

  const stored = await findOpeningHours(input.id);
  if (stored === null) {
    return { status: 'not_found' };
  }
  // Invalid stored hours are sent as `[]`, the week visitors see (design D-10).
  const storedHours = normalizeOpeningHours(stored.openingHours);

  const callModel = createCallModel(await readAnthropicApiKey());
  const result = await interpretOpeningHours({ storedHours, request }, callModel);
  return { status: 'interpreted', result };
}

/**
 * Stores the week the admin confirmed (business-editing spec, "Opening hours update"). It never calls
 * the model. The week is validated again, since it comes from the client, and stored sorted, so the
 * same week sent twice gives the same result. A database failure is thrown to the caller.
 */
export async function saveBusinessOpeningHours(
  input: { id: string; openingHours: unknown },
  { updateOpeningHours }: SaveBusinessOpeningHoursDependencies,
): Promise<SaveBusinessOpeningHoursOutcome> {
  if (!isBusinessId(input.id)) {
    return { status: 'not_found' };
  }

  const validation = validateOpeningHoursForWriting(input.openingHours);
  if (!validation.valid) {
    return { status: 'invalid_opening_hours', problems: validation.problems };
  }

  const written = await updateOpeningHours(input.id, JSON.stringify(validation.ranges));
  return written ? { status: 'saved', openingHours: validation.ranges } : { status: 'not_found' };
}
