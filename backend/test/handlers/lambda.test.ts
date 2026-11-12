import { GetParameterCommand } from '@aws-sdk/client-ssm';
import { describe, expect, it, vi } from 'vitest';
import type { EditingDependencies } from '../../src/app.ts';
import type { BusinessRow } from '../../src/domain/business.ts';
import {
  createAnthropicClient,
  createHandler,
  readSecureParameter,
  type ParameterClient,
} from '../../src/handlers/lambda.ts';

/** Editing dependencies that are never reached by the GET /businesses tests. */
function fakeEditing(overrides: Partial<EditingDependencies> = {}): EditingDependencies {
  return {
    readAdminKey: async () => 'test-admin-key',
    interpretBusinessOpeningHours: async () => ({ status: 'not_found' }),
    saveBusinessOpeningHours: async () => ({ status: 'not_found' }),
    logRequest: () => {},
    ...overrides,
  };
}

// An API Gateway HTTP API (payload format 2.0) event for GET /businesses.
function httpApiEvent(path: string, method = 'GET', extra: { headers?: Record<string, string>; body?: string } = {}) {
  return {
    version: '2.0',
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: '',
    headers: {
      accept: 'application/json',
      'user-agent': 'test-agent',
      'x-forwarded-for': '203.0.113.7',
      ...extra.headers,
    },
    body: extra.body,
    requestContext: {
      http: { method, path, protocol: 'HTTP/1.1', sourceIp: '203.0.113.7', userAgent: 'test-agent' },
    },
    isBase64Encoded: false,
  };
}

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

async function invoke(
  handler: ReturnType<typeof createHandler>,
  event: object,
): Promise<{ statusCode: number; contentType: string; body: string }> {
  const response = (await handler(event, {})) as HandlerResponse;
  const contentType = Object.entries(response.headers).find(([name]) => name.toLowerCase() === 'content-type')?.[1];
  return { statusCode: response.statusCode, contentType: contentType ?? '', body: response.body };
}

function row(overrides: Partial<BusinessRow> & Pick<BusinessRow, 'id'>): BusinessRow {
  return {
    name: 'Business',
    category: 'Bakery',
    locationSummary: 'Centro Comercial Plaza',
    hasPhysicalStore: true,
    whatsappNumber: '573001234567',
    createdAt: new Date('2026-10-01T12:00:00Z'),
    websiteUrl: null,
    openingHours: null,
    ...overrides,
  };
}

