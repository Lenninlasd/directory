import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import type { OpeningHoursRange } from '../../src/domain/openingHours.ts';
import { InterpretationUnavailable, type CallModel } from '../../src/interpretation/openingHoursInterpretation.ts';
import { PROMPT_VERSION } from '../../src/interpretation/openingHoursPrompt.ts';
import {
  interpretBusinessOpeningHours,
  saveBusinessOpeningHours,
  type FindOpeningHours,
  type UpdateOpeningHours,
} from '../../src/services/openingHoursService.ts';

const BUSINESS_ID = '0b9d6f3e-6a2c-4c8e-9a51-3f0e2d7c1b4a';
const ANTHROPIC_KEY = 'test-anthropic-key';

const MONDAY_TO_SATURDAY: OpeningHoursRange[] = [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  opens: '08:00',
  closes: '18:00',
}));

const SATURDAY_UNTIL_TWO: OpeningHoursRange[] = [
  ...MONDAY_TO_SATURDAY.slice(0, 5),
  { dayOfWeek: 6, opens: '08:00', closes: '14:00' },
];

/** A model answer with a JSON text block, as the SDK returns it. */
function modelAnswer(json: unknown): Anthropic.Message {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-5-5',
    content: [{ type: 'text', text: JSON.stringify(json) }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 812, output_tokens: 143 },
  } as unknown as Anthropic.Message;
}

/** Fakes for every dependency of the interpretation, with the stored hours as the database returns them. */
function interpretationFakes(options: { storedHours?: string | null; found?: boolean; answer?: unknown } = {}) {
  const { storedHours = JSON.stringify(MONDAY_TO_SATURDAY), found = true } = options;
  const answer = options.answer ?? { understood: true, openingHours: SATURDAY_UNTIL_TWO };
  const callModel = vi.fn<CallModel>(async () => modelAnswer(answer));
  return {
    callModel,
    findOpeningHours: vi.fn<FindOpeningHours>(async () => (found ? { openingHours: storedHours } : null)),
    readAnthropicApiKey: vi.fn(async () => ANTHROPIC_KEY),
    createCallModel: vi.fn((_apiKey: string) => callModel),
  };
}

/** The user message the model received. */
function sentMessage(callModel: ReturnType<typeof interpretationFakes>['callModel']): string {
  return callModel.mock.calls[0]![0].messages[0]!.content as string;
}

