import { describe, expect, it } from 'vitest';
import { normalizeOpeningHours, validateOpeningHoursForWriting } from '../../src/domain/openingHours.ts';

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

// Business-editing spec, "Opening hours for writing": the read rules plus no overlap within a day.
// An invalid week is rejected as a whole, with one problem per cause (design D-6).
describe('validateOpeningHoursForWriting', () => {
  it('accepts a day with two separate ranges', () => {
    const week = [
      { dayOfWeek: 1, opens: '08:00', closes: '12:00' },
      { dayOfWeek: 1, opens: '14:00', closes: '18:00' },
    ];
    expect(validateOpeningHoursForWriting(week)).toEqual({ valid: true, ranges: week });
  });

  it('returns a valid week sorted by day and then by opening time', () => {
    const result = validateOpeningHoursForWriting([
      { dayOfWeek: 2, opens: '09:00', closes: '17:00' },
      { dayOfWeek: 1, opens: '14:00', closes: '18:00' },
      { dayOfWeek: 1, opens: '08:00', closes: '12:00' },
    ]);

    expect(result).toEqual({
      valid: true,
      ranges: [
        { dayOfWeek: 1, opens: '08:00', closes: '12:00' },
        { dayOfWeek: 1, opens: '14:00', closes: '18:00' },
        { dayOfWeek: 2, opens: '09:00', closes: '17:00' },
      ],
    });
  });

  it('accepts ranges that only touch', () => {
    const week = [
      { dayOfWeek: 1, opens: '08:00', closes: '12:00' },
      { dayOfWeek: 1, opens: '12:00', closes: '18:00' },
    ];
    expect(validateOpeningHoursForWriting(week)).toEqual({ valid: true, ranges: week });
  });

  it('accepts the same hours on different days', () => {
    const week = [monday, { ...monday, dayOfWeek: 2 }];
    expect(validateOpeningHoursForWriting(week)).toEqual({ valid: true, ranges: week });
  });

  it('accepts an empty week, which removes the hours', () => {
    expect(validateOpeningHoursForWriting([])).toEqual({ valid: true, ranges: [] });
  });

  it('accepts 24:00 as a closing time', () => {
    const week = [{ dayOfWeek: 6, opens: '16:00', closes: '24:00' }];
    expect(validateOpeningHoursForWriting(week)).toEqual({ valid: true, ranges: week });
  });

  it('returns only the three fields of a range', () => {
    expect(validateOpeningHoursForWriting([{ ...monday, note: 'extra' }])).toEqual({ valid: true, ranges: [monday] });
  });

  it('rejects overlapping ranges on the same day, naming the day and both ranges', () => {
    const result = validateOpeningHoursForWriting([
      { dayOfWeek: 1, opens: '12:00', closes: '18:00' },
      { dayOfWeek: 1, opens: '08:00', closes: '14:00' },
    ]);

    expect(result).toEqual({
      valid: false,
      problems: ['Ranges 08:00-14:00 and 12:00-18:00 of day 1 overlap'],
    });
  });

  it('rejects a range inside another one, and two equal ranges', () => {
    const inside = validateOpeningHoursForWriting([
      { dayOfWeek: 3, opens: '08:00', closes: '18:00' },
      { dayOfWeek: 3, opens: '10:00', closes: '11:00' },
    ]);
    const equal = validateOpeningHoursForWriting([monday, monday]);

    expect(inside).toEqual({ valid: false, problems: ['Ranges 08:00-18:00 and 10:00-11:00 of day 3 overlap'] });
    expect(equal).toEqual({ valid: false, problems: ['Ranges 08:00-12:00 and 08:00-12:00 of day 1 overlap'] });
  });

  it('rejects a range that overlaps an earlier long range, even when a short one sits between them', () => {
    const result = validateOpeningHoursForWriting([
      { dayOfWeek: 1, opens: '08:00', closes: '18:00' },
      { dayOfWeek: 1, opens: '09:00', closes: '10:00' },
      { dayOfWeek: 1, opens: '11:00', closes: '12:00' },
    ]);

    expect(result).toEqual({
      valid: false,
      problems: [
        'Ranges 08:00-18:00 and 09:00-10:00 of day 1 overlap',
        'Ranges 08:00-18:00 and 11:00-12:00 of day 1 overlap',
      ],
    });
  });

  it('does not compare the last range of a day with the first range of the next day', () => {
    const week = [
      { dayOfWeek: 1, opens: '08:00', closes: '24:00' },
      { dayOfWeek: 2, opens: '06:00', closes: '12:00' },
    ];
    expect(validateOpeningHoursForWriting(week)).toEqual({ valid: true, ranges: week });
  });

  it.each([
    ['null', null],
    ['an object', { openingHours: [] }],
    ['text', '[]'],
    ['a number', 7],
    ['undefined', undefined],
  ])('rejects %s, which is not a list', (_case, value) => {
    expect(validateOpeningHoursForWriting(value)).toEqual({
      valid: false,
      problems: ['Opening hours must be a list of ranges'],
    });
  });

  it.each([
    ['day 0', { ...monday, dayOfWeek: 0 }],
    ['day 8', { ...monday, dayOfWeek: 8 }],
    ['a day as text', { ...monday, dayOfWeek: '1' }],
    ['a time without a leading zero', { ...monday, opens: '7:00' }],
    ['24:30', { ...monday, closes: '24:30' }],
    ['a closing time equal to the opening time', { ...monday, closes: '08:00' }],
    ['a closing time before the opening time', { ...monday, opens: '18:00', closes: '09:00' }],
    ['an item that is not an object', '08:00'],
    ['a null item', null],
  ])('rejects the whole week when one range has %s, naming its position', (_case, invalid) => {
    expect(validateOpeningHoursForWriting([monday, invalid])).toEqual({
      valid: false,
      problems: ['Range 2 is not valid: it needs a day from 1 to 7 and HH:MM times with closes later than opens'],
    });
  });

  it('reports one problem per invalid range', () => {
    const result = validateOpeningHoursForWriting([{ ...monday, dayOfWeek: 0 }, monday, { ...monday, closes: '07:00' }]);

    expect(result).toEqual({
      valid: false,
      problems: [
        'Range 1 is not valid: it needs a day from 1 to 7 and HH:MM times with closes later than opens',
        'Range 3 is not valid: it needs a day from 1 to 7 and HH:MM times with closes later than opens',
      ],
    });
  });

  it('does not change the list it receives', () => {
    const week = [{ ...monday, dayOfWeek: 2 }, monday];
    validateOpeningHoursForWriting(week);
    expect(week).toEqual([{ ...monday, dayOfWeek: 2 }, monday]);
  });
});
