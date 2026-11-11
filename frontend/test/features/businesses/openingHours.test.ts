import { describe, expect, it } from 'vitest';
import type { OpeningHoursRange } from '../../../src/api/businesses.ts';
import { formatOpeningHours } from '../../../src/features/businesses/openingHours.ts';

/** The same opening and closing time on each given day (1 is Monday, 7 is Sunday). */
function on(days: number[], opens: string, closes: string): OpeningHoursRange[] {
  return days.map((dayOfWeek) => ({ dayOfWeek, opens, closes }));
}

// Directory spec, "Opening hours display". Expected texts are written literally.
describe('formatOpeningHours', () => {
  it('shows a typical week, grouping equal days and showing closed days (scenario "A typical week")', () => {
    const ranges = [...on([1, 2, 3, 4, 5], '08:00', '18:00'), ...on([6], '08:00', '12:00')];

    expect(formatOpeningHours(ranges)).toEqual([
      'Lunes a viernes · 8:00 a. m. – 6:00 p. m.',
      'Sábado · 8:00 a. m. – 12:00 p. m.',
      'Domingo · Cerrado',
    ]);
  });

  it('joins two days and several ranges with "y" (scenario "Two days and several ranges")', () => {
    const ranges = [
      { dayOfWeek: 6, opens: '08:00', closes: '12:00' },
      { dayOfWeek: 6, opens: '14:00', closes: '24:00' },
      { dayOfWeek: 7, opens: '08:00', closes: '12:00' },
      { dayOfWeek: 7, opens: '14:00', closes: '24:00' },
    ];

    expect(formatOpeningHours(ranges)).toEqual([
      'Lunes a viernes · Cerrado',
      'Sábado y domingo · 8:00 a. m. – 12:00 p. m. y 2:00 p. m. – 12:00 a. m.',
    ]);
  });

  it('writes times in 12-hour format (scenario "Times in 12-hour format")', () => {
    const ranges = [
      { dayOfWeek: 1, opens: '00:00', closes: '07:00' },
      { dayOfWeek: 1, opens: '12:00', closes: '18:30' },
    ];

    expect(formatOpeningHours(ranges)[0]).toBe('Lunes · 12:00 a. m. – 7:00 a. m. y 12:00 p. m. – 6:30 p. m.');
  });

  it('labels a group of one day with its name only', () => {
    expect(formatOpeningHours(on([3], '09:00', '17:00'))).toEqual([
      'Lunes y martes · Cerrado',
      'Miércoles · 9:00 a. m. – 5:00 p. m.',
      'Jueves a domingo · Cerrado',
    ]);
  });

  it('shows one line when the seven days are the same', () => {
    expect(formatOpeningHours(on([1, 2, 3, 4, 5, 6, 7], '07:00', '21:00'))).toEqual([
      'Lunes a domingo · 7:00 a. m. – 9:00 p. m.',
    ]);
  });

  it('does not join Sunday with Monday, since the week starts on Monday', () => {
    expect(formatOpeningHours(on([1, 7], '10:00', '14:00'))).toEqual([
      'Lunes · 10:00 a. m. – 2:00 p. m.',
      'Martes a sábado · Cerrado',
      'Domingo · 10:00 a. m. – 2:00 p. m.',
    ]);
  });

  it('returns no lines for a business without hours', () => {
    expect(formatOpeningHours([])).toEqual([]);
  });
});
