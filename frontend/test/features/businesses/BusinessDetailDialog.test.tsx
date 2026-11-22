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
  mapsUrl: null,
  description: null,
  instagramUrl: null,
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
  mapsUrl: null,
  description: null,
  instagramUrl: null,
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
  mapsUrl: null,
  description: null,
  instagramUrl: null,
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
  mapsUrl: null,
  description: null,
  instagramUrl: null,
};

// Directory spec, "Maps link": a business with a link to its Google Maps listing and no WhatsApp,
// so the Maps link is the only link in the dialog.
const pharmacy: Business = {
  ...desserts,
  id: 'pharmacy',
  name: 'Droguería La Alameda',
  locationSummary: 'Local 4, Centro Comercial Alameda',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Droguer%C3%ADa&query_place_id=EXAMPLE_PLACE_ID',
};

// Directory spec, "Instagram link": after "Página web" when there is one, otherwise after "Ubicación".
const instagramUrl = 'https://www.instagram.com/example.panaderia/';
const bakeryOnInstagram: Business = { ...bakery, id: 'bakery-instagram', name: 'Panadería con Instagram', instagramUrl };
const dessertsOnInstagram: Business = { ...desserts, id: 'desserts-instagram', name: 'Postres con Instagram', instagramUrl };

// Directory spec, "Business description": a paragraph below the rows, in full and as plain text.
const description =
  'Pan artesanal, tortas por encargo y café recién hecho. Pedidos con un día de anticipación para cumpleaños y reuniones del conjunto.';
const bakeryWithDescription: Business = { ...bakery, id: 'bakery-description', name: 'Panadería con descripción', description };
const bakeryWithMarkup: Business = { ...bakery, id: 'bakery-markup', name: 'Panadería con marcas', description: '<b>Pan</b> artesanal' };

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

describe('BusinessDetailDialog: Maps link', () => {
  it('shows "Ver en Google Maps" below the location summary, in the "Ubicación" row', async () => {
    await renderDirectory(createQueryClient(), [pharmacy]);

    openTile(pharmacy);

    expect(openDialog()?.textContent).toContain('UbicaciónLocal 4, Centro Comercial AlamedaVer en Google Maps');
  });

  it('links to the listing in a new tab, with the text as its name and a hidden icon', async () => {
    await renderDirectory(createQueryClient(), [pharmacy]);

    openTile(pharmacy);

    const link = within(screen.getByRole('dialog', { name: pharmacy.name })).getByRole('link');
    expect(link).toHaveAccessibleName('Ver en Google Maps');
    expect(link).toHaveTextContent('Ver en Google Maps');
    expect(link).toHaveAttribute('href', pharmacy.mapsUrl);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows no link and no text in its place without a Maps link', async () => {
    await renderDirectory();

    openTile(desserts);

    const dialog = screen.getByRole('dialog', { name: desserts.name });
    expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Ver en Google Maps')).not.toBeInTheDocument();
  });
});

describe('BusinessDetailDialog: Instagram row', () => {
  it('shows "Instagram" after "Página web", with "@" and the handle as the link text', async () => {
    await renderDirectory(createQueryClient(), [bakeryOnInstagram]);

    openTile(bakeryOnInstagram);

    expect(openDialog()?.textContent).toBe(
      [
        'Panadería',
        'Panadería con Instagram',
        'En tienda',
        'Ubicación',
        'Local 12',
        'Horario',
        'Lunes a viernes · 8:00 a. m. – 6:00 p. m.',
        'Sábado y domingo · Cerrado',
        'Página web',
        'example.com/panaderia',
        'Instagram',
        '@example.panaderia',
        'Este negocio no tiene WhatsApp registrado',
      ].join(''),
    );
  });

  it('shows the row right after "Ubicación" without hours and without a website', async () => {
    await renderDirectory(createQueryClient(), [dessertsOnInstagram]);

    openTile(dessertsOnInstagram);

    expect(openDialog()?.textContent).toContain('UbicaciónTorre 3Instagram@example.panaderia');
  });

  it('links to the profile in a new tab, with the handle as its name and a hidden icon', async () => {
    await renderDirectory(createQueryClient(), [dessertsOnInstagram]);

    openTile(dessertsOnInstagram);

    const link = within(screen.getByRole('dialog', { name: dessertsOnInstagram.name })).getByRole('link');
    expect(link).toHaveAccessibleName('@example.panaderia');
    expect(link).toHaveAttribute('href', instagramUrl);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows no row and no text in its place without an Instagram link', async () => {
    await renderDirectory(createQueryClient(), [bakery]);

    openTile(bakery);

    const dialog = screen.getByRole('dialog', { name: bakery.name });
    expect(within(dialog).queryByText('Instagram')).not.toBeInTheDocument();
    expect(openDialog()?.textContent).toContain('example.com/panaderiaEste negocio no tiene WhatsApp registrado');
  });
});

