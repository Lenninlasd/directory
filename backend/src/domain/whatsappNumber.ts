const SEPARATORS = /[ ()-]/g;
const VALID_NUMBER = /^[1-9]\d{7,14}$/;

/**
 * Normalizes a WhatsApp number as stored by the team (spec 001 AC-2.5).
 * Returns the digits with country code, or `null` when the number is missing or invalid.
 */
export function normalizeWhatsappNumber(raw: string | null): string | null {
  if (raw === null) {
    return null;
  }
  const withoutSeparators = raw.replace(SEPARATORS, '');
  const digits = withoutSeparators.startsWith('+') ? withoutSeparators.slice(1) : withoutSeparators;
  return VALID_NUMBER.test(digits) ? digits : null;
}
