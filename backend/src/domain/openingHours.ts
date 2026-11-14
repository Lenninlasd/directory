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

/** By day, then by opening time. Times are zero-padded, so they compare correctly as strings. */
function compareRanges(left: OpeningHoursRange, right: OpeningHoursRange): number {
  return left.dayOfWeek - right.dayOfWeek || (left.opens < right.opens ? -1 : left.opens > right.opens ? 1 : 0);
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
  return (ranges as OpeningHoursRange[]).sort(compareRanges);
}

/** The result of checking a week before it is stored: the sorted ranges, or why it was rejected. */
export type OpeningHoursValidation =
  | { valid: true; ranges: OpeningHoursRange[] }
  | { valid: false; problems: string[] };

/**
 * Validates a week that is about to be stored (business-editing spec, "Opening hours for writing").
 * It applies the read rules and also rejects ranges of the same day that overlap. Unlike
 * `normalizeOpeningHours`, it says why a week is invalid, and `[]` is a valid week (no hours).
 * The problems are in English, for logs and tests (design D-6).
 */
export function validateOpeningHoursForWriting(value: unknown): OpeningHoursValidation {
  if (!Array.isArray(value)) {
    return { valid: false, problems: ['Opening hours must be a list of ranges'] };
  }

  const ranges: OpeningHoursRange[] = [];
  const problems: string[] = [];
  value.forEach((item, index) => {
    const range = toRange(item);
    if (range === null) {
      problems.push(
        `Range ${index + 1} is not valid: it needs a day from 1 to 7 and HH:MM times with closes later than opens`,
      );
    } else {
      ranges.push(range);
    }
  });
  if (problems.length > 0) {
    return { valid: false, problems };
  }

  ranges.sort(compareRanges);
  // Sorted by day and opening time, so a range overlaps an earlier one of its day exactly when it
  // opens before the latest closing time seen so far that day. Comparing only with the range right
  // before it would miss a long range followed by two short ones. Ranges that only touch (one
  // closes when the next opens) do not overlap.
  let latest: OpeningHoursRange | undefined;
  for (const range of ranges) {
    if (latest === undefined || latest.dayOfWeek !== range.dayOfWeek) {
      latest = range;
      continue;
    }
    if (range.opens < latest.closes) {
      problems.push(
        `Ranges ${latest.opens}-${latest.closes} and ${range.opens}-${range.closes} of day ${range.dayOfWeek} overlap`,
      );
    }
    if (range.closes > latest.closes) {
      latest = range;
    }
  }
  return problems.length > 0 ? { valid: false, problems } : { valid: true, ranges };
}