describe('BusinessDetailDialog: description', () => {
  it('shows the description in full in a paragraph right after the rows', async () => {
    await renderDirectory(createQueryClient(), [bakeryWithDescription]);

    openTile(bakeryWithDescription);

    const paragraph = openDialog()?.querySelector('dl')?.nextElementSibling;
    expect(paragraph?.tagName).toBe('P');
    expect(paragraph).toHaveTextContent(description);
    expect(paragraph?.className).not.toMatch(/truncate|line-clamp|text-ellipsis/);
    expect(openDialog()?.textContent).toContain(`example.com/panaderia${description}Este negocio no tiene WhatsApp registrado`);
  });

  it('shows no paragraph and no text in its place without a description', async () => {
    await renderDirectory(createQueryClient(), [bakery]);

    openTile(bakery);

    expect(openDialog()?.querySelector('dl')?.nextElementSibling).toBeNull();
  });

  it('shows markup as text, never as elements', async () => {
    await renderDirectory(createQueryClient(), [bakeryWithMarkup]);

    openTile(bakeryWithMarkup);

    const dialog = screen.getByRole('dialog', { name: bakeryWithMarkup.name });
    expect(within(dialog).getByText('<b>Pan</b> artesanal')).toBeInTheDocument();
    expect(dialog.querySelector('b')).toBeNull();
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

// Directory spec, "Business detail dialog" and "No hours in admin mode"; business-editing spec, "Admin mode".
describe('BusinessDetailDialog: admin mode', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('shows no editing control or admin text without ?admin', async () => {
    await renderDirectory(createQueryClient(), [bakery, tutoring]);

    openTile(bakery);

    const dialog = screen.getByRole('dialog', { name: bakery.name });
    expect(within(dialog).queryByRole('button', { name: 'Editar con IA' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('Sin horario registrado')).not.toBeInTheDocument();
  });

  it('shows "Editar con IA" in the "Horario" row with ?admin', async () => {
    window.history.replaceState(null, '', '/?admin');
    await renderDirectory(createQueryClient(), [bakery]);

    openTile(bakery);

    const dialog = screen.getByRole('dialog', { name: bakery.name });
    expect(within(dialog).getByText('Lunes a viernes · 8:00 a. m. – 6:00 p. m.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Editar con IA' })).toBeInTheDocument();
  });

  it('puts "Editar con IA" right after the "Horario" label, before the hours, so Tab follows what is seen', async () => {
    window.history.replaceState(null, '', '/?admin');
    await renderDirectory(createQueryClient(), [bakery]);

    openTile(bakery);

    const dialog = screen.getByRole('dialog', { name: bakery.name });
    const label = within(dialog).getByText('Horario');
    const editButton = within(dialog).getByRole('button', { name: 'Editar con IA' });
    const firstLine = within(dialog).getByText('Lunes a viernes · 8:00 a. m. – 6:00 p. m.');
    expect(label.compareDocumentPosition(editButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(editButton.compareDocumentPosition(firstLine) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the "Horario" row with "Sin horario registrado" for a business without hours', async () => {
    window.history.replaceState(null, '', '/?admin=1');
    await renderDirectory(createQueryClient(), [tutoring]);

    openTile(tutoring);

    const dialog = screen.getByRole('dialog', { name: tutoring.name });
    expect(within(dialog).getByText('Horario')).toBeInTheDocument();
    expect(within(dialog).getByText('Sin horario registrado')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Editar con IA' })).toBeInTheDocument();
  });

  it('keeps the list and search working as usual', async () => {
    window.history.replaceState(null, '', '/?admin');
    await renderDirectory(createQueryClient(), [bakery, tutoring]);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar negocios' }), { target: { value: 'tutorías' } });

    const results = screen.getByRole('region', { name: 'Todos los negocios' });
    expect(within(results).getByText('1 negocio')).toBeInTheDocument();
  });
});
