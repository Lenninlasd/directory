import { initialState, type StoreState } from './state.ts';
import type { MenuImport } from './types.ts';

// Edits live in this browser only. Storage can be unavailable (private mode): then they last until a reload.
// Change the version when StoreState changes, so an old draft is ignored.
const PREFIX = 'playground.store.v1';

export function readItem(key: string): string | null {
  try {
    return localStorage.getItem(`${PREFIX}.${key}`);
  } catch {
    return null;
  }
}

export function writeItem(key: string, value: string): void {
  try {
    localStorage.setItem(`${PREFIX}.${key}`, value);
  } catch {
    // See above.
  }
}

export const sessionKey = (menu: MenuImport): string => `${menu.id}.${menu.run}`;

export function loadState(menu: MenuImport): StoreState {
  const saved = readItem(sessionKey(menu));
  if (saved === null) return initialState(menu);
  try {
    return { ...initialState(menu), ...(JSON.parse(saved) as Partial<StoreState>) };
  } catch {
    return initialState(menu);
  }
}

export function saveState(menu: MenuImport, state: StoreState): void {
  writeItem(sessionKey(menu), JSON.stringify({ ...state, past: [] }));
}

const timerKey = (menu: MenuImport): string => `${sessionKey(menu)}.seconds`;
export const readSeconds = (menu: MenuImport): number => Number(readItem(timerKey(menu)) ?? 0);
export const writeSeconds = (menu: MenuImport, seconds: number): void => writeItem(timerKey(menu), String(seconds));
