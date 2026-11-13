import { describe, expect, it } from 'vitest';
import { isAdminMode } from '../../../src/features/businesses/adminMode.ts';

// Business-editing spec, "Admin mode": only the `admin` query parameter turns it on.
describe('isAdminMode', () => {
  it('is on with ?admin', () => {
    expect(isAdminMode('?admin')).toBe(true);
  });

  it('is on with ?admin=1, whatever the value', () => {
    expect(isAdminMode('?admin=1')).toBe(true);
  });

  it('is on when admin comes with other parameters', () => {
    expect(isAdminMode('?utm_source=x&admin')).toBe(true);
  });

  it('is off with other parameters only', () => {
    expect(isAdminMode('?administrator=1&q=admin')).toBe(false);
  });

  it('is off with no query string', () => {
    expect(isAdminMode('')).toBe(false);
  });
});