// business-editing spec, "Opening hours interpretation" and "Editing an inactive or unknown business".
describe('interpretBusinessOpeningHours', () => {
  it('returns the proposed week for a change to one day', async () => {
    const fakes = interpretationFakes();

    const result = await interpretBusinessOpeningHours(
      { id: BUSINESS_ID, request: 'el sábado cerramos a las 2' },
      fakes,
    );

    expect(result).toEqual({
      status: 'interpreted',
      result: {
        interpretation: { understood: true, openingHours: SATURDAY_UNTIL_TWO },
        stopReason: 'end_turn',
        usage: { inputTokens: 812, outputTokens: 143 },
        promptVersion: PROMPT_VERSION,
      },
    });
    expect(fakes.findOpeningHours).toHaveBeenCalledWith(BUSINESS_ID);
  });

  it('sends the hours read from the database and the trimmed request to the model', async () => {
    const fakes = interpretationFakes();

    await interpretBusinessOpeningHours({ id: BUSINESS_ID, request: '  el sábado cerramos a las 2 \n' }, fakes);

    const message = sentMessage(fakes.callModel);
    expect(message).toContain(`<stored_hours>\n${JSON.stringify(MONDAY_TO_SATURDAY)}\n</stored_hours>`);
    expect(message).toContain('<request>\nel sábado cerramos a las 2\n</request>');
  });

  it('reads the Anthropic key once and creates the model call with it', async () => {
    const fakes = interpretationFakes();

    await interpretBusinessOpeningHours({ id: BUSINESS_ID, request: 'el sábado cerramos a las 2' }, fakes);

    expect(fakes.readAnthropicApiKey).toHaveBeenCalledTimes(1);
    expect(fakes.createCallModel).toHaveBeenCalledWith(ANTHROPIC_KEY);
    expect(fakes.callModel).toHaveBeenCalledTimes(1);
  });

  it('passes a request that is not understood through', async () => {
    const fakes = interpretationFakes({ answer: { understood: false, openingHours: [] } });

    const result = await interpretBusinessOpeningHours({ id: BUSINESS_ID, request: 'hazme un poema' }, fakes);

    expect(result).toMatchObject({ status: 'interpreted', result: { interpretation: { understood: false } } });
  });

  it.each([
    ['no hours', null],
    ['hours that are not JSON', 'not json'],
    ['hours that are not a list', '{"dayOfWeek":1}'],
    ['hours with an invalid range', JSON.stringify([{ dayOfWeek: 8, opens: '08:00', closes: '18:00' }])],
  ])('sends stored %s to the model as []', async (_case, storedHours) => {
    const fakes = interpretationFakes({ storedHours });

    await interpretBusinessOpeningHours({ id: BUSINESS_ID, request: 'abrimos los domingos de 9 a 1' }, fakes);

    expect(sentMessage(fakes.callModel)).toContain('<stored_hours>\n[]\n</stored_hours>');
  });

  it('accepts a request of exactly 300 characters after trimming', async () => {
    const fakes = interpretationFakes();

    const result = await interpretBusinessOpeningHours({ id: BUSINESS_ID, request: ` ${'a'.repeat(300)} ` }, fakes);

    expect(result.status).toBe('interpreted');
  });

  it('accepts an id in upper case, as PostgreSQL does', async () => {
    const fakes = interpretationFakes();

    const result = await interpretBusinessOpeningHours(
      { id: BUSINESS_ID.toUpperCase(), request: 'el sábado cerramos a las 2' },
      fakes,
    );

    expect(result.status).toBe('interpreted');
  });

  it.each([
    ['missing', undefined],
    ['not a string', 42],
    ['empty', ''],
    ['only spaces', '   \n '],
    ['longer than 300 characters', 'a'.repeat(301)],
  ])('answers invalid_request for a request that is %s, before any other work', async (_case, request) => {
    const fakes = interpretationFakes();

    const result = await interpretBusinessOpeningHours({ id: BUSINESS_ID, request }, fakes);

    expect(result).toEqual({ status: 'invalid_request' });
    expect(fakes.findOpeningHours).not.toHaveBeenCalled();
    expect(fakes.readAnthropicApiKey).not.toHaveBeenCalled();
    expect(fakes.callModel).not.toHaveBeenCalled();
  });

  it.each([
    ['a word', 'abc'],
    ['empty', ''],
    ['a UUID with extra characters', `${BUSINESS_ID}x`],
    ['a UUID without hyphens', BUSINESS_ID.replaceAll('-', '')],
    ['SQL', "' OR 1=1 --"],
  ])('answers not_found for an id that is %s, without reading the business or the key', async (_case, id) => {
    const fakes = interpretationFakes();

    const result = await interpretBusinessOpeningHours({ id, request: 'el sábado cerramos a las 2' }, fakes);

    expect(result).toEqual({ status: 'not_found' });
    expect(fakes.findOpeningHours).not.toHaveBeenCalled();
    expect(fakes.readAnthropicApiKey).not.toHaveBeenCalled();
    expect(fakes.callModel).not.toHaveBeenCalled();
  });

  it('answers not_found for an unknown or inactive business, without reading the key', async () => {
    const fakes = interpretationFakes({ found: false });

    const result = await interpretBusinessOpeningHours({ id: BUSINESS_ID, request: 'el sábado cerramos a las 2' }, fakes);

    expect(result).toEqual({ status: 'not_found' });
    expect(fakes.readAnthropicApiKey).not.toHaveBeenCalled();
    expect(fakes.createCallModel).not.toHaveBeenCalled();
  });

  it('lets InterpretationUnavailable through when the model fails', async () => {
    const fakes = interpretationFakes();
    fakes.callModel.mockRejectedValue(new Error('Request timed out.'));

    await expect(
      interpretBusinessOpeningHours({ id: BUSINESS_ID, request: 'el sábado cerramos a las 2' }, fakes),
    ).rejects.toBeInstanceOf(InterpretationUnavailable);
  });

  it('lets a failure to read the Anthropic key through as it is, without calling the model', async () => {
    const fakes = interpretationFakes();
    const failure = new Error('ParameterNotFound');
    fakes.readAnthropicApiKey.mockRejectedValue(failure);

    await expect(
      interpretBusinessOpeningHours({ id: BUSINESS_ID, request: 'el sábado cerramos a las 2' }, fakes),
    ).rejects.toBe(failure);
    expect(fakes.callModel).not.toHaveBeenCalled();
  });

  it('lets a database failure through, without reading the key', async () => {
    const fakes = interpretationFakes();
    const failure = new Error('Data API unavailable');
    fakes.findOpeningHours.mockRejectedValue(failure);

    await expect(
      interpretBusinessOpeningHours({ id: BUSINESS_ID, request: 'el sábado cerramos a las 2' }, fakes),
    ).rejects.toBe(failure);
    expect(fakes.readAnthropicApiKey).not.toHaveBeenCalled();
  });
});

