import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Business } from '../../../src/api/businesses.ts';
import { BusinessCard } from '../../../src/features/businesses/BusinessCard.tsx';

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

describe('BusinessCard', () => {
  it('shows the name, category, and location summary', () => {
    render(<BusinessCard business={bakery} />);

    expect(screen.getByRole('heading', { name: 'Panadería La Esquina' })).toBeInTheDocument();
    expect(screen.getByText('Bakery')).toBeInTheDocument();
    expect(screen.getByText('Centro Comercial Plaza, local 12')).toBeInTheDocument();
  });

  it('shows "En tienda" for a business with a physical store', () => {
    render(<BusinessCard business={bakery} />);

    expect(screen.getByText('En tienda')).toBeInTheDocument();
    expect(screen.queryByText('Solo domicilios')).not.toBeInTheDocument();
  });

  it('shows "Solo domicilios" for a delivery-only business', () => {
    render(<BusinessCard business={desserts} />);

    expect(screen.getByText('Solo domicilios')).toBeInTheDocument();
    expect(screen.queryByText('En tienda')).not.toBeInTheDocument();
  });

  it('shows a WhatsApp link with the right URL and accessible name when the number exists', () => {
    render(<BusinessCard business={bakery} />);

    const link = screen.getByRole('link', { name: 'Contactar a Panadería La Esquina por WhatsApp' });
    expect(link).toHaveAttribute('href', `https://wa.me/573001234567?text=${greeting}`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('WhatsApp');
  });

  it('shows no WhatsApp link when the number is null, and still renders the rest of the card', () => {
    render(<BusinessCard business={desserts} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dulces de Ana' })).toBeInTheDocument();
    expect(screen.getByText('Desserts')).toBeInTheDocument();
    expect(screen.getByText('Alameda del Río, home delivery')).toBeInTheDocument();
    expect(screen.getByText('Solo domicilios')).toBeInTheDocument();
  });

  it('renders no other business fields', () => {
    const { container } = render(<BusinessCard business={bakery} />);

    // AC-2.4: the card text is exactly these values; the id and the raw number never appear.
    expect(container.textContent).toBe(
      ['Panadería La Esquina', 'Bakery', 'Centro Comercial Plaza, local 12', 'En tienda', 'WhatsApp'].join(''),
    );
  });
});
