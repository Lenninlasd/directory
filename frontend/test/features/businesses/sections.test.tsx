import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Business } from '../../../src/api/businesses.ts';
import { BusinessResults } from '../../../src/features/businesses/BusinessResults.tsx';
import { FeaturedSection } from '../../../src/features/businesses/FeaturedSection.tsx';

function business(id: string, name: string): Business {
  return {
    id,
    name,
    category: 'Panadería',
    locationSummary: 'Local 1',
    hasPhysicalStore: true,
    whatsappNumber: null,
  };
}

const first = business('1', 'Panadería Doña Rosa');
const second = business('2', 'Pan de la Casa');
const third = business('3', 'El Trigal');

function tileNames(container: HTMLElement): string[] {
  return within(container)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent ?? '');
}

describe('FeaturedSection', () => {
  it('shows the title, the subtitle, and the tiles in the given order', () => {
    render(<FeaturedSection businesses={[first, second]} onOpen={vi.fn()} />);

    const section = screen.getByRole('region', { name: 'Visítalos en su tienda' });
    expect(within(section).getByRole('heading', { level: 2, name: 'Visítalos en su tienda' })).toBeInTheDocument();
    expect(within(section).getByText('Negocios con local físico')).toBeInTheDocument();
    expect(tileNames(section)).toEqual(['Panadería Doña Rosa', 'Pan de la Casa']);
  });

  it('renders nothing without businesses', () => {
    const { container } = render(<FeaturedSection businesses={[]} onOpen={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('BusinessResults', () => {
  it('titles the list "Todos los negocios" when no category is selected', () => {
    render(<BusinessResults businesses={[first]} categoryLabel={null} onOpen={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Todos los negocios' })).toBeInTheDocument();
  });

  it('titles the list with the selected category label', () => {
    render(<BusinessResults businesses={[first]} categoryLabel="Panadería" onOpen={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Panadería' })).toBeInTheDocument();
  });

  it('shows the count in a status element, in singular and plural', () => {
    const { unmount } = render(<BusinessResults businesses={[first]} categoryLabel={null} onOpen={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('1 negocio');
    unmount();

    render(<BusinessResults businesses={[first, second, third]} categoryLabel={null} onOpen={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('3 negocios');
  });

  it('shows the tiles in the given order', () => {
    render(<BusinessResults businesses={[third, first, second]} categoryLabel={null} onOpen={vi.fn()} />);

    const section = screen.getByRole('region', { name: 'Todos los negocios' });
    expect(tileNames(section)).toEqual(['El Trigal', 'Panadería Doña Rosa', 'Pan de la Casa']);
  });

  it('shows the no-results message instead of the list when nothing matches', () => {
    render(<BusinessResults businesses={[]} categoryLabel={null} onOpen={vi.fn()} />);

    expect(screen.getByText('No encontramos negocios')).toBeInTheDocument();
    expect(screen.getByText('Prueba con otra búsqueda o categoría.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
