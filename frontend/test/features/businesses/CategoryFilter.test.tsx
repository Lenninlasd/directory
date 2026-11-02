import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryFilter } from '../../../src/features/businesses/CategoryFilter.tsx';
import type { CategoryOption } from '../../../src/features/businesses/directory.ts';

const options: CategoryOption[] = [
  { key: 'alimentos', label: 'Alimentos' },
  { key: 'floristeria y decoraciones navidenas', label: 'Floristería y Decoraciones Navideñas' },
  { key: 'panaderia', label: 'Panadería' },
];

function renderFilter(selectedKey: string | null) {
  const onSelect = vi.fn();
  render(<CategoryFilter options={options} selectedKey={selectedKey} onSelect={onSelect} />);
  return { onSelect };
}

function pressedLabels(): string[] {
  return screen
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.textContent ?? '');
}

describe('CategoryFilter', () => {
  it('lists "Todos" first and then the options in the given order, with full labels', () => {
    renderFilter(null);

    const navigation = screen.getByRole('navigation', { name: 'Categorías' });
    const labels = within(navigation)
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(labels).toEqual(['Todos', 'Alimentos', 'Floristería y Decoraciones Navideñas', 'Panadería']);
  });

  it('presses "Todos" when no category is selected', () => {
    renderFilter(null);

    expect(pressedLabels()).toEqual(['Todos']);
  });

  it('presses only the selected category', () => {
    renderFilter('panaderia');

    expect(pressedLabels()).toEqual(['Panadería']);
  });

  it('selects a category when its option is clicked', () => {
    const { onSelect } = renderFilter(null);

    fireEvent.click(screen.getByRole('button', { name: 'Alimentos' }));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('alimentos');
  });

  it('selects "Todos" when the selected option is clicked again', () => {
    const { onSelect } = renderFilter('panaderia');

    fireEvent.click(screen.getByRole('button', { name: 'Panadería' }));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('selects "Todos" when "Todos" is clicked', () => {
    const { onSelect } = renderFilter('alimentos');

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith(null);
  });
});
