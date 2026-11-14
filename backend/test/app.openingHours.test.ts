import { inspect } from 'node:util';
import serverless from 'serverless-http';
import { describe, expect, it, vi } from 'vitest';
import { createApp, type EditingDependencies } from '../src/app.ts';
import type { OpeningHoursRange } from '../src/domain/openingHours.ts';
import {
  InterpretationUnavailable,
  type InterpretationResult,
} from '../src/interpretation/openingHoursInterpretation.ts';
import { PROMPT_VERSION } from '../src/interpretation/openingHoursPrompt.ts';
import type {
  InterpretBusinessOpeningHoursOutcome,
  SaveBusinessOpeningHoursOutcome,
} from '../src/services/openingHoursService.ts';

const BUSINESS_ID = '0b9d6f3e-6a2c-4c8e-9a51-3f0e2d7c1b4a';
const ADMIN_KEY = 'correct-admin-key-for-tests';
const REQUEST_TEXT = 'el sábado cerramos a las 2, texto-privado-de-prueba';
const INTERPRETATION_PATH = `/businesses/${BUSINESS_ID}/opening-hours/interpretation`;
const HOURS_PATH = `/businesses/${BUSINESS_ID}/opening-hours`;
const INTERPRETATION_ROUTE = 'POST /businesses/{id}/opening-hours/interpretation';
const HOURS_ROUTE = 'PUT /businesses/{id}/opening-hours';

const WEEK: OpeningHoursRange[] = [
  { dayOfWeek: 1, opens: '08:00', closes: '18:00' },
  { dayOfWeek: 6, opens: '08:00', closes: '14:00' },
];

function interpreted(understood: boolean): InterpretBusinessOpeningHoursOutcome {
  const result: InterpretationResult = {
    interpretation: understood ? { understood: true, openingHours: WEEK } : { understood: false },
    stopReason: 'end_turn',
    usage: { inputTokens: 812, outputTokens: 143 },
    promptVersion: PROMPT_VERSION,
  };
  return { status: 'interpreted', result };
}

/** Mocks for every editing dependency; `overrides` replaces some of them in the app only. */
function fakes(overrides: Partial<EditingDependencies> = {}) {
  const editing = {
    readAdminKey: vi.fn(async () => ADMIN_KEY),
    interpretBusinessOpeningHours: vi.fn<EditingDependencies['interpretBusinessOpeningHours']>(async () =>
      interpreted(true),
    ),
    saveBusinessOpeningHours: vi.fn<EditingDependencies['saveBusinessOpeningHours']>(
      async (): Promise<SaveBusinessOpeningHoursOutcome> => ({ status: 'saved', openingHours: WEEK }),
    ),
    logRequest: vi.fn<EditingDependencies['logRequest']>(),
  };
  const logError = vi.fn<(error: unknown) => void>();
  const handler = serverless(
    createApp({ listBusinesses: async () => [], logError, editing: { ...editing, ...overrides } }),
  );
  return { editing, logError, handler };
}

interface CallOptions {
  method: 'POST' | 'PUT';
  path: string;
  body?: string;
  authorization?: string | null;
  contentType?: string;
}

/** Calls the app through an API Gateway HTTP API event (payload format 2.0), as the Lambda does. */
async function call(
  handler: ReturnType<typeof serverless>,
  { method, path, body, authorization = `Bearer ${ADMIN_KEY}`, contentType = 'application/json' }: CallOptions,
) {
  const headers: Record<string, string> = { 'content-type': contentType, 'user-agent': 'test-agent' };
  if (authorization !== null) {
    headers.authorization = authorization;
  }
  const event = {
    version: '2.0',
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: '',
    headers,
    body,
    isBase64Encoded: false,
    requestContext: { http: { method, path, protocol: 'HTTP/1.1', sourceIp: '203.0.113.7', userAgent: 'test-agent' } },
  };
  const response = (await handler(event, {})) as { statusCode: number; body: string };
  return { status: response.statusCode, body: response.body };
}

function interpretation(handler: ReturnType<typeof serverless>, options: Partial<CallOptions> = {}) {
  return call(handler, {
    method: 'POST',
    path: INTERPRETATION_PATH,
    body: JSON.stringify({ request: REQUEST_TEXT }),
    ...options,
  });
}

