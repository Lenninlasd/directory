import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBusinesses, type Business } from '../../../src/api/businesses.ts';
import { Directory } from '../../../src/features/businesses/Directory.tsx';
import { createQueryClient } from '../../../src/queryClient.ts';

// Spec 003 FR-8, through the Directory that owns the dialog. Uses the test/setup.ts stand-ins for
// showModal() and close() (plan R-1); Escape and the focus trap are native and checked by hand.
vi.mock('../../../src/api/businesses.ts', () => ({ fetchBusinesses: vi.fn() }));

const fetchBusinessesMock = vi.mocked(fetchBusinesses);

const greeting = encodeURIComponent('Hola, te encontré en el directorio de Alameda del Río');

const cafe: Business = {
  id: 'cafe',
  name: 'Café del Río',
  category: 'Cafetería',
  locationSummary: 'Torre 1, apartamento 101, entrada por la portería norte',
  hasPhysicalStore: true,
  whatsappNumber: '573001111111',
  websiteUrl: null,
  openingHours: [],
};

const desserts: Business = {
  id: 'desserts',
  name: 'Dulces de Ana',
  category: 'Postres',
  locationSummary: 'Torre 3',
  hasPhysicalStore: false,
  whatsappNumber: null,
  websiteUrl: null,
  openingHours: [],
};

// Directory spec, "Detail dialog hours and website rows": a business with both, and one with a website only.
const bakery: Business = {
  id: 'bakery',
  name: 'Panadería La Esquina',
  category: 'Panadería',
  locationSummary: 'Local 12',
  hasPhysicalStore: true,
  whatsappNumber: null,
  websiteUrl: 'https://example.com/panaderia/',
  openingHours: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, opens: '08:00', closes: '18:00' })),
};

const tutoring: Business = {
  id: 'tutoring',
  name: 'Tutorías de Matemáticas',
  category: 'Educación',
  locationSummary: 'Torre 5',
  hasPhysicalStore: false,
  whatsappNumber: null,
  websiteUrl: 'https://example.com/tutorias',
  openingHours: [],
};

async function renderDirectory(queryClient: QueryClient = createQueryClient(), businesses: Business[] = [cafe, desserts]) {
  fetchBusinessesMock.mockResolvedValue(businesses);
  render(
    <QueryClientProvider client={queryClient}>
      <Directory />
    </QueryClientProvider>,
  );
  await screen.findByRole('region', { name: 'Todos los negocios' });
}

/** Opens a tile from the results section and returns its "Ver detalles" button. */
function openTile(business: Business): HTMLElement {
  const results = screen.getByRole('region', { name: 'Todos los negocios' });
  const opener = within(results).getByRole('button', { name: `Ver detalles de ${business.name}` });
  fireEvent.click(opener);
  return opener;
}

function openDialog(): HTMLDialogElement | null {
  return document.querySelector('dialog[open]');
}

afterEach(() => {
  fetchBusinessesMock.mockReset();
});

