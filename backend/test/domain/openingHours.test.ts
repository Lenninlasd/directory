import { describe, expect, it } from 'vitest';
import { normalizeOpeningHours } from '../../src/domain/openingHours.ts';

/** Stored hours as the repository reads them: the JSON column cast to text (design D-3). */
function stored(ranges: unknown): string {
  return JSON.stringify(ranges);
}

const monday = { dayOfWeek: 1, opens: '08:00', closes: '12:00' };

// Directory spec, "Opening hours validity": valid ranges sorted by day and opening time, otherwise `[]`.
describe('normalizeOpeningHours', () => {
  it('sorts valid ranges by day and then by opening time', () => {
    const raw = stored([
      { dayOfWeek: 2, opens: '09:00', closes: '17:00' },
      { dayOfWeek: 1, opens: '14:00', closes: '18:00' },
      { dayOfWeek: 1, opens: '08:00', closes: '12:00' },
    ]);

    expect(normalizeOpeningHours(raw)).toEqual([
      { dayOfWeek: 1, opens: '08:00', closes: '12:00' },
      { dayOfWeek: 1, opens: '14:00', closes: '18:00' },
      { dayOfWeek: 2, opens: '09:00', closes: '17:00' },
    ]);
  });

  it('accepts 24:00 as a closing time for midnight', () => {
    const range = { dayOfWeek: 6, opens: '16:00', closes: '24:00' };
    expect(normalizeOpeningHours(stored([range]))).toEqual([range]);
  });

  it('accepts Sunday as day 7 and the first minute of the day', () => {
    const range = { dayOfWeek: 7, opens: '00:00', closes: '00:30' };
    expect(normalizeOpeningHours(stored([range]))).toEqual([range]);
  });

  it('returns only the three fields of a range', () => {
    expect(normalizeOpeningHours(stored([{ ...monday, note: 'extra' }]))).toEqual([monday]);
  });

  it('returns [] for missing or empty hours', () => {
    expect(normalizeOpeningHours(null)).toEqual([]);
    expect(normalizeOpeningHours('[]')).toEqual([]);
  });

  it('returns [] when the stored hours are not JSON', () => {
    expect(normalizeOpeningHours('Lunes a viernes')).toEqual([]);
  });

  it('returns [] when the stored hours are not a list of ranges', () => {
    expect(normalizeOpeningHours('null')).toEqual([]);
    expect(normalizeOpeningHours(stored(monday))).toEqual([]);
    expect(normalizeOpeningHours(stored(['08:00']))).toEqual([]);
    expect(normalizeOpeningHours(stored([null]))).toEqual([]);
  });

  it.each([
    ['day 0', { ...monday, dayOfWeek: 0 }],
    ['day 8', { ...monday, dayOfWeek: 8 }],
    ['a fractional day', { ...monday, dayOfWeek: 1.5 }],
    ['a day as text', { ...monday, dayOfWeek: '1' }],
    ['a missing day', { opens: '08:00', closes: '12:00' }],
    ['a time without a leading zero', { ...monday, opens: '7:00' }],
    ['hour 25', { ...monday, closes: '25:00' }],
    ['24:30', { ...monday, closes: '24:30' }],
    ['minute 60', { ...monday, closes: '11:60' }],
    ['24:00 as an opening time', { ...monday, opens: '24:00', closes: '24:00' }],
    ['a time as a number', { ...monday, closes: 1200 }],
    ['a closing time equal to the opening time', { ...monday, closes: '08:00' }],
    ['a closing time before the opening time', { ...monday, opens: '18:00', closes: '09:00' }],
  ])('returns [] for the whole week when one range has %s', (_case, invalid) => {
    expect(normalizeOpeningHours(stored([monday, invalid]))).toEqual([]);
  });
});
