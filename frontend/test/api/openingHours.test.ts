import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  interpretOpeningHours,
  saveOpeningHours,
  UnauthorizedError,
} from '../../src/api/openingHours.ts';

// Business-editing spec, "Opening hours interpretation" and "Opening hours update" (design D-1, D-13).
const businessId = '0b9f6c1e-6d0a-4c43-9f43-3a6c1d2e8a10';
const week = [{ dayOfWeek: 6, opens: '08:00', closes: '14:00' }];

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('interpretOpeningHours', () => {
  it('posts the request text with the admin key as a Bearer token', async () => {
    fetchMock.mockResolvedValue(Response.json({ understood: false }));

    await interpretOpeningHours({ businessId, request: 'el sábado cerramos a las 2', adminKey: 'the-key' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.test/businesses/${businessId}/opening-hours/interpretation`,
      {
        method: 'POST',
        headers: { authorization: 'Bearer the-key', 'content-type': 'application/json' },
        body: JSON.stringify({ request: 'el sábado cerramos a las 2' }),
      },
    );
  });

  it('calls a relative path when the API base URL is empty (local dev proxy)', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    fetchMock.mockResolvedValue(Response.json({ understood: false }));

    await interpretOpeningHours({ businessId, request: 'x', adminKey: 'k' });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/businesses/${businessId}/opening-hours/interpretation`);
  });

  it('encodes the business id in the path', async () => {
    fetchMock.mockResolvedValue(Response.json({ understood: false }));

    await interpretOpeningHours({ businessId: 'a/b', request: 'x', adminKey: 'k' });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.example.test/businesses/a%2Fb/opening-hours/interpretation');
  });

  it('returns an understood proposal with its week', async () => {
    fetchMock.mockResolvedValue(Response.json({ understood: true, openingHours: week }));

    await expect(interpretOpeningHours({ businessId, request: 'x', adminKey: 'k' })).resolves.toEqual({
      understood: true,
      openingHours: week,
    });
  });

  it('returns a request that was not understood', async () => {
    fetchMock.mockResolvedValue(Response.json({ understood: false }));

    await expect(interpretOpeningHours({ businessId, request: 'x', adminKey: 'k' })).resolves.toEqual({
      understood: false,
    });
  });

  it('throws UnauthorizedError on 401', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'unauthorized' }, { status: 401 }));

    await expect(interpretOpeningHours({ businessId, request: 'x', adminKey: 'k' })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it.each([400, 404, 500, 503])('throws a plain error on %i', async (status) => {
    fetchMock.mockResolvedValue(Response.json({ error: 'some_error' }, { status }));

    const failure = interpretOpeningHours({ businessId, request: 'x', adminKey: 'k' });

    await expect(failure).rejects.toThrow();
    await expect(failure).rejects.not.toBeInstanceOf(UnauthorizedError);
  });

  it('throws on a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(interpretOpeningHours({ businessId, request: 'x', adminKey: 'k' })).rejects.toThrow();
  });
});

describe('saveOpeningHours', () => {
  it('puts the week with the admin key as a Bearer token', async () => {
    fetchMock.mockResolvedValue(Response.json({ openingHours: week }));

    await saveOpeningHours({ businessId, openingHours: week, adminKey: 'the-key' });

    expect(fetchMock).toHaveBeenCalledWith(`https://api.example.test/businesses/${businessId}/opening-hours`, {
      method: 'PUT',
      headers: { authorization: 'Bearer the-key', 'content-type': 'application/json' },
      body: JSON.stringify({ openingHours: week }),
    });
  });

  it('returns the saved week', async () => {
    fetchMock.mockResolvedValue(Response.json({ openingHours: week }));

    await expect(saveOpeningHours({ businessId, openingHours: week, adminKey: 'k' })).resolves.toEqual(week);
  });

  it('throws UnauthorizedError on 401', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'unauthorized' }, { status: 401 }));

    await expect(saveOpeningHours({ businessId, openingHours: week, adminKey: 'k' })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it.each([400, 404, 500])('throws a plain error on %i', async (status) => {
    fetchMock.mockResolvedValue(Response.json({ error: 'some_error' }, { status }));

    const failure = saveOpeningHours({ businessId, openingHours: week, adminKey: 'k' });

    await expect(failure).rejects.toThrow();
    await expect(failure).rejects.not.toBeInstanceOf(UnauthorizedError);
  });
});
