import { describe, expect, it } from 'vitest';
import type { OpeningHoursRange } from '../../../src/api/businesses.ts';
import { changedDays, formatDayList, formatOpeningHours } from '../../../src/features/businesses/openingHours.ts';

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

// Business-editing spec, "A proposal" and "Editing interface text" (design D-2, D-14).
describe('changedDays', () => {
  const week = [...on([1, 2, 3, 4, 5, 6], '08:00', '18:00')];

  it('returns the one day whose hours changed', () => {
    const proposed = [...on([1, 2, 3, 4, 5], '08:00', '18:00'), ...on([6], '08:00', '14:00')];

    expect(changedDays(week, proposed)).toEqual([6]);
  });

  it('returns several changed days in week order', () => {
    const proposed = [...on([1], '07:00', '19:00'), ...on([2, 4, 5, 6], '08:00', '18:00'), ...on([3], '09:00', '18:00')];

    expect(changedDays(week, proposed)).toEqual([1, 3]);
  });

  it('returns no days for the same week, whatever the order of the ranges', () => {
    expect(changedDays(week, [...week].reverse())).toEqual([]);
  });

  it('returns a day that gains a range or loses one', () => {
    const proposed = [
      ...on([2, 3, 4, 5, 6], '08:00', '18:00'),
      { dayOfWeek: 1, opens: '08:00', closes: '12:00' },
      { dayOfWeek: 1, opens: '14:00', closes: '18:00' },
      ...on([7], '09:00', '13:00'),
    ];

    expect(changedDays(week, proposed)).toEqual([1, 7]);
  });

  it('returns every open day when all hours are removed', () => {
    expect(changedDays(week, [])).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('formatDayList', () => {
  it('names one day in lowercase', () => {
    expect(formatDayList([6])).toBe('sábado');
  });

  it('joins two days with " y "', () => {
    expect(formatDayList([6, 7])).toBe('sábado y domingo');
  });

  it('joins several days with ", " and the last two with " y "', () => {
    expect(formatDayList([1, 3, 6])).toBe('lunes, miércoles y sábado');
  });
});