function save(handler: ReturnType<typeof serverless>, options: Partial<CallOptions> = {}) {
  return call(handler, { method: 'PUT', path: HOURS_PATH, body: JSON.stringify({ openingHours: WEEK }), ...options });
}

/** Everything written to both logs, deeply printed so error causes are included. */
function everythingLogged(app: ReturnType<typeof fakes>): string {
  return inspect([app.editing.logRequest.mock.calls, app.logError.mock.calls], { depth: null });
}

const routes = [
  ['the interpretation route', interpretation],
  ['the update route', save],
] as const;

// business-editing spec, "Admin key".
describe.each(routes)('admin key on %s', (_route, send) => {
  it.each([
    ['no Authorization header', null],
    ['a wrong key', 'Bearer wrong-key'],
    ['a key of another scheme', `Basic ${ADMIN_KEY}`],
  ])('answers 401 unauthorized for %s, without calling the service', async (_case, authorization) => {
    const app = fakes();

    const response = await send(app.handler, { authorization });

    expect(response).toEqual({ status: 401, body: '{"error":"unauthorized"}' });
    expect(app.editing.interpretBusinessOpeningHours).not.toHaveBeenCalled();
    expect(app.editing.saveBusinessOpeningHours).not.toHaveBeenCalled();
  });

  it('checks the key before reading the body, so a bad body without a key is still 401', async () => {
    const app = fakes();

    const response = await send(app.handler, { authorization: null, body: '{not json' });

    expect(response.status).toBe(401);
  });

  it('answers 500 internal_error when the admin key cannot be read, without calling the service', async () => {
    const failure = new Error('ParameterNotFound');
    const app = fakes({ readAdminKey: async () => Promise.reject(failure) });

    const response = await send(app.handler);

    expect(response).toEqual({ status: 500, body: '{"error":"internal_error"}' });
    expect(app.logError).toHaveBeenCalledWith(failure);
    expect(app.editing.interpretBusinessOpeningHours).not.toHaveBeenCalled();
    expect(app.editing.saveBusinessOpeningHours).not.toHaveBeenCalled();
  });
});

// business-editing spec, "Editing an inactive or unknown business".
describe('unknown business', () => {
  it('answers 404 not_found on the interpretation route', async () => {
    const app = fakes({ interpretBusinessOpeningHours: async () => ({ status: 'not_found' }) });

    expect(await interpretation(app.handler)).toEqual({ status: 404, body: '{"error":"not_found"}' });
  });

  it('answers 404 not_found on the update route', async () => {
    const app = fakes({ saveBusinessOpeningHours: async () => ({ status: 'not_found' }) });

    expect(await save(app.handler)).toEqual({ status: 404, body: '{"error":"not_found"}' });
  });
});

