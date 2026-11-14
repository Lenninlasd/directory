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

  it('has the exact texts of the opening hours and website rows (directory spec, "Interface text")', () => {
    expect(strings).toMatchObject({
      openingHoursLabel: 'Horario',
      websiteLabel: 'Página web',
      dayNames: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
      closedDay: 'Cerrado',
    });
  });

  it('has the exact texts of the editing interface (business-editing spec, "Editing interface text")', () => {
    expect(strings).toMatchObject({
      editOpeningHours: 'Editar con IA',
      noOpeningHours: 'Sin horario registrado',
      openingHoursRequestLabel: '¿Qué cambia en el horario?',
      openingHoursRequestPlaceholder: 'Ej.: de lunes a viernes de 8 a. m. a 6 p. m., o el sábado cerramos a las 2 p. m.',
      cancel: 'Cancelar',
      interpreting: 'Interpretando…',
      proposalTitle: 'Nuevo horario',
      noChanges: 'No hay cambios en el horario.',
      save: 'Guardar',
      saving: 'Guardando…',
      saved: 'Horario actualizado',
      notUnderstood: 'No entendí el cambio. Intenta escribirlo de otra forma.',
      interpretationError: 'No pudimos procesar el cambio. Inténtalo de nuevo.',
      saveError: 'No pudimos guardar el horario. Inténtalo de nuevo.',
      adminKeyLabel: 'Clave de administrador',
      adminKeyContinue: 'Continuar',
      wrongAdminKey: 'Clave incorrecta',
    });
  });

  it('has no text for a send button, since Enter sends the request (design D-20)', () => {
    expect(strings).not.toHaveProperty('reviewChange');
  });

  it('lists the changed days after "Días con cambios:"', () => {
    expect(strings.changedDays('lunes, miércoles y sábado')).toBe('Días con cambios: lunes, miércoles y sábado');
  });
});
