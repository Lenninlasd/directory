// The categories of spec 003 section 7. Each key is the name after normalizeForMatching(), and
// categoryAppearance.ts gives each key its icon and colors.
export const SUPPORTED_CATEGORIES = [
  { key: 'alimentos', name: 'Alimentos' },
  { key: 'belleza', name: 'Belleza' },
  { key: 'cafeteria', name: 'Cafetería' },
  { key: 'comida', name: 'Comida' },
  { key: 'deportes', name: 'Deportes' },
  { key: 'educacion', name: 'Educación' },
  { key: 'farmacia', name: 'Farmacia' },
  { key: 'ferreteria', name: 'Ferretería' },
  { key: 'floristeria', name: 'Floristería' },
  { key: 'lavanderia', name: 'Lavandería' },
  { key: 'mascotas', name: 'Mascotas' },
  { key: 'mercado', name: 'Mercado' },
  { key: 'panaderia', name: 'Panadería' },
  { key: 'postres', name: 'Postres' },
  { key: 'tecnologia', name: 'Tecnología' },
] as const;

export type SupportedCategoryKey = (typeof SUPPORTED_CATEGORIES)[number]['key'];
