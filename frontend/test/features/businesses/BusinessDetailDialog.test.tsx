import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBusinesses, type Business } from '../../../src/api/businesses.ts';
import { Directory } from '../../../src/features/businesses/Directory.tsx';
import { createQueryClient } from '../../../src/queryClient.ts';

// Spec 003 FR-8. jsdom uses the dialog stand-ins of test/setup.ts; Escape and the focus trap are
// manual checks (plan 003 section 8).
vi.mock('../../../src/api/businesses.ts', () => ({ fetchBusinesses: vi.fn() }));

const fetchBusinessesMock = vi.mocked(fetchBusinesses);
const greeting = encodeURIComponent('Hola, te encontré en el directorio de Alameda del Río');

const bakery: Business = {
  id: '0b9f6c1e-6d0a-4c43-9f43-3a6c1d2e8a10',
  name: 'Panadería La Esquina',
  category: 'Bakery',
  locationSummary: 'Centro Comercial Plaza, local 12',
  hasPhysicalStore: true,
  whatsappNumber: '573001234567',
};

const desserts: Business = {
  id: '7c1d0f35-2b8e-4e57-a1a4-5f0e3b9c6d22',
  name: 'Dulces de Ana',
  category: 'Desserts',
  locationSummary: 'Alameda del Río, home delivery',
  hasPhysicalStore: false,
  whatsappNumber: null,
};

async function renderDirectory(queryClient: QueryClient = createQueryClient()) {
  fetchBusinessesMock.mockResolvedValue([bakery, desserts]);
  render(
    <QueryClientProvider client={queryClient}>
      <Directory />
    </QueryClientProvider>,
  );
  await screen.findByRole('region', { name: 'Todos los negocios' });
}

// The "Ver detalles" button of a business in the full list (store businesses also appear in the featured row).
function detailsButton(name: string): HTMLElement {
  const results = screen.getByRole('region', { name: 'Todos los negocios' });
  return within(results).getByRole('button', { name: `Ver detalles de ${name}` });
}

function openDialog(): HTMLDialogElement | null {
  return document.querySelector('dialog[open]');
}

afterEach(() => {
  fetchBusinessesMock.mockReset();
});

describe('BusinessDetailDialog', () => {
  it('opens a dialog named after the business, with its category, badge, and full location', async () => {
    await renderDirectory();

    fireEvent.click(detailsButton('Panadería La Esquina'));

    const dialog = screen.getByRole('dialog', { name: 'Panadería La Esquina' });
    expect(openDialog()).toBe(dialog);
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Panadería La Esquina' })).toBeInTheDocument();
    expect(within(dialog).getByText('Bakery')).toBeInTheDocument();
    expect(within(dialog).getByText('En tienda')).toBeInTheDocument();
    expect(within(dialog).getByText('Ubicación')).toBeInTheDocument();
    expect(within(dialog).getByText('Centro Comercial Plaza, local 12')).toBeInTheDocument();
  });

  it('shows a WhatsApp button whose accessible name is its visible text', async () => {
    await renderDirectory();

    fireEvent.click(detailsButton('Panadería La Esquina'));

    const dialog = screen.getByRole('dialog', { name: 'Panadería La Esquina' });
    const link = within(dialog).getByRole('link', { name: 'Escribir por WhatsApp' });
    expect(link).toHaveTextContent('Escribir por WhatsApp');
    expect(link).toHaveAttribute('href', `https://wa.me/573001234567?text=${greeting}`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('explains when the business has no WhatsApp', async () => {
    await renderDirectory();

    fireEvent.click(detailsButton('Dulces de Ana'));

    const dialog = screen.getByRole('dialog', { name: 'Dulces de Ana' });
    expect(within(dialog).getByText('Este negocio no tiene WhatsApp registrado')).toBeInTheDocument();
    expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders no other business fields', async () => {
    await renderDirectory();

    fireEvent.click(detailsButton('Panadería La Esquina'));

    // AC-8.3: the dialog text is exactly these values; the id and the raw number never appear.
    expect(screen.getByRole('dialog').textContent).toBe(
      [
        'Bakery',
        'Panadería La Esquina',
        'En tienda',
        'Ubicación',
        'Centro Comercial Plaza, local 12',
        'Escribir por WhatsApp',
      ].join(''),
    );
  });

  it('closes with "Cerrar" and returns focus to the tile that opened it', async () => {
    await renderDirectory();
    const opener = detailsButton('Panadería La Esquina');

    fireEvent.click(opener);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar' }));

    expect(openDialog()).toBeNull();
    expect(opener).toHaveFocus();
  });

  it('closes on a click outside the content, but not on a click inside it', async () => {
    await renderDirectory();
    fireEvent.click(detailsButton('Panadería La Esquina'));
    const dialog = screen.getByRole('dialog');

    fireEvent.click(within(dialog).getByRole('heading', { level: 2 }));
    expect(openDialog()).toBe(dialog);

    fireEvent.click(dialog);
    expect(openDialog()).toBeNull();
  });

  it('stops the page from scrolling only while open, and keeps the URL', async () => {
    await renderDirectory();
    const url = window.location.href;

    fireEvent.click(detailsButton('Panadería La Esquina'));
    expect(document.documentElement).toHaveClass('overflow-hidden');
    expect(window.location.href).toBe(url);

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar' }));
    expect(document.documentElement).not.toHaveClass('overflow-hidden');
    expect(window.location.href).toBe(url);
  });

  it('closes when a reload removes the open business', async () => {
    const queryClient = createQueryClient();
    await renderDirectory(queryClient);
    fireEvent.click(detailsButton('Panadería La Esquina'));
    expect(openDialog()).not.toBeNull();

    fetchBusinessesMock.mockResolvedValue([desserts]);
    await act(() => queryClient.refetchQueries());

    // TanStack Query notifies subscribers on a later tick, so wait for the re-render.
    await waitFor(() => expect(openDialog()).toBeNull());
    expect(document.documentElement).not.toHaveClass('overflow-hidden');
  });
});
