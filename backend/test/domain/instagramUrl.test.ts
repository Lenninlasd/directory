import { describe, expect, it } from 'vitest';
import { normalizeInstagramUrl } from '../../src/domain/instagramUrl.ts';

// Directory spec, "Instagram link validity": exactly `https://www.instagram.com/{handle}/`,
// with a handle of 1 to 30 letters, digits, periods, or underscores, or `null`.
describe('normalizeInstagramUrl', () => {
  it('returns a valid Instagram link', () => {
    expect(normalizeInstagramUrl('https://www.instagram.com/example.panaderia/')).toBe(
      'https://www.instagram.com/example.panaderia/',
    );
  });

  it('accepts digits and underscores in the handle', () => {
    expect(normalizeInstagramUrl('https://www.instagram.com/pan_2024/')).toBe('https://www.instagram.com/pan_2024/');
  });

  it('ignores surrounding spaces', () => {
    expect(normalizeInstagramUrl(' https://www.instagram.com/example/ ')).toBe('https://www.instagram.com/example/');
  });

  it('accepts a 30-character handle and rejects a 31-character one', () => {
    expect(normalizeInstagramUrl(`https://www.instagram.com/${'a'.repeat(30)}/`)).toBe(
      `https://www.instagram.com/${'a'.repeat(30)}/`,
    );
    expect(normalizeInstagramUrl(`https://www.instagram.com/${'a'.repeat(31)}/`)).toBeNull();
  });

  it('rejects another scheme or host', () => {
    expect(normalizeInstagramUrl('http://www.instagram.com/example/')).toBeNull();
    expect(normalizeInstagramUrl('https://instagram.example.com/example/')).toBeNull();
    expect(normalizeInstagramUrl('https://instagram.com/example/')).toBeNull();
  });

  it('rejects a longer path, a query, or a missing final slash', () => {
    expect(normalizeInstagramUrl('https://www.instagram.com/p/abc123/')).toBeNull();
    expect(normalizeInstagramUrl('https://www.instagram.com/example/?hl=es')).toBeNull();
    expect(normalizeInstagramUrl('https://www.instagram.com/example')).toBeNull();
  });

  it('rejects a handle with other characters or no handle', () => {
    expect(normalizeInstagramUrl('https://www.instagram.com/pan-dulce/')).toBeNull();
    expect(normalizeInstagramUrl('https://www.instagram.com/panadería/')).toBeNull();
    expect(normalizeInstagramUrl('https://www.instagram.com//')).toBeNull();
  });

  it('returns null for a missing or blank link', () => {
    expect(normalizeInstagramUrl(null)).toBeNull();
    expect(normalizeInstagramUrl('   ')).toBeNull();
  });
});
