import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBusinesses, type Business } from '../../src/api/businesses.ts';

const businesses: Business[] = [
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
];

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('fetchBusinesses', () => {
  it('calls the businesses endpoint under the API base URL once', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    fetchMock.mockResolvedValue(Response.json({ businesses }));

    await fetchBusinesses();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/businesses');
  });

  it('calls a relative path when the API base URL is empty (local dev proxy)', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    fetchMock.mockResolvedValue(Response.json({ businesses }));

    await fetchBusinesses();

    expect(fetchMock).toHaveBeenCalledWith('/businesses');
  });

  it('returns the list of businesses in API order', async () => {
    fetchMock.mockResolvedValue(Response.json({ businesses }));

    await expect(fetchBusinesses()).resolves.toEqual(businesses);
  });

  it('throws on a non-OK status', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'internal_error' }, { status: 500 }));

    await expect(fetchBusinesses()).rejects.toThrow();
  });

  it('throws on a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchBusinesses()).rejects.toThrow();
  });
});
