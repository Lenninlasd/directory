/** `https://www.instagram.com/{handle}/` and nothing more: no query, no fragment, no longer path. */
const INSTAGRAM_PROFILE = /^https:\/\/www\.instagram\.com\/[A-Za-z0-9._]{1,30}\/$/;

/**
 * Validates an Instagram link as stored by the import (directory spec, "Instagram link validity";
 * import-businesses design D-6). Returns the link without surrounding spaces when it is exactly a profile link
 * whose handle has 1 to 30 letters, digits, periods, or underscores, otherwise `null`.
 */
export function normalizeInstagramUrl(raw: string | null): string | null {
  if (raw === null) {
    return null;
  }
  const link = raw.trim();
  return INSTAGRAM_PROFILE.test(link) ? link : null;
}