// business-editing spec, "Opening hours interpretation".
describe('POST /businesses/{id}/opening-hours/interpretation', () => {
  it('passes the id from the path and the request from the body to the service', async () => {
    const app = fakes();

    await interpretation(app.handler);

    expect(app.editing.interpretBusinessOpeningHours).toHaveBeenCalledWith({ id: BUSINESS_ID, request: REQUEST_TEXT });
  });

  it('answers 200 with the proposed week when the request is understood', async () => {
    const app = fakes();

    const response = await interpretation(app.handler);

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ understood: true, openingHours: WEEK });
  });

  it('answers 200 with only understood false when the request is not understood', async () => {
    const app = fakes({ interpretBusinessOpeningHours: async () => interpreted(false) });

    expect(await interpretation(app.handler)).toEqual({ status: 200, body: '{"understood":false}' });
  });

  it('answers 400 invalid_request when the service rejects the text', async () => {
    const app = fakes({ interpretBusinessOpeningHours: async () => ({ status: 'invalid_request' }) });

    expect(await interpretation(app.handler)).toEqual({ status: 400, body: '{"error":"invalid_request"}' });
  });

  it.each([
    ['is not JSON', '{"request": '],
    ['is larger than 4 KB', JSON.stringify({ request: 'a'.repeat(5000) })],
  ])('answers 400 invalid_request when the body %s, without calling the service', async (_case, body) => {
    const app = fakes();

    expect(await interpretation(app.handler, { body })).toEqual({ status: 400, body: '{"error":"invalid_request"}' });
    expect(app.editing.interpretBusinessOpeningHours).not.toHaveBeenCalled();
  });

  it.each([
    ['a JSON body that is not an object', '["el sábado cerramos a las 2"]', 'application/json'],
    ['a body that is not JSON', REQUEST_TEXT, 'text/plain'],
  ])('passes no request to the service for %s', async (_case, body, contentType) => {
    const app = fakes();

    await interpretation(app.handler, { body, contentType });

    expect(app.editing.interpretBusinessOpeningHours).toHaveBeenCalledWith({ id: BUSINESS_ID, request: undefined });
  });

  it('answers 503 interpretation_unavailable, with no model or provider details', async () => {
    const cause = Object.assign(new Error('529 overloaded_error from api.anthropic.com'), { status: 529 });
    const app = fakes({
      interpretBusinessOpeningHours: async () => {
        throw new InterpretationUnavailable('the model call failed', { cause });
      },
    });

    expect(await interpretation(app.handler)).toEqual({
      status: 503,
      body: '{"error":"interpretation_unavailable"}',
    });
  });

  it('answers 500 internal_error for any other failure', async () => {
    const app = fakes({
      interpretBusinessOpeningHours: async () => {
        throw new Error('Data API unavailable');
      },
    });

    expect(await interpretation(app.handler)).toEqual({ status: 500, body: '{"error":"internal_error"}' });
  });
});

// business-editing spec, "Opening hours update".
describe('PUT /businesses/{id}/opening-hours', () => {
  it('passes the id from the path and the week from the body to the service', async () => {
    const app = fakes();

    await save(app.handler);

    expect(app.editing.saveBusinessOpeningHours).toHaveBeenCalledWith({ id: BUSINESS_ID, openingHours: WEEK });
  });

  it('answers 200 with the stored week', async () => {
    const app = fakes();

    const response = await save(app.handler);

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ openingHours: WEEK });
  });

  it('answers 400 invalid_opening_hours when the service rejects the week', async () => {
    const app = fakes({
      saveBusinessOpeningHours: async () => ({ status: 'invalid_opening_hours', problems: ['overlap'] }),
    });

    expect(await save(app.handler)).toEqual({ status: 400, body: '{"error":"invalid_opening_hours"}' });
  });

  it('answers 400 invalid_opening_hours when the body is not JSON, without calling the service', async () => {
    const app = fakes();

    expect(await save(app.handler, { body: '{"openingHours": [' })).toEqual({
      status: 400,
      body: '{"error":"invalid_opening_hours"}',
    });
    expect(app.editing.saveBusinessOpeningHours).not.toHaveBeenCalled();
  });

  it('passes no week to the service when the body has no openingHours', async () => {
    const app = fakes();

    await save(app.handler, { body: '{}' });

    expect(app.editing.saveBusinessOpeningHours).toHaveBeenCalledWith({ id: BUSINESS_ID, openingHours: undefined });
  });

  it('answers 500 internal_error and logs the failure when the hours cannot be stored', async () => {
    const failure = new Error('Data API unavailable');
    const app = fakes({
      saveBusinessOpeningHours: async () => {
        throw failure;
      },
    });

    expect(await save(app.handler)).toEqual({ status: 500, body: '{"error":"internal_error"}' });
    expect(app.logError).toHaveBeenCalledWith(failure);
  });
});

