/**
 * True when the page was opened with the `admin` query parameter, with or without a value
 * (business-editing spec, "Admin mode"; design D-13). `search` is `window.location.search`.
 */
export function isAdminMode(search: string): boolean {
  return new URLSearchParams(search).has('admin');
}
