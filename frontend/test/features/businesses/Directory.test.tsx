import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBusinesses, type Business } from '../../../src/api/businesses.ts';
import { Directory } from '../../../src/features/businesses/Directory.tsx';
import { createQueryClient } from '../../../src/queryClient.ts';

vi.mock('../../../src/api/businesses.ts', () => ({ fetchBusinesses: vi.fn() }));

const fetchBusinessesMock = vi.mocked(fetchBusinesses);

// Spec 001 data, kept from BusinessList.test.tsx.
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

// Spec 003 data: categories with spelling variants, stores, and delivery-only businesses.
const neighborhood: Business[] = [
  { id: 'cafe', name: 'Café del Río', category: 'Cafetería', locationSummary: 'Torre 1', hasPhysicalStore: true, whatsappNumber: '573001111111' },
  { id: 'bakery', name: 'La Esquina', category: 'Panadería', locationSummary: 'Torre 2', hasPhysicalStore: true, whatsappNumber: null },
  { id: 'desserts', name: 'Dulces de Ana', category: 'Postres', locationSummary: 'Torre 3', hasPhysicalStore: false, whatsappNumber: null },
  { id: 'coffee', name: 'Tinto Express', category: 'cafeteria', locationSummary: 'Torre 4', hasPhysicalStore: false, whatsappNumber: null },
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

function resultsSection(name = 'Todos los negocios') {
  return screen.getByRole('region', { name });
}

function tileNames(container: HTMLElement) {
  return within(container)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent);
}

afterEach(() => {
  fetchBusinessesMock.mockReset();
  vi.useRealTimers();
});

// Moved from BusinessList.test.tsx (spec 001). Assertions are kept; plan 003 section 8 lists what changed.
describe('Directory: spec 001 states', () => {
  it('shows "Cargando…" while the list is loading', () => {
    fetchBusinessesMock.mockReturnValue(new Promise(() => {}));

    renderDirectory();

    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
  });

  it('shows one tile per business in API order inside the results section', async () => {
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

    // AC-6.4: the content is the friendly message and the button, nothing else (the header only has the title).
    expect(screen.getByRole('main').textContent).toBe(`${errorMessage}Reintentar`);
    expect(screen.getByRole('banner').textContent).toBe(title);
  });
});

describe('Directory: header', () => {
  it('shows the h1 title and no search field while loading', () => {
    fetchBusinessesMock.mockReturnValue(new Promise(() => {}));

    renderDirectory();

    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('shows the h1 title and no search field on error', async () => {
    vi.useFakeTimers();
    fetchBusinessesMock.mockRejectedValue(new Error('network down'));

    renderDirectory();
    await runAllRetries();

    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('shows the h1 title and no search field or filter when the list is empty', async () => {
    fetchBusinessesMock.mockResolvedValue([]);

    renderDirectory();
    await screen.findByText('Aún no hay negocios disponibles');

    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Categorías' })).not.toBeInTheDocument();
  });

  it('shows the h1 title and the search field in the header when the list is loaded', async () => {
    fetchBusinessesMock.mockResolvedValue(neighborhood);

    renderDirectory();

    const header = await screen.findByRole('banner');
    expect(within(header).getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(await within(header).findByRole('searchbox', { name: 'Buscar negocios' })).toBeInTheDocument();
  });
});

describe('Directory: filtering', () => {
  it('filters the results and updates the count while typing', async () => {
    fetchBusinessesMock.mockResolvedValue(neighborhood);
    renderDirectory();
    const search = await screen.findByRole('searchbox');
    expect(within(resultsSection()).getByRole('status')).toHaveTextContent('4 negocios');

    fireEvent.change(search, { target: { value: 'dulces' } });

    expect(tileNames(resultsSection())).toEqual(['Dulces de Ana']);
    expect(within(resultsSection()).getByRole('status')).toHaveTextContent('1 negocio');
  });

  it('filters the results by category and titles the section with it', async () => {
    fetchBusinessesMock.mockResolvedValue(neighborhood);
    renderDirectory();
    await screen.findByRole('searchbox');

    fireEvent.click(screen.getByRole('button', { name: 'Cafetería' }));

    const section = resultsSection('Cafetería');
    expect(within(section).getByRole('heading', { level: 2 })).toHaveTextContent('Cafetería');
    expect(tileNames(section)).toEqual(['Café del Río', 'Tinto Express']);
    expect(screen.getByRole('button', { name: 'Cafetería' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the search field and the filter visible when nothing matches', async () => {
    fetchBusinessesMock.mockResolvedValue(neighborhood);
    renderDirectory();
    const search = await screen.findByRole('searchbox');

    fireEvent.change(search, { target: { value: 'zapatería' } });

    expect(screen.getByText('No encontramos negocios')).toBeInTheDocument();
    expect(screen.getByText('Prueba con otra búsqueda o categoría.')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('zapatería');
    expect(screen.getByRole('navigation', { name: 'Categorías' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });
});

describe('Directory: featured section', () => {
  const featured = () => screen.queryByRole('region', { name: 'Visítalos en su tienda' });

  it('shows the businesses with a store when there is no filter', async () => {
    fetchBusinessesMock.mockResolvedValue(neighborhood);
    renderDirectory();
    await screen.findByRole('searchbox');

    const section = featured();
    expect(section).not.toBeNull();
    expect(tileNames(section as HTMLElement)).toEqual(['Café del Río', 'La Esquina']);
  });

  it('is hidden while a category is selected', async () => {
    fetchBusinessesMock.mockResolvedValue(neighborhood);
    renderDirectory();
    await screen.findByRole('searchbox');

    fireEvent.click(screen.getByRole('button', { name: 'Panadería' }));

    expect(featured()).not.toBeInTheDocument();
  });

  it('is hidden while the search has text', async () => {
    fetchBusinessesMock.mockResolvedValue(neighborhood);
    renderDirectory();
    const search = await screen.findByRole('searchbox');

    fireEvent.change(search, { target: { value: 'cafe' } });

    expect(featured()).not.toBeInTheDocument();
  });
});

describe('Directory: reload', () => {
  it('selects "Todos" and shows every business when a reload drops the selected category (AC-3.10)', async () => {
    const queryClient = createQueryClient();
    fetchBusinessesMock.mockResolvedValue(neighborhood);
    renderDirectory(queryClient);
    await screen.findByRole('searchbox');
    fireEvent.click(screen.getByRole('button', { name: 'Postres' }));
    expect(resultsSection('Postres')).toBeInTheDocument();

    const withoutDesserts = neighborhood.filter((business) => business.category !== 'Postres');
    fetchBusinessesMock.mockResolvedValue(withoutDesserts);
    await act(() => queryClient.refetchQueries());

    // TanStack Query notifies components on a later tick, so wait for the new data to render.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Postres' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
    expect(tileNames(resultsSection())).toEqual(['Café del Río', 'La Esquina', 'Tinto Express']);
  });
});