// Design D-12: one log line per editing request, never headers, keys, or the request text.
describe('editing request logs', () => {
  it('logs an understood interpretation with the prompt version, stop reason, and tokens', async () => {
    const app = fakes();

    await interpretation(app.handler);

    expect(app.editing.logRequest).toHaveBeenCalledTimes(1);
    expect(app.editing.logRequest).toHaveBeenCalledWith({
      route: INTERPRETATION_ROUTE,
      outcome: 'understood',
      latencyMs: expect.any(Number),
      promptVersion: PROMPT_VERSION,
      stopReason: 'end_turn',
      inputTokens: 812,
      outputTokens: 143,
    });
  });

  it('logs a save with its route, outcome, and latency only', async () => {
    const app = fakes();

    await save(app.handler);

    expect(app.editing.logRequest).toHaveBeenCalledTimes(1);
    expect(app.editing.logRequest).toHaveBeenCalledWith({
      route: HOURS_ROUTE,
      outcome: 'saved',
      latencyMs: expect.any(Number),
    });
  });

  it.each<[string, Partial<EditingDependencies>, Partial<CallOptions>, string]>([
    ['unauthorized', {}, { authorization: 'Bearer wrong-key' }, 'unauthorized'],
    ['not found', { interpretBusinessOpeningHours: async () => ({ status: 'not_found' }) }, {}, 'not_found'],
    ['invalid text', { interpretBusinessOpeningHours: async () => ({ status: 'invalid_request' }) }, {}, 'invalid'],
    ['a body that is not JSON', {}, { body: '{' }, 'invalid'],
    ['not understood', { interpretBusinessOpeningHours: async () => interpreted(false) }, {}, 'not_understood'],
    [
      'unavailable',
      {
        interpretBusinessOpeningHours: async () => {
          throw new InterpretationUnavailable('stop reason max_tokens');
        },
      },
      {},
      'unavailable',
    ],
    [
      'a failure',
      {
        interpretBusinessOpeningHours: async () => {
          throw new Error('boom');
        },
      },
      {},
      'error',
    ],
  ])('logs one line with the outcome for %s', async (_case, overrides, options, outcome) => {
    const app = fakes(overrides);

    await interpretation(app.handler, options);

    expect(app.editing.logRequest).toHaveBeenCalledTimes(1);
    expect(app.editing.logRequest.mock.calls[0]![0]).toMatchObject({ route: INTERPRETATION_ROUTE, outcome });
    expect(app.editing.logRequest.mock.calls[0]![0].latencyMs).toBeGreaterThanOrEqual(0);
  });

  it.each([
    ['a wrong Anthropic key (401)', Object.assign(new Error('401 authentication_error: invalid x-api-key'), { status: 401 })],
    ['a rejected request (400)', Object.assign(new Error('400 invalid_request_error: output_config'), { status: 400 })],
    ['a timeout', new Error('Request timed out.')],
    ['a provider failure (500)', Object.assign(new Error('500 api_error: Internal server error'), { status: 500 })],
  ])('sends the cause of an unavailable interpretation to logError, for %s', async (_case, cause) => {
    const app = fakes({
      interpretBusinessOpeningHours: async () => {
        throw new InterpretationUnavailable('the model call failed', { cause });
      },
    });

    await interpretation(app.handler);

    expect(app.logError).toHaveBeenCalledTimes(1);
    const logged = app.logError.mock.calls[0]![0];
    expect(logged).toBeInstanceOf(InterpretationUnavailable);
    expect((logged as InterpretationUnavailable).cause).toBe(cause);
    const everything = everythingLogged(app);
    expect(everything).not.toContain(ADMIN_KEY);
    expect(everything).not.toContain('texto-privado-de-prueba');
  });

  it.each(routes)('never logs the header, the key, or the body on %s', async (_route, send) => {
    const app = fakes({
      interpretBusinessOpeningHours: async () => {
        throw new Error('boom');
      },
      saveBusinessOpeningHours: async () => {
        throw new Error('boom');
      },
    });

    await send(app.handler);
    await send(app.handler, { authorization: 'Bearer wrong-key-texto-privado' });

    const everything = everythingLogged(app);
    expect(everything).not.toContain(ADMIN_KEY);
    expect(everything).not.toContain('Bearer');
    expect(everything).not.toContain('texto-privado');
    expect(everything).not.toContain('test-agent');
    expect(everything).not.toContain('203.0.113.7');
  });

  it('does not log GET /businesses as an editing request', async () => {
    const app = fakes();
    const event = {
      version: '2.0',
      routeKey: 'GET /businesses',
      rawPath: '/businesses',
      rawQueryString: '',
      headers: {},
      isBase64Encoded: false,
      requestContext: { http: { method: 'GET', path: '/businesses', protocol: 'HTTP/1.1', sourceIp: '203.0.113.7' } },
    };

    await app.handler(event, {});

    expect(app.editing.logRequest).not.toHaveBeenCalled();
  });
});
