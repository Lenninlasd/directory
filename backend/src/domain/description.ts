/** Longest description that still keeps the detail dialog usable at 320 px (import-businesses design D-6). */
export const MAX_DESCRIPTION_LENGTH = 300;

/**
 * Validates a description as stored by the import (directory spec, "Description validity").
 * Returns it trimmed when it has 1 to 300 characters after trimming, otherwise `null`.
 * Characters are counted as Unicode code points, so an emoji counts once, not as two UTF-16 code units.
 * Markup is kept as text: the dialog never interprets it (directory spec, "Business description").
 */
export function normalizeDescription(raw: string | null): string | null {
  if (raw === null) {
    return null;
  }
  const text = raw.trim();
  const length = [...text].length;
  return length >= 1 && length <= MAX_DESCRIPTION_LENGTH ? text : null;
}
