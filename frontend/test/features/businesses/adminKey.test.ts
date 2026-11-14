import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAdminKey, getAdminKey, setAdminKey } from '../../../src/features/businesses/adminKey.ts';

// Business-editing spec, "Key kept for the tab" (design D-13): sessionStorage, so closing the tab forgets it.
afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('adminKey', () => {
  it('has no key at first', () => {
    expect(getAdminKey()).toBeNull();
  });

  it('returns the key that was set, exactly as given', () => {
    setAdminKey(' a+b/c= ');

    expect(getAdminKey()).toBe(' a+b/c= ');
  });

  it('keeps the key in sessionStorage, not localStorage', () => {
    setAdminKey('secret');

    expect(Object.keys(sessionStorage)).toHaveLength(1);
    expect(Object.keys(localStorage)).toHaveLength(0);
  });

  it('forgets the key after clear', () => {
    setAdminKey('secret');

    clearAdminKey();

    expect(getAdminKey()).toBeNull();
  });

  it('acts as if no key is kept when the storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    expect(() => setAdminKey('secret')).not.toThrow();
    expect(getAdminKey()).toBeNull();
    expect(() => clearAdminKey()).not.toThrow();
  });
});