function saveFakes(written = true) {
  return { updateOpeningHours: vi.fn<UpdateOpeningHours>(async () => written) };
}

// business-editing spec, "Opening hours update" and "Opening hours for writing".
describe('saveBusinessOpeningHours', () => {
  it('stores a valid week sorted and returns it', async () => {
    const fakes = saveFakes();
    const unsorted = [...SATURDAY_UNTIL_TWO].reverse();

    const result = await saveBusinessOpeningHours({ id: BUSINESS_ID, openingHours: unsorted }, fakes);

    expect(result).toEqual({ status: 'saved', openingHours: SATURDAY_UNTIL_TWO });
    expect(fakes.updateOpeningHours).toHaveBeenCalledWith(BUSINESS_ID, JSON.stringify(SATURDAY_UNTIL_TWO));
  });

  it('stores [] as a week with no hours', async () => {
    const fakes = saveFakes();

    const result = await saveBusinessOpeningHours({ id: BUSINESS_ID, openingHours: [] }, fakes);

    expect(result).toEqual({ status: 'saved', openingHours: [] });
    expect(fakes.updateOpeningHours).toHaveBeenCalledWith(BUSINESS_ID, '[]');
  });

  it('gives the same result and the same write when the same week is sent twice', async () => {
    const fakes = saveFakes();

    const first = await saveBusinessOpeningHours({ id: BUSINESS_ID, openingHours: SATURDAY_UNTIL_TWO }, fakes);
    const second = await saveBusinessOpeningHours({ id: BUSINESS_ID, openingHours: SATURDAY_UNTIL_TWO }, fakes);

    expect(second).toEqual(first);
    expect(fakes.updateOpeningHours.mock.calls[1]).toEqual(fakes.updateOpeningHours.mock.calls[0]);
  });

  it.each([
    ['missing', undefined],
    ['not a list', { dayOfWeek: 1, opens: '08:00', closes: '18:00' }],
    [
      'overlapping ranges',
      [
        { dayOfWeek: 1, opens: '08:00', closes: '14:00' },
        { dayOfWeek: 1, opens: '12:00', closes: '18:00' },
      ],
    ],
    ['an invalid range', [{ dayOfWeek: 1, opens: '18:00', closes: '08:00' }]],
  ])('answers invalid_opening_hours for a week that is %s, without writing', async (_case, openingHours) => {
    const fakes = saveFakes();

    const result = await saveBusinessOpeningHours({ id: BUSINESS_ID, openingHours }, fakes);

    expect(result).toMatchObject({ status: 'invalid_opening_hours' });
    expect(result.status === 'invalid_opening_hours' && result.problems.length).toBeGreaterThan(0);
    expect(fakes.updateOpeningHours).not.toHaveBeenCalled();
  });

  it('answers not_found for a malformed id, without writing', async () => {
    const fakes = saveFakes();

    const result = await saveBusinessOpeningHours({ id: 'abc', openingHours: SATURDAY_UNTIL_TWO }, fakes);

    expect(result).toEqual({ status: 'not_found' });
    expect(fakes.updateOpeningHours).not.toHaveBeenCalled();
  });

  it('answers not_found when no active business was written', async () => {
    const result = await saveBusinessOpeningHours(
      { id: BUSINESS_ID, openingHours: SATURDAY_UNTIL_TWO },
      saveFakes(false),
    );

    expect(result).toEqual({ status: 'not_found' });
  });

  it('lets a database failure through', async () => {
    const fakes = saveFakes();
    const failure = new Error('Data API unavailable');
    fakes.updateOpeningHours.mockRejectedValue(failure);

    await expect(
      saveBusinessOpeningHours({ id: BUSINESS_ID, openingHours: SATURDAY_UNTIL_TWO }, fakes),
    ).rejects.toBe(failure);
  });
});
