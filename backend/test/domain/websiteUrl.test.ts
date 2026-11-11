import { describe, expect, it } from 'vitest';
import { normalizeWebsiteUrl } from '../../src/domain/websiteUrl.ts';

// Directory spec, "Website validity": an absolute `https` URL, returned in its standard form, or `null`.
describe('normalizeWebsiteUrl', () => {
  it('returns a valid https website', () => {
    expect(normalizeWebsiteUrl('https://example.com/panaderia')).toBe('https://example.com/panaderia');
  });

  it('returns the standard form, with the scheme and host in lowercase (design D-5)', () => {
    expect(normalizeWebsiteUrl('HTTPS://Example.com/panaderia')).toBe('https://example.com/panaderia');
  });

  it('ignores surrounding spaces', () => {
    expect(normalizeWebsiteUrl('  https://example.com/panaderia  ')).toBe('https://example.com/panaderia');
  });

  it('rejects a website without a scheme', () => {
    expect(normalizeWebsiteUrl('example.com/panaderia')).toBeNull();
  });

  it('rejects http', () => {
    expect(normalizeWebsiteUrl('http://example.com')).toBeNull();
  });

  it('rejects other schemes', () => {
    expect(normalizeWebsiteUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeWebsiteUrl('ftp://example.com')).toBeNull();
  });

  it('rejects an empty or blank website', () => {
    expect(normalizeWebsiteUrl('')).toBeNull();
    expect(normalizeWebsiteUrl('   ')).toBeNull();
  });

  it('returns null for a missing website', () => {
    expect(normalizeWebsiteUrl(null)).toBeNull();
  });
});
