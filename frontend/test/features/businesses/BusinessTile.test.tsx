import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Business } from '../../../src/api/businesses.ts';
import { BusinessTile } from '../../../src/features/businesses/BusinessTile.tsx';

// Replaces BusinessCard.test.tsx (spec 003 completion criterion 2): the same rules, on the tile.
const greeting = encodeURIComponent('Hola, te encontré en el directorio de Alameda del Río');

const bakery: Business = {
  id: '0b9f6c1e-6d0a-4c43-9f43-3a6c1d2e8a10',
  name: 'Panadería La Esquina',
  category: 'Panadería',
  locationSummary: 'Centro Comercial Plaza, local 12',
  hasPhysicalStore: true,
  whatsappNumber: '573001234567',
};

const desserts: Business = {
  id: '7c1d0f35-2b8e-4e57-a1a4-5f0e3b9c6d22',
  name: 'Dulces de Ana',
  category: 'Postres',
  locationSummary: 'Alameda del Río, home delivery',
  hasPhysicalStore: false,
  whatsappNumber: null,
};

function renderTile(business: Business, onOpen = vi.fn()) {
  return { onOpen, ...render(<BusinessTile business={business} onOpen={onOpen} />) };
}

describe('BusinessTile', () => {
  it('shows the name as a heading, the category, and the location summary', () => {
    renderTile(bakery);

    expect(screen.getByRole('heading', { level: 3, name: 'Panadería La Esquina' })).toBeInTheDocument();
    expect(screen.getByText('Panadería')).toBeInTheDocument();
    expect(screen.getByText('Centro Comercial Plaza, local 12')).toBeInTheDocument();
  });

  it('shows "En tienda" for a business with a physical store', () => {
    renderTile(bakery);

    expect(screen.getByText('En tienda')).toBeInTheDocument();
    expect(screen.queryByText('Solo domicilios')).not.toBeInTheDocument();
  });

  it('shows "Solo domicilios" for a delivery-only business', () => {
    renderTile(desserts);

    expect(screen.getByText('Solo domicilios')).toBeInTheDocument();
    expect(screen.queryByText('En tienda')).not.toBeInTheDocument();
  });

  it('shows a WhatsApp link with the right URL and accessible name when the number exists', () => {
    renderTile(bakery);

    const link = screen.getByRole('link', { name: 'Contactar a Panadería La Esquina por WhatsApp' });
    expect(link).toHaveAttribute('href', `https://wa.me/573001234567?text=${greeting}`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows no WhatsApp link or text when the number is null, and still renders the rest of the tile', () => {
    const { container } = renderTile(desserts);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('WhatsApp');
    expect(screen.getByRole('heading', { name: 'Dulces de Ana' })).toBeInTheDocument();
    expect(screen.getByText('Postres')).toBeInTheDocument();
    expect(screen.getByText('Alameda del Río, home delivery')).toBeInTheDocument();
    expect(screen.getByText('Solo domicilios')).toBeInTheDocument();
  });

  it('renders no other business fields', () => {
    const { container } = renderTile(bakery);

    // AC-5.8: the tile text is exactly these values; the id and the raw number never appear.
    expect(container.textContent).toBe(
      ['En tienda', 'Panadería La Esquina', 'Panadería', ' · ', 'Centro Comercial Plaza, local 12'].join(''),
    );
  });

  it('opens the details with the "Ver detalles" button, passing that button', () => {
    const { onOpen } = renderTile(bakery);

    const button = screen.getByRole('button', { name: 'Ver detalles de Panadería La Esquina' });
    fireEvent.click(button);

    expect(onOpen).toHaveBeenCalledExactlyOnceWith(button);
  });

  it('does not open the details when the WhatsApp link is clicked', () => {
    const { onOpen } = renderTile(bakery);

    const link = screen.getByRole('link', { name: 'Contactar a Panadería La Esquina por WhatsApp' });
    link.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(link);

    expect(onOpen).not.toHaveBeenCalled();
  });
});
