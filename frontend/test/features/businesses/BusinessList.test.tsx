import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBusinesses, type Business } from '../../../src/api/businesses.ts';
import { BusinessList } from '../../../src/features/businesses/BusinessList.tsx';
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
  {
    id: '7c1d0f35-2b8e-4e57-a1a4-5f0e3b9c6d22',
    name: 'Dulces de Ana',
    category: 'Desserts',
    locationSummary: 'Alameda del Río, home delivery',
    hasPhysicalStore: false,
    whatsappNumber: null,
  },
];

const errorMessage = 'No pudimos cargar los negocios. Inténtalo de nuevo.';

function renderBusinessList() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <BusinessList />
    </QueryClientProvider>,
  );
}

// Lets the first load and its 2 automatic retries (1 s apart) run, then lets React re-render.
async function runAllRetries() {
  await act(() => vi.advanceTimersByTimeAsync(2050));
}

afterEach(() => {
  fetchBusinessesMock.mockReset();
  vi.useRealTimers();
});

describe('BusinessList', () => {
  it('shows "Cargando…" while the list is loading', () => {
    fetchBusinessesMock.mockReturnValue(new Promise(() => {}));

    renderBusinessList();

    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
  });

  it('shows one card per business in API order', async () => {
    fetchBusinessesMock.mockResolvedValue(businesses);

    renderBusinessList();

    const list = await screen.findByRole('list');
    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent);
    expect(headings).toEqual(['Panadería La Esquina', 'Dulces de Ana']);
    expect(list.querySelectorAll(':scope > li')).toHaveLength(2);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the empty message when there are no businesses', async () => {
    fetchBusinessesMock.mockResolvedValue([]);

    renderBusinessList();

    expect(await screen.findByText('Aún no hay negocios disponibles')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows the error message and "Reintentar" after the retries fail', async () => {
    vi.useFakeTimers();
    fetchBusinessesMock.mockRejectedValue(new Error('network down'));

    renderBusinessList();
    await runAllRetries();

    expect(fetchBusinessesMock).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('loads again and shows the list when "Reintentar" is clicked', async () => {
    vi.useFakeTimers();
    fetchBusinessesMock.mockRejectedValue(new Error('network down'));

    renderBusinessList();
    await runAllRetries();
    fetchBusinessesMock.mockResolvedValue(businesses);

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await act(() => vi.advanceTimersByTimeAsync(50));

    expect(fetchBusinessesMock).toHaveBeenCalledTimes(4);
    expect(screen.getByRole('heading', { name: 'Panadería La Esquina' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows no technical details in the error view', async () => {
    vi.useFakeTimers();
    fetchBusinessesMock.mockRejectedValue(new Error('GET /businesses failed with status 500'));

    const { container } = renderBusinessList();
    await runAllRetries();

    // AC-6.4: the whole view is the friendly message and the button, nothing else.
    expect(container.textContent).toBe(`${errorMessage}Reintentar`);
  });
});
