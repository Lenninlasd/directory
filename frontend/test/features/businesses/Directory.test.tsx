import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBusinesses, type Business } from '../../../src/api/businesses.ts';
import { Directory } from '../../../src/features/businesses/Directory.tsx';
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
const title = 'Negocios en Alameda del Río';

function renderDirectory(queryClient: QueryClient = createQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <Directory />
    </QueryClientProvider>,
  );
}

// Lets the first load and its 2 automatic retries (1 s apart) run, then lets React re-render.
async function runAllRetries() {
  await act(() => vi.advanceTimersByTimeAsync(2050));
}

function resultsSection(name = 'Todos los negocios'): HTMLElement {
  return screen.getByRole('region', { name });
}

function tileNames(container: HTMLElement): string[] {
  return within(container)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent ?? '');
}

afterEach(() => {
  fetchBusinessesMock.mockReset();
  vi.useRealTimers();
});

// Moved from BusinessList.test.tsx (spec 001 FR-1, FR-6, FR-7), with the same assertions.
describe('Directory: spec 001 states', () => {
  it('shows "Cargando…" while the list is loading', () => {
    fetchBusinessesMock.mockReturnValue(new Promise(() => {}));

    renderDirectory();

    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
  });

  it('shows one tile per business in API order', async () => {
    fetchBusinessesMock.mockResolvedValue(businesses);

    renderDirectory();

    const section = await screen.findByRole('region', { name: 'Todos los negocios' });
    expect(tileNames(section)).toEqual(['Panadería La Esquina', 'Dulces de Ana']);
    expect(within(section).getByRole('list').querySelectorAll(':scope > li')).toHaveLength(2);
    expect(screen.queryByText('Cargando…')).not.toBeInTheDocument();
  });

  it('shows the empty message when there are no businesses', async () => {
    fetchBusinessesMock.mockResolvedValue([]);

    renderDirectory();

    expect(await screen.findByText('Aún no hay negocios disponibles')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows the error message and "Reintentar" after the retries fail', async () => {
    vi.useFakeTimers();
    fetchBusinessesMock.mockRejectedValue(new Error('network down'));

    renderDirectory();
    await runAllRetries();

    expect(fetchBusinessesMock).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('loads again and shows the list when "Reintentar" is clicked', async () => {
    vi.useFakeTimers();
    fetchBusinessesMock.mockRejectedValue(new Error('network down'));

    renderDirectory();
    await runAllRetries();
    fetchBusinessesMock.mockResolvedValue(businesses);

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await act(() => vi.advanceTimersByTimeAsync(50));

    expect(fetchBusinessesMock).toHaveBeenCalledTimes(4);
    expect(within(resultsSection()).getByRole('heading', { name: 'Panadería La Esquina' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows no technical details in the error view', async () => {
    vi.useFakeTimers();
    fetchBusinessesMock.mockRejectedValue(new Error('GET /businesses failed with status 500'));

    renderDirectory();
    await runAllRetries();

    // AC-6.4: the whole content is the friendly message and the button, nothing else.
    expect(screen.getByRole('main').textContent).toBe(`${errorMessage}Reintentar`);
  });
});

describe('Directory: header (spec 003 FR-1)', () => {
  it('shows the title and no search field while loading', () => {
    fetchBusinessesMock.mockReturnValue(new Promise(() => {}));

    renderDirectory();

    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('shows the title and no search field on error', async () => {
    vi.useFakeTimers();
    fetchBusinessesMock.mockRejectedValue(new Error('network down'));

    renderDirectory();
    await runAllRetries();

    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('shows the title and no search field when there are no businesses', async () => {
    fetchBusinessesMock.mockResolvedValue([]);

    renderDirectory();
    await screen.findByText('Aún no hay negocios disponibles');

    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('shows the title and the search field once businesses are loaded', async () => {
    fetchBusinessesMock.mockResolvedValue(businesses);

    renderDirectory();

    expect(await screen.findByRole('searchbox', { name: 'Buscar negocios' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });
});

describe('Directory: search, filter, and featured section (spec 003 FR-2, FR-3, FR-6, FR-7)', () => {
  it('filters the results and updates the count while the user types', async () => {
    fetchBusinessesMock.mockResolvedValue(businesses);
    renderDirectory();

    fireEvent.change(await screen.findByRole('searchbox'), { target: { value: 'dulces' } });

    expect(tileNames(resultsSection())).toEqual(['Dulces de Ana']);
    expect(within(resultsSection()).getByRole('status')).toHaveTextContent('1 negocio');
  });

  it('filters by the picked category and titles the section with it', async () => {
    fetchBusinessesMock.mockResolvedValue(businesses);
    renderDirectory();

    fireEvent.click(await screen.findByRole('button', { name: 'Desserts' }));

    expect(tileNames(resultsSection('Desserts'))).toEqual(['Dulces de Ana']);
    expect(screen.getByRole('button', { name: 'Desserts' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the search field and the filter visible when nothing matches', async () => {
    fetchBusinessesMock.mockResolvedValue(businesses);
    renderDirectory();

    fireEvent.change(await screen.findByRole('searchbox'), { target: { value: 'zapatería' } });

    expect(screen.getByText('No encontramos negocios')).toBeInTheDocument();
    expect(screen.getByText('Prueba con otra búsqueda o categoría.')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('zapatería');
    expect(screen.getByRole('navigation', { name: 'Categorías' })).toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('shows the featured section only while browsing every business with no search', async () => {
    fetchBusinessesMock.mockResolvedValue(businesses);
    renderDirectory();

    const featured = await screen.findByRole('region', { name: 'Visítalos en su tienda' });
    expect(tileNames(featured)).toEqual(['Panadería La Esquina']);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pan' } });
    expect(screen.queryByRole('region', { name: 'Visítalos en su tienda' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bakery' }));
    expect(screen.queryByRole('region', { name: 'Visítalos en su tienda' })).not.toBeInTheDocument();
  });

  it('selects "Todos" when a reload removes the selected category (AC-3.10)', async () => {
    const queryClient = createQueryClient();
    fetchBusinessesMock.mockResolvedValue(businesses);
    renderDirectory(queryClient);
    fireEvent.click(await screen.findByRole('button', { name: 'Desserts' }));

    fetchBusinessesMock.mockResolvedValue([businesses[0] as Business]);
    await act(() => queryClient.refetchQueries());
    // TanStack Query notifies subscribers on a later tick, so wait for the re-render.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Desserts' })).not.toBeInTheDocument());

    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
    expect(tileNames(resultsSection())).toEqual(['Panadería La Esquina']);
  });
});
