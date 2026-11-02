import { describe, expect, it } from 'vitest';
import { strings } from '../src/strings.ts';

describe('strings', () => {
  it('words the result count in singular and plural (AC-7.3)', () => {
    expect(strings.resultCount(1)).toBe('1 negocio');
    expect(strings.resultCount(4)).toBe('4 negocios');
  });

  it('names the tile button after the business (AC-5.7)', () => {
    expect(strings.viewDetailsLabel('Arepas La Mona')).toBe('Ver detalles de Arepas La Mona');
  });
});
