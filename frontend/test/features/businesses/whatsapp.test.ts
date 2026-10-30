import { describe, expect, it } from 'vitest';
import { buildWhatsappUrl } from '../../../src/features/businesses/whatsapp.ts';

// Spec 001 AC-4.1: exact greeting, written here literally so a wording change in strings.ts fails the test.
const expectedGreeting = 'Hola, te encontré en el directorio de Alameda del Río';

describe('buildWhatsappUrl', () => {
  it('builds a wa.me URL with the number and the encoded greeting', () => {
    expect(buildWhatsappUrl('573001234567')).toBe(
      `https://wa.me/573001234567?text=${encodeURIComponent(expectedGreeting)}`,
    );
  });

  it('decodes the text parameter to the exact greeting', () => {
    const url = new URL(buildWhatsappUrl('573001234567'));

    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe('/573001234567');
    expect(url.searchParams.get('text')).toBe(expectedGreeting);
  });

  it('uses a generic greeting that does not depend on the business', () => {
    expect(new URL(buildWhatsappUrl('12345678')).searchParams.get('text')).toBe(expectedGreeting);
  });
});
