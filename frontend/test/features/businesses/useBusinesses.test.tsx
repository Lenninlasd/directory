import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBusinesses, type Business } from '../../../src/api/businesses.ts';
import { useBusinesses } from '../../../src/features/businesses/useBusinesses.ts';
import { createQueryClient } from '../../../src/queryClient.ts';

vi.mock('../../../src/api/businesses.ts', () => ({ fetchBusinesses: vi.fn() }));

const fetchBusinessesMock = vi.mocked(fetchBusinesses);

const businesses: Business[] = [
  {
    id: '0b9f6c1e-6d0a-4c43-9f43-3a6c1d2e8a10',
    name: 'Panadería La Esquina',
    category: 'Bakery',
    locationSummary: 'Centro Comercial Plaza, local 12',
    hasPhysicalStore: true,
    whatsappNumber: '573001234567',
  },
];

function renderUseBusinesses() {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useBusinesses(), { wrapper });
}

afterEach(() => {
  fetchBusinessesMock.mockReset();
  vi.useRealTimers();
});

describe('createQueryClient', () => {
  // Plan 001 section 5: retry: 2 and retryDelay: 1000 are the only defaults (AC-6.1).
  it('sets only the retry defaults', () => {
    expect(createQueryClient().getDefaultOptions()).toEqual({
      queries: { retry: 2, retryDelay: 1000 },
    });
  });
});

describe('useBusinesses', () => {
  it('returns the businesses from the API', async () => {
    fetchBusinessesMock.mockResolvedValue(businesses);

    const { result } = renderUseBusinesses();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(businesses);
    expect(fetchBusinessesMock).toHaveBeenCalledTimes(1);
  });

  it('retries a failing load 2 times, 1 second apart, then reports an error', async () => {
    vi.useFakeTimers();
    fetchBusinessesMock.mockRejectedValue(new Error('network down'));

    const { result } = renderUseBusinesses();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(fetchBusinessesMock).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(999));
    expect(fetchBusinessesMock).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(fetchBusinessesMock).toHaveBeenCalledTimes(2);
    expect(result.current.isError).toBe(false);

    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(fetchBusinessesMock).toHaveBeenCalledTimes(3);
    // The hook re-renders with the error a few milliseconds after the cache records it.
    await act(() => vi.advanceTimersByTimeAsync(50));
    expect(result.current.isError).toBe(true);

    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(fetchBusinessesMock).toHaveBeenCalledTimes(3);
  });

  it('calls the API again on refetch', async () => {
    fetchBusinessesMock.mockResolvedValue(businesses);

    const { result } = renderUseBusinesses();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(() => result.current.refetch());

    expect(fetchBusinessesMock).toHaveBeenCalledTimes(2);
  });
});
