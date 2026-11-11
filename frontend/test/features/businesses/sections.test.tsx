import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Business } from '../../../src/api/businesses.ts';
import { BusinessResults } from '../../../src/features/businesses/BusinessResults.tsx';
import { FeaturedSection } from '../../../src/features/businesses/FeaturedSection.tsx';

function business(id: string, name: string): Business {
  return {
    id,
    name,
    category: 'Comida',
    locationSummary: 'Alameda del Río',
    hasPhysicalStore: true,
    whatsappNumber: null,
    websiteUrl: null,
    openingHours: [],
  };
}

const businesses = [business('1', 'Arepas La Mona'), business('2', 'Café del Río'), business('3', 'Dulces de Ana')];

const tileNames = (container: HTMLElement) =>
  within(container)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent);

describe('FeaturedSection', () => {
  it('shows the title, the subtitle, and the tiles in the given order', () => {
    render(<FeaturedSection businesses={businesses} onOpen={() => {}} />);

    const section = screen.getByRole('region', { name: 'Visítalos en su tienda' });
    expect(within(section).getByRole('heading', { level: 2 })).toHaveTextContent('Visítalos en su tienda');
    expect(within(section).getByText('Negocios con local físico')).toBeInTheDocument();
    expect(tileNames(section)).toEqual(['Arepas La Mona', 'Café del Río', 'Dulces de Ana']);
  });

  it('renders nothing for an empty list', () => {
    const { container } = render(<FeaturedSection businesses={[]} onOpen={() => {}} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('BusinessResults', () => {
  it('titles the section "Todos los negocios" with no category', () => {
    render(<BusinessResults businesses={businesses} categoryLabel={null} onOpen={() => {}} />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Todos los negocios');
  });

  it('titles the section with the category label when one is selected', () => {
    render(<BusinessResults businesses={businesses} categoryLabel="Panadería" onOpen={() => {}} />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Panadería');
  });

  it('shows the count inside a status element', () => {
    const { rerender } = render(
      <BusinessResults businesses={businesses.slice(0, 1)} categoryLabel={null} onOpen={() => {}} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('1 negocio');

    rerender(<BusinessResults businesses={businesses} categoryLabel={null} onOpen={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('3 negocios');
  });

  it('shows the tiles in the given order', () => {
    render(<BusinessResults businesses={businesses} categoryLabel={null} onOpen={() => {}} />);

    expect(tileNames(screen.getByRole('region', { name: 'Todos los negocios' }))).toEqual([
      'Arepas La Mona',
      'Café del Río',
      'Dulces de Ana',
    ]);
  });

  it('shows the no-results message in place of the list for an empty list (AC-7.5)', () => {
    render(<BusinessResults businesses={[]} categoryLabel="Panadería" onOpen={() => {}} />);

    expect(screen.getByText('No encontramos negocios')).toBeInTheDocument();
    expect(screen.getByText('Prueba con otra búsqueda o categoría.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });
});
