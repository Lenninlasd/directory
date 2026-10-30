// All Spanish UI text (spec 001, plan D-5). Wording and characters must match the spec exactly.
export const strings = {
  loading: 'Cargando…',
  loadError: 'No pudimos cargar los negocios. Inténtalo de nuevo.',
  retry: 'Reintentar',
  empty: 'Aún no hay negocios disponibles',
  inStore: 'En tienda',
  deliveryOnly: 'Solo domicilios',
  whatsappGreeting: 'Hola, te encontré en el directorio de Alameda del Río',
  whatsappButtonLabel: (businessName: string): string => `Contactar a ${businessName} por WhatsApp`,
} as const;
