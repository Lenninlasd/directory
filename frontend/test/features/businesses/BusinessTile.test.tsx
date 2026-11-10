import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Business } from '../../../src/api/businesses.ts';
import { BusinessTile } from '../../../src/features/businesses/BusinessTile.tsx';

// Replaces BusinessCard.test.tsx (spec 003 completion criterion 2) and keeps its rules.
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

describe('BusinessTile', () => {
  it('shows the name as an h3, the category, and the location summary', () => {
    render(<BusinessTile business={bakery} onOpen={() => {}} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Panadería La Esquina' })).toBeInTheDocument();
    expect(screen.getByText('Bakery')).toBeInTheDocument();
    expect(screen.getByText('Centro Comercial Plaza, local 12')).toBeInTheDocument();
  });

  it('shows "En tienda" for a business with a physical store', () => {
    render(<BusinessTile business={bakery} onOpen={() => {}} />);

    expect(screen.getByText('En tienda')).toBeInTheDocument();
    expect(screen.queryByText('Solo domicilios')).not.toBeInTheDocument();
  });

  it('shows "Solo domicilios" for a delivery-only business', () => {
    render(<BusinessTile business={desserts} onOpen={() => {}} />);

    expect(screen.getByText('Solo domicilios')).toBeInTheDocument();
    expect(screen.queryByText('En tienda')).not.toBeInTheDocument();
  });

  it('shows a WhatsApp link with the right URL and accessible name when the number exists', () => {
    render(<BusinessTile business={bakery} onOpen={() => {}} />);

    const link = screen.getByRole('link', { name: 'Contactar a Panadería La Esquina por WhatsApp' });
    expect(link).toHaveAttribute('href', `https://wa.me/573001234567?text=${greeting}`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows no WhatsApp link or text when the number is null, and still renders the rest of the tile', () => {
    render(<BusinessTile business={desserts} onOpen={() => {}} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText(/whatsapp/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dulces de Ana' })).toBeInTheDocument();
    expect(screen.getByText('Desserts')).toBeInTheDocument();
    expect(screen.getByText('Alameda del Río, home delivery')).toBeInTheDocument();
    expect(screen.getByText('Solo domicilios')).toBeInTheDocument();
  });

  it('renders no other business fields', () => {
    const { container } = render(<BusinessTile business={bakery} onOpen={() => {}} />);

    // AC-5.8: the tile text is exactly these values; the id and the raw number never appear.
    expect(container.textContent).toBe(
      ['En tienda', 'Panadería La Esquina', 'Bakery', ' · ', 'Centro Comercial Plaza, local 12'].join(''),
    );
  });

  it('calls onOpen with the "Ver detalles" button when it is activated', () => {
    const onOpen = vi.fn();
    render(<BusinessTile business={bakery} onOpen={onOpen} />);

    const button = screen.getByRole('button', { name: 'Ver detalles de Panadería La Esquina' });
    fireEvent.click(button);

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(button);
  });

  it('does not call onOpen when the WhatsApp link is clicked', () => {
    const onOpen = vi.fn();
    render(<BusinessTile business={bakery} onOpen={onOpen} />);

    const link = screen.getByRole('link');
    // jsdom cannot navigate, so the test stops the link's default action.
    link.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(link);

    expect(onOpen).not.toHaveBeenCalled();
  });
});
