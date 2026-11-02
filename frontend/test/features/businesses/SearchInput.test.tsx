import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchInput } from '../../../src/features/businesses/SearchInput.tsx';

function renderSearch(value: string) {
  const onChange = vi.fn();
  render(<SearchInput value={value} onChange={onChange} />);
  return { onChange };
}

describe('SearchInput', () => {
  it('has the accessible name "Buscar negocios" and the placeholder', () => {
    renderSearch('');

    const input = screen.getByRole('searchbox', { name: 'Buscar negocios' });
    expect(input).toHaveAttribute('placeholder', 'Buscar negocios o categorías');
  });

  it('reports what the user types', () => {
    const { onChange } = renderSearch('');

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pan' } });

    expect(onChange).toHaveBeenCalledExactlyOnceWith('pan');
  });

  it('shows "Borrar búsqueda" only while the field has text', () => {
    const { unmount } = render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Borrar búsqueda' })).not.toBeInTheDocument();
    unmount();

    renderSearch('pan');
    expect(screen.getByRole('button', { name: 'Borrar búsqueda' })).toBeInTheDocument();
  });

  it('empties the field and returns focus to it when "Borrar búsqueda" is clicked', () => {
    const { onChange } = renderSearch('pan');

    fireEvent.click(screen.getByRole('button', { name: 'Borrar búsqueda' }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith('');
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });
});