describe('BusinessDetailDialog: content', () => {
  it('shows a dialog named after the business with its category, badge, and full location', async () => {
    await renderDirectory();

    openTile(cafe);

    const dialog = screen.getByRole('dialog', { name: 'Café del Río' });
    expect(within(dialog).getByRole('heading', { name: 'Café del Río' })).toBeInTheDocument();
    expect(within(dialog).getByText('Cafetería')).toBeInTheDocument();
    expect(within(dialog).getByText('En tienda')).toBeInTheDocument();
    expect(within(dialog).getByText('Ubicación')).toBeInTheDocument();
    expect(within(dialog).getByText(cafe.locationSummary)).toBeInTheDocument();
  });

  it('shows the WhatsApp button with its visible text as the accessible name', async () => {
    await renderDirectory();

    openTile(cafe);

    const link = within(screen.getByRole('dialog')).getByRole('link');
    expect(link).toHaveAccessibleName('Escribir por WhatsApp');
    expect(link).toHaveTextContent('Escribir por WhatsApp');
    expect(link).toHaveAttribute('href', `https://wa.me/573001111111?text=${greeting}`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows the no-WhatsApp message when the business has no number', async () => {
    await renderDirectory();

    openTile(desserts);

    const dialog = screen.getByRole('dialog', { name: 'Dulces de Ana' });
    expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Este negocio no tiene WhatsApp registrado')).toBeInTheDocument();
  });

  it('renders no other business fields', async () => {
    await renderDirectory();

    openTile(cafe);

    // AC-8.3: the dialog text is exactly these values; the id and the raw number never appear.
    expect(openDialog()?.textContent).toBe(
      ['Cafetería', 'Café del Río', 'En tienda', 'Ubicación', cafe.locationSummary, 'Escribir por WhatsApp'].join(''),
    );
  });
});

describe('BusinessDetailDialog: opening hours and website rows', () => {
  it('shows "Horario" and then "Página web" below "Ubicación", and nothing else', async () => {
    await renderDirectory(createQueryClient(), [bakery]);

    openTile(bakery);

    expect(openDialog()?.textContent).toBe(
      [
        'Panadería',
        'Panadería La Esquina',
        'En tienda',
        'Ubicación',
        'Local 12',
        'Horario',
        'Lunes a viernes · 8:00 a. m. – 6:00 p. m.',
        'Sábado y domingo · Cerrado',
        'Página web',
        'example.com/panaderia',
        'Este negocio no tiene WhatsApp registrado',
      ].join(''),
    );
  });

  it('shows each group of days on its own line', async () => {
    await renderDirectory(createQueryClient(), [bakery]);

    openTile(bakery);

    const dialog = screen.getByRole('dialog', { name: bakery.name });
    expect(within(dialog).getByText('Lunes a viernes · 8:00 a. m. – 6:00 p. m.')).toBeInTheDocument();
    expect(within(dialog).getByText('Sábado y domingo · Cerrado')).toBeInTheDocument();
  });

  it('shows the website row right after "Ubicación" when there are no hours', async () => {
    await renderDirectory(createQueryClient(), [tutoring]);

    openTile(tutoring);

    const dialog = screen.getByRole('dialog', { name: tutoring.name });
    expect(within(dialog).queryByText('Horario')).not.toBeInTheDocument();
    expect(openDialog()?.textContent).toContain('UbicaciónTorre 5Página webexample.com/tutorias');
  });

  it('shows neither row without hours and without a website', async () => {
    await renderDirectory();

    openTile(cafe);

    const dialog = screen.getByRole('dialog', { name: cafe.name });
    expect(within(dialog).queryByText('Horario')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Página web')).not.toBeInTheDocument();
  });

  it('links to the website in a new tab, with the address as its name and a hidden icon', async () => {
    await renderDirectory(createQueryClient(), [bakery]);

    openTile(bakery);

    const link = within(screen.getByRole('dialog', { name: bakery.name })).getByRole('link');
    expect(link).toHaveAccessibleName('example.com/panaderia');
    expect(link).toHaveAttribute('href', 'https://example.com/panaderia/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('BusinessDetailDialog: closing', () => {
  it('closes with "Cerrar" and returns focus to the tile that opened it', async () => {
    await renderDirectory();
    const opener = openTile(cafe);

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar' }));

    expect(openDialog()).toBeNull();
    expect(opener).toHaveFocus();
  });

  it('closes on a click on the dialog element itself (the backdrop)', async () => {
    await renderDirectory();
    const opener = openTile(cafe);

    fireEvent.click(screen.getByRole('dialog'));

    expect(openDialog()).toBeNull();
    expect(opener).toHaveFocus();
  });

  it('stays open on a click inside its content', async () => {
    await renderDirectory();
    openTile(cafe);

    fireEvent.click(within(screen.getByRole('dialog')).getByText('Ubicación'));

    expect(openDialog()).not.toBeNull();
  });

  it('can be opened again for another business after closing', async () => {
    await renderDirectory();
    openTile(cafe);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar' }));

    openTile(desserts);

    expect(screen.getByRole('dialog', { name: 'Dulces de Ana' })).toBeInTheDocument();
  });
});

describe('BusinessDetailDialog: page around it', () => {
  it('sets overflow-hidden on html only while the dialog is open (AC-8.8)', async () => {
    await renderDirectory();
    const html = document.documentElement;
    expect(html).not.toHaveClass('overflow-hidden');

    openTile(cafe);
    expect(html).toHaveClass('overflow-hidden');

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar' }));
    expect(html).not.toHaveClass('overflow-hidden');
  });

  it('does not change the page URL when opening and closing (AC-8.9)', async () => {
    await renderDirectory();
    const before = window.location.href;

    openTile(cafe);
    expect(window.location.href).toBe(before);

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar' }));
    expect(window.location.href).toBe(before);
  });

  it('closes when a reload removes the open business', async () => {
    const queryClient = createQueryClient();
    await renderDirectory(queryClient);
    openTile(desserts);
    expect(openDialog()).not.toBeNull();

    fetchBusinessesMock.mockResolvedValue([cafe]);
    await act(() => queryClient.refetchQueries());

    // TanStack Query notifies components on a later tick, so wait for the new data to render.
    await waitFor(() => expect(openDialog()).toBeNull());
    expect(document.documentElement).not.toHaveClass('overflow-hidden');
  });
});
