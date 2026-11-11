/**
 * Validates a website as stored by the team (directory spec, "Website validity"; design D-5).
 * Returns the URL in its standard form when it is an absolute `https` URL, otherwise `null`.
 */
export function normalizeWebsiteUrl(raw: string | null): string | null {
  if (raw === null || !URL.canParse(raw.trim())) {
    return null;
  }
  const url = new URL(raw.trim());
  return url.protocol === 'https:' ? url.href : null;
}
