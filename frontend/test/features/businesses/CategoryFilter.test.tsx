import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryFilter } from '../../../src/features/businesses/CategoryFilter.tsx';

const options = [
  { key: 'farmacia', label: 'Farmacia' },
  { key: 'floristeria', label: 'Floristería' },
  { key: 'optica', label: 'Óptica' },
];

function optionButtons() {
  return within(screen.getByRole('navigation', { name: 'Categorías' })).getAllByRole('button');
}

describe('CategoryFilter', () => {
  it('is a nav named "Categorías" with "Todos" first and pressed when nothing is selected', () => {
    render(<CategoryFilter options={options} selectedKey={null} onSelect={() => {}} />);

    const [first] = optionButtons();
    expect(first).toHaveTextContent('Todos');
    expect(first).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the options in the given order with their full labels', () => {
    render(<CategoryFilter options={options} selectedKey={null} onSelect={() => {}} />);

    expect(optionButtons().map((button) => button.textContent)).toEqual([
      'Todos',
      'Farmacia',
      'Floristería',
      'Óptica',
    ]);
  });

  it('presses exactly one option', () => {
    render(<CategoryFilter options={options} selectedKey="floristeria" onSelect={() => {}} />);

    const pressed = optionButtons().filter((button) => button.getAttribute('aria-pressed') === 'true');
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveTextContent('Floristería');
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('selects an option when it is clicked', () => {
    const onSelect = vi.fn();
    render(<CategoryFilter options={options} selectedKey={null} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Farmacia' }));

    expect(onSelect).toHaveBeenCalledWith('farmacia');
  });

  it('selects "Todos" when the selected option is clicked again (AC-3.5)', () => {
    const onSelect = vi.fn();
    render(<CategoryFilter options={options} selectedKey="farmacia" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Farmacia' }));

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('selects "Todos" when "Todos" is clicked', () => {
    const onSelect = vi.fn();
    render(<CategoryFilter options={options} selectedKey="farmacia" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));

    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
