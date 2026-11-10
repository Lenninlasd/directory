import { describe, expect, it } from 'vitest';
import { strings } from '../src/strings.ts';

// Expected texts are written literally, so a wording change in strings.ts fails the test (spec 003 section 6).
describe('strings', () => {
  it('uses the singular and plural result count (AC-7.3)', () => {
    expect(strings.resultCount(1)).toBe('1 negocio');
    expect(strings.resultCount(4)).toBe('4 negocios');
    expect(strings.resultCount(0)).toBe('0 negocios');
  });

  it('names the tile button after the business (AC-5.7)', () => {
    expect(strings.viewDetailsLabel('Arepas La Mona')).toBe('Ver detalles de Arepas La Mona');
  });

  it('has the exact texts of spec 003 section 6', () => {
    expect(strings).toMatchObject({
      directoryTitle: 'Negocios en Alameda del Río',
      searchPlaceholder: 'Buscar negocios o categorías',
      searchLabel: 'Buscar negocios',
      clearSearchLabel: 'Borrar búsqueda',
      categoryFilterLabel: 'Categorías',
      allCategories: 'Todos',
      featuredTitle: 'Visítalos en su tienda',
      featuredSubtitle: 'Negocios con local físico',
      allBusinessesTitle: 'Todos los negocios',
      noResultsTitle: 'No encontramos negocios',
      noResultsHint: 'Prueba con otra búsqueda o categoría.',
      closeDialogLabel: 'Cerrar',
      locationLabel: 'Ubicación',
      dialogWhatsappButtonText: 'Escribir por WhatsApp',
      noWhatsapp: 'Este negocio no tiene WhatsApp registrado',
    });
  });
});
