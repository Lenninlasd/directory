// All Spanish UI text (spec 001 plan D-5, spec 003 section 6). Wording and characters must match the specs exactly.
export const strings = {
  loading: 'Cargando…',
  loadError: 'No pudimos cargar los negocios. Inténtalo de nuevo.',
  retry: 'Reintentar',
  empty: 'Aún no hay negocios disponibles',
  inStore: 'En tienda',
  deliveryOnly: 'Solo domicilios',
  whatsappGreeting:'Hola, te encontré en el directorio de Alameda del Río',
  whatsappButtonLabel: (businessName: string): string => `Contactar a ${businessName} por WhatsApp`,

  directoryTitle: 'Negocios en Alameda del Río',
  searchPlaceholder: 'Buscar negocios o categorías',
  searchLabel: 'Buscar negocios',
  clearSearchLabel: 'Borrar búsqueda',
  categoryFilterLabel: 'Categorías',
  allCategories: 'Todos',
  featuredTitle: 'Visítalos en su tienda',
  featuredSubtitle: 'Negocios con local físico',
  allBusinessesTitle: 'Todos los negocios',
  resultCount: (count: number): string => `${count} ${count === 1 ? 'negocio' : 'negocios'}`,
  noResultsTitle: 'No encontramos negocios',
  noResultsHint: 'Prueba con otra búsqueda o categoría.',
  viewDetailsLabel: (businessName: string): string => `Ver detalles de ${businessName}`,
  closeDialogLabel: 'Cerrar',
  locationLabel: 'Ubicación',
  dialogWhatsappButtonText: 'Escribir por WhatsApp',
  noWhatsapp: 'Este negocio no tiene WhatsApp registrado',

  // Directory spec, "Interface text" and "Opening hours display" (add-business-hours-and-website).
  openingHoursLabel: 'Horario',
  websiteLabel: 'Página web',
  /** Monday to Sunday, in the order of `dayOfWeek` 1 to 7. */
  dayNames: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
  closedDay: 'Cerrado',
  beforeNoon: 'a. m.',
  afterNoon: 'p. m.',
  /** Joins two days or several ranges: "Sábado y domingo". */
  and: 'y',
  /** Joins the first and last day of a group: "Lunes a viernes". */
  through: 'a',
} as const;
