// The admin key, kept for the current tab only (business-editing spec, "Key kept for the tab"; design D-13).
// sessionStorage is cleared when the tab closes. Every call is guarded, since a blocked storage throws:
// then nothing is kept and the editor simply asks for the key again.

const STORAGE_KEY = 'alameda.adminKey';

export function getAdminKey(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminKey(key: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, key);
  } catch {
    // Not kept; the key is asked for on the next request.
  }
}

export function clearAdminKey(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing was kept.
  }
}
