import type { ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { interpretOpeningHours, saveOpeningHours } from '../../../src/api/openingHours.ts';
import { BUSINESSES_QUERY_KEY } from '../../../src/features/businesses/queryKeys.ts';
import {
  useInterpretOpeningHours,
  useSaveOpeningHours,
} from '../../../src/features/businesses/useOpeningHoursMutations.ts';
import { createQueryClient } from '../../../src/queryClient.ts';

vi.mock('../../../src/api/openingHours.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/api/openingHours.ts')>()),
  interpretOpeningHours: vi.fn(),
  saveOpeningHours: vi.fn(),
}));

const interpretMock = vi.mocked(interpretOpeningHours);
const saveMock = vi.mocked(saveOpeningHours);

const week = [{ dayOfWeek: 6, opens: '08:00', closes: '14:00' }];
const saveInput = { businessId: 'b1', openingHours: week, adminKey: 'k' };
const interpretInput = { businessId: 'b1', request: 'el sábado cerramos a las 2', adminKey: 'k' };

function wrapperFor(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

afterEach(() => {
  interpretMock.mockReset();
  saveMock.mockReset();
});

describe('useInterpretOpeningHours', () => {
  it('returns the interpretation from the API', async () => {
    interpretMock.mockResolvedValue({ understood: true, openingHours: week });
    const { result } = renderHook(() => useInterpretOpeningHours(), { wrapper: wrapperFor(createQueryClient()) });

    act(() => result.current.mutate(interpretInput));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ understood: true, openingHours: week });
    expect(interpretMock).toHaveBeenCalledWith(interpretInput, expect.anything());
  });

  it('does not retry a failure, since each attempt is a billed model call', async () => {
    interpretMock.mockRejectedValue(new Error('503'));
    const { result } = renderHook(() => useInterpretOpeningHours(), { wrapper: wrapperFor(createQueryClient()) });

    act(() => result.current.mutate(interpretInput));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(interpretMock).toHaveBeenCalledTimes(1);
  });

  it('does not touch the businesses query', async () => {
    interpretMock.mockResolvedValue({ understood: false });
    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useInterpretOpeningHours(), { wrapper: wrapperFor(queryClient) });

    act(() => result.current.mutate(interpretInput));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('useSaveOpeningHours', () => {
  it('invalidates the businesses query after a save, so the list loads again', async () => {
    saveMock.mockResolvedValue(week);
    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveOpeningHours(), { wrapper: wrapperFor(queryClient) });

    act(() => result.current.mutate(saveInput));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(saveMock).toHaveBeenCalledWith(saveInput, expect.anything());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: BUSINESSES_QUERY_KEY });
  });

  it('does not retry a failure and does not invalidate the list', async () => {
    saveMock.mockRejectedValue(new Error('500'));
    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveOpeningHours(), { wrapper: wrapperFor(queryClient) });

    act(() => result.current.mutate(saveInput));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
