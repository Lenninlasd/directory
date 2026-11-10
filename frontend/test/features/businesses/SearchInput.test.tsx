import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchInput } from '../../../src/features/businesses/SearchInput.tsx';

describe('SearchInput', () => {
  it('has the accessible name "Buscar negocios" and the placeholder', () => {
    render(<SearchInput value="" onChange={() => {}} />);

    const input = screen.getByRole('searchbox', { name: 'Buscar negocios' });
    expect(input).toHaveAttribute('placeholder', 'Buscar negocios o categorías');
  });

  it('reports typed text through onChange', () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'cafe' } });

    expect(onChange).toHaveBeenCalledWith('cafe');
  });

  it('shows "Borrar búsqueda" only while the field has text', () => {
    const { rerender } = render(<SearchInput value="" onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Borrar búsqueda' })).not.toBeInTheDocument();

    rerender(<SearchInput value="cafe" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Borrar búsqueda' })).toBeInTheDocument();
  });

  it('empties the field and focuses the input when "Borrar búsqueda" is clicked', () => {
    const onChange = vi.fn();
    render(<SearchInput value="cafe" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Borrar búsqueda' }));

    expect(onChange).toHaveBeenCalledWith('');
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });
});
