import { describe, expect, it } from 'vitest';
import { normalizeWhatsappNumber } from '../../src/domain/whatsappNumber.ts';

// Spec 001 AC-2.5: after removing spaces, dashes, parentheses, and a leading `+`,
// a number is valid when it has 8 to 15 digits and does not start with `0`.
describe('normalizeWhatsappNumber', () => {
  it('returns the digits of a valid number with country code', () => {
    expect(normalizeWhatsappNumber('573001234567')).toBe('573001234567');
  });

  it('removes spaces, dashes, parentheses, and a leading plus sign', () => {
    expect(normalizeWhatsappNumber('+57 (300) 123-4567')).toBe('573001234567');
  });

  it('accepts exactly 8 digits', () => {
    expect(normalizeWhatsappNumber('12345678')).toBe('12345678');
  });

  it('accepts exactly 15 digits', () => {
    expect(normalizeWhatsappNumber('123456789012345')).toBe('123456789012345');
  });

  it('rejects 7 digits', () => {
    expect(normalizeWhatsappNumber('1234567')).toBeNull();
  });

  it('rejects 16 digits', () => {
    expect(normalizeWhatsappNumber('1234567890123456')).toBeNull();
  });

  it('rejects a number that starts with 0', () => {
    expect(normalizeWhatsappNumber('0573001234567')).toBeNull();
  });

  it('rejects letters', () => {
    expect(normalizeWhatsappNumber('57300ABC4567')).toBeNull();
  });

  it('rejects a plus sign that is not at the start', () => {
    expect(normalizeWhatsappNumber('57+3001234567')).toBeNull();
  });

  it('rejects an empty string', () => {
    expect(normalizeWhatsappNumber('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(normalizeWhatsappNumber(null)).toBeNull();
  });
});
