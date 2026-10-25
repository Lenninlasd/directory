import { describe, expect, it, vi } from 'vitest';
import type { BusinessRow } from '../../src/domain/business.ts';
import { createHandler } from '../../src/handlers/lambda.ts';

// An API Gateway HTTP API (payload format 2.0) event for GET /businesses.
function httpApiEvent(path: string, method = 'GET') {
  return {
    version: '2.0',
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: '',
    headers: { accept: 'application/json', 'user-agent': 'test-agent', 'x-forwarded-for': '203.0.113.7' },
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
        }),
      ],
      logError: () => {},
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
        },
        {
          id: '7c1d0f35-2b8e-4e57-a1a4-5f0e3b9c6d22',
          name: 'Dulces de Ana',
          category: 'Desserts',
          locationSummary: 'Alameda del Río, home delivery',
          hasPhysicalStore: false,
          whatsappNumber: null,
        },
      ],
    });
  });

  it('returns 200 with an empty list when there are no businesses (FR-7, EC-1)', async () => {
    const handler = createHandler({ findRows: async () => [], logError: () => {} });

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
    const handler = createHandler({ findRows, logError: () => {} });

    const response = await invoke(handler, httpApiEvent('/other'));

    expect(response.statusCode).toBe(404);
    expect(findRows).not.toHaveBeenCalled();
  });
});
