/**
 * Validates a Maps link as stored by the import (directory spec, "Maps link validity"; import-businesses design D-6).
 * Returns the URL in its standard form when it is an absolute `https` URL on the host `www.google.com`
 * with a path that starts with `/maps/`, otherwise `null`. A link labeled "Ver en Google Maps" must open Google Maps.
 */
export function normalizeMapsUrl(raw: string | null): string | null {
  if (raw === null || !URL.canParse(raw.trim())) {
    return null;
  }
  const url = new URL(raw.trim());
  const isGoogleMaps = url.protocol === 'https:' && url.host === 'www.google.com' && url.pathname.startsWith('/maps/');
  return isGoogleMaps ? url.href : null;
}