describe('GET /businesses handler', () => {
  it('returns 200 with the API contract, ordered and with normalized numbers (FR-1, plan 001 section 3)', async () => {
    const handler = createHandler({
      findRows: async () => [
        row({
          id: '7c1d0f35-2b8e-4e57-a1a4-5f0e3b9c6d22',
          name: 'Dulces de Ana',
          category: 'Desserts',
          locationSummary: 'Alameda del Río, home delivery',
          hasPhysicalStore: false,
          whatsappNumber: null,
          createdAt: new Date('2026-09-01T00:00:00Z'),
        }),
        row({
          id: '0b9f6c1e-6d0a-4c43-9f43-3a6c1d2e8a10',
          name: 'Panadería La Esquina',
          locationSummary: 'Centro Comercial Plaza, local 12',
          whatsappNumber: '+57 300 123 4567',
          createdAt: new Date('2026-10-01T00:00:00Z'),
          websiteUrl: 'https://example.com/panaderia',
          openingHours: '[{"dayOfWeek": 1, "opens": "07:00", "closes": "19:00"}]',
        }),
      ],
      logError: () => {},
      editing: fakeEditing(),
    });

    const response = await invoke(handler, httpApiEvent('/businesses'));

    expect(response.statusCode).toBe(200);
    expect(response.contentType).toMatch(/^application\/json/);
    expect(JSON.parse(response.body)).toEqual({
      businesses: [
        {
          id: '0b9f6c1e-6d0a-4c43-9f43-3a6c1d2e8a10',
          name: 'Panadería La Esquina',
          category: 'Bakery',
          locationSummary: 'Centro Comercial Plaza, local 12',
          hasPhysicalStore: true,
          whatsappNumber: '573001234567',
          websiteUrl: 'https://example.com/panaderia',
          openingHours: [{ dayOfWeek: 1, opens: '07:00', closes: '19:00' }],
        },
        {
          id: '7c1d0f35-2b8e-4e57-a1a4-5f0e3b9c6d22',
          name: 'Dulces de Ana',
          category: 'Desserts',
          locationSummary: 'Alameda del Río, home delivery',
          hasPhysicalStore: false,
          whatsappNumber: null,
          websiteUrl: null,
          openingHours: [],
        },
      ],
    });
  });

  it('returns 200 with an empty list when there are no businesses (FR-7, EC-1)', async () => {
    const handler = createHandler({ findRows: async () => [], logError: () => {}, editing: fakeEditing() });

    const response = await invoke(handler, httpApiEvent('/businesses'));

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ businesses: [] });
  });

  it('returns 500 with only internal_error when the repository fails, without technical details (AC-6.4)', async () => {
    const databaseError = new Error('password authentication failed for user "admin" at db.internal:5432');
    const logError = vi.fn();
    const handler = createHandler({
      findRows: async () => {
        throw databaseError;
      },
      logError,
      editing: fakeEditing(),
    });

    const response = await invoke(handler, httpApiEvent('/businesses'));

    expect(response.statusCode).toBe(500);
    expect(response.contentType).toMatch(/^application\/json/);
    expect(response.body).toBe('{"error":"internal_error"}');
    expect(response.body).not.toMatch(/password|admin|db\.internal|stack|at /i);
  });

  it('logs the error for diagnosis, but never request headers or the client IP (spec 001 section 3)', async () => {
    const databaseError = new Error('connection refused');
    const logError = vi.fn();
    const handler = createHandler({
      findRows: async () => {
        throw databaseError;
      },
      logError,
      editing: fakeEditing(),
    });

    await invoke(handler, httpApiEvent('/businesses'));

    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(databaseError);
    const logged = JSON.stringify(logError.mock.calls);
    expect(logged).not.toContain('203.0.113.7');
    expect(logged).not.toContain('test-agent');
  });

  it('returns internal_error and logs a clear message when the Data API configuration is missing (001-T8)', async () => {
    vi.stubEnv('DATA_API_CLUSTER_ARN', '');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { handler } = await import('../../src/handlers/lambda.ts');

      const response = await invoke(handler, httpApiEvent('/businesses'));

      expect(response.statusCode).toBe(500);
      expect(response.body).toBe('{"error":"internal_error"}');
      const loggedErrors = consoleError.mock.calls.flat().filter((argument) => argument instanceof Error);
      expect(loggedErrors.map((error) => error.message)).toContain('Missing environment variable DATA_API_CLUSTER_ARN');
    } finally {
      consoleError.mockRestore();
      vi.unstubAllEnvs();
    }
  });

  it('does not call the repository for other requests', async () => {
    const findRows = vi.fn(async () => []);
    const handler = createHandler({ findRows, logError: () => {}, editing: fakeEditing() });

    const response = await invoke(handler, httpApiEvent('/other'));

    expect(response.statusCode).toBe(404);
    expect(findRows).not.toHaveBeenCalled();
  });
});

const BUSINESS_ID = '0b9d6f3e-6a2c-4c8e-9a51-3f0e2d7c1b4a';
const EDITING_HEADERS = { authorization: 'Bearer test-admin-key', 'content-type': 'application/json' };

