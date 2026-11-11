/** A weekly opening range as returned by `GET /businesses` (directory spec, "Opening hours validity"). */
export interface OpeningHoursRange {
  /** ISO 8601 day: 1 is Monday, 7 is Sunday (design D-1). */
  dayOfWeek: number;
  /** `HH:MM`, 24-hour. */
  opens: string;
  /** `HH:MM`, 24-hour, later than `opens`; `24:00` is midnight. */
  closes: string;
}

// 00:00 to 23:59, or 24:00. Zero-padded, so times compare correctly as strings.
const TIME = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/;

function toRange(value: unknown): OpeningHoursRange | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const { dayOfWeek, opens, closes } = value as Record<string, unknown>;
  const validDay = typeof dayOfWeek === 'number' && Number.isInteger(dayOfWeek) && dayOfWeek >= 1 && dayOfWeek <= 7;
  const validTimes = typeof opens === 'string' && typeof closes === 'string' && TIME.test(opens) && TIME.test(closes);
  return validDay && validTimes && closes > opens ? { dayOfWeek, opens, closes } : null;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Validates opening hours as stored by the team: the JSON column read as text (design D-3, D-4).
 * Returns the ranges sorted by day and opening time, or `[]` when they are missing or any range
 * is invalid, so the directory never shows partly wrong hours.
 */
export function normalizeOpeningHours(raw: string | null): OpeningHoursRange[] {
  const parsed = raw === null ? null : parseJson(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }
  const ranges = parsed.map(toRange);
  if (ranges.some((range) => range === null)) {
    return [];
  }
  return (ranges as OpeningHoursRange[]).sort(
    (left, right) => left.dayOfWeek - right.dayOfWeek || (left.opens < right.opens ? -1 : left.opens > right.opens ? 1 : 0),
  );
}