// Design D-1: the handler passes the editing routes through to the app.
describe('editing routes through the handler', () => {
  it('passes an interpretation request to the interpretation service', async () => {
    const interpretBusinessOpeningHours = vi.fn<EditingDependencies['interpretBusinessOpeningHours']>(async () => ({
      status: 'not_found',
    }));
    const handler = createHandler({
      findRows: async () => [],
      logError: () => {},
      editing: fakeEditing({ interpretBusinessOpeningHours }),
    });

    const response = await invoke(
      handler,
      httpApiEvent(`/businesses/${BUSINESS_ID}/opening-hours/interpretation`, 'POST', {
        headers: EDITING_HEADERS,
        body: JSON.stringify({ request: 'el sábado cerramos a las 2' }),
      }),
    );

    expect(response.statusCode).toBe(404);
    expect(interpretBusinessOpeningHours).toHaveBeenCalledWith({ id: BUSINESS_ID, request: 'el sábado cerramos a las 2' });
  });

  it('passes a save request to the save service', async () => {
    const saveBusinessOpeningHours = vi.fn<EditingDependencies['saveBusinessOpeningHours']>(async () => ({
      status: 'saved',
      openingHours: [],
    }));
    const handler = createHandler({
      findRows: async () => [],
      logError: () => {},
      editing: fakeEditing({ saveBusinessOpeningHours }),
    });

    const response = await invoke(
      handler,
      httpApiEvent(`/businesses/${BUSINESS_ID}/opening-hours`, 'PUT', {
        headers: EDITING_HEADERS,
        body: JSON.stringify({ openingHours: [] }),
      }),
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ openingHours: [] });
    expect(saveBusinessOpeningHours).toHaveBeenCalledWith({ id: BUSINESS_ID, openingHours: [] });
  });

  it('answers internal_error when the admin key parameter name is missing, and logs why', async () => {
    vi.stubEnv('ADMIN_KEY_PARAMETER', '');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const { handler } = await import('../../src/handlers/lambda.ts');

      const response = await invoke(
        handler,
        httpApiEvent(`/businesses/${BUSINESS_ID}/opening-hours`, 'PUT', {
          headers: EDITING_HEADERS,
          body: JSON.stringify({ openingHours: [] }),
        }),
      );

      expect(response.statusCode).toBe(500);
      expect(response.body).toBe('{"error":"internal_error"}');
      const loggedErrors = consoleError.mock.calls.flat().filter((argument) => argument instanceof Error);
      expect(loggedErrors.map((error) => error.message)).toContain('Missing environment variable ADMIN_KEY_PARAMETER');
      // The request log line is JSON, with the outcome and without the key.
      const requestLog = JSON.parse(consoleLog.mock.calls.at(-1)![0] as string);
      expect(requestLog).toMatchObject({ route: 'PUT /businesses/{id}/opening-hours', outcome: 'error' });
      expect(JSON.stringify(consoleLog.mock.calls)).not.toContain('test-admin-key');
    } finally {
      consoleError.mockRestore();
      consoleLog.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});

// Design D-8: secrets are read from SSM Parameter Store on each request, decrypted.
describe('readSecureParameter', () => {
  function fakeClient(output: Awaited<ReturnType<ParameterClient['send']>> = { Parameter: { Value: 'secret-value' } }) {
    return { send: vi.fn<ParameterClient['send']>(async () => output) };
  }

  it('asks SSM for the parameter named in the variable, with decryption, and returns its value', async () => {
    const client = fakeClient();

    const value = await readSecureParameter(client, { ADMIN_KEY_PARAMETER: '/alameda/dev/admin-key' }, 'ADMIN_KEY_PARAMETER');

    expect(value).toBe('secret-value');
    expect(client.send).toHaveBeenCalledTimes(1);
    const command = client.send.mock.calls[0]![0];
    expect(command).toBeInstanceOf(GetParameterCommand);
    expect(command.input).toEqual({ Name: '/alameda/dev/admin-key', WithDecryption: true });
  });

  it.each([
    ['missing', {}],
    ['empty', { ANTHROPIC_API_KEY_PARAMETER: '' }],
  ])('throws without calling SSM when the parameter name is %s', async (_case, environment) => {
    const client = fakeClient();

    await expect(readSecureParameter(client, environment, 'ANTHROPIC_API_KEY_PARAMETER')).rejects.toThrow(
      'Missing environment variable ANTHROPIC_API_KEY_PARAMETER',
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it('throws when the parameter has no value, naming the parameter but not a value', async () => {
    const client = fakeClient({ Parameter: {} });

    await expect(
      readSecureParameter(client, { ADMIN_KEY_PARAMETER: '/alameda/dev/admin-key' }, 'ADMIN_KEY_PARAMETER'),
    ).rejects.toThrow('Parameter /alameda/dev/admin-key has no value');
  });
});

// Design D-11: a clean 503 within the 10-second Lambda timeout.
describe('createAnthropicClient', () => {
  it('times out after 7 seconds and never retries', () => {
    const client = createAnthropicClient('test-anthropic-key');

    expect(client.timeout).toBe(7000);
    expect(client.maxRetries).toBe(0);
  });
});
