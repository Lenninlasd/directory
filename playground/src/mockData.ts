import type { Business } from './api/businesses.ts';
import { styleFor } from './categories.ts';

// Fields the API does not have yet. Everything here is invented for design exploration.
export interface BusinessDetails {
  description: string;
  hours: string[];
  /** example.com URLs only, so no real site is ever opened. */
  website: string | null;
  images: { url: string; alt: string }[];
}

export type PlaygroundBusiness = Business & { details?: BusinessDetails };

// Mock WhatsApp numbers use the invalid Colombian prefix 570 so they never reach a real person.
const mockBusinesses: Business[] = [
  mock('m01', 'Droguería Alameda', 'Farmacia', 'Local 7, Centro Comercial Alameda', true),
  mock('m02', 'Peluditos Pet Shop', 'Mascotas', 'Torre 4, apartamento 302', false),
  mock('m03', 'Lavaseco Express', 'Lavandería', 'Local 12, Centro Comercial Alameda', true),
  mock('m04', 'Dulce Tentación', 'Postres', 'Torre 9, apartamento 1104', false),
  mock('m05', 'CeluFix Reparaciones', 'Tecnología', 'Local 5, Centro Comercial Alameda', true),
  mock('m06', 'Flores del Caribe', 'Floristería', 'Torre 2, apartamento 801', false),
  mock('m07', 'Entrena en Casa', 'Deportes', 'Zona húmeda, torre 6', false),
  mock('m08', 'Minimercado La Esquina', 'Mercado', 'Local 1, Centro Comercial Alameda', true),
  mock('m09', 'Brownies de la Abuela', 'Postres', 'Torre 11, apartamento 504', false),
  mock('m10', 'Farmacia Vida Sana', 'Farmacia', 'Local 9, Centro Comercial Alameda', true),
];

function mock(
  id: string,
  name: string,
  category: string,
  locationSummary: string,
  hasPhysicalStore: boolean,
): Business {
  return {
    id: `mock-${id}`,
    name,
    category,
    locationSummary,
    hasPhysicalStore,
    whatsappNumber: `57000000${id.slice(1).padStart(4, '0')}`,
  };
}

const hourOptions = [
  ['Lunes a sábado · 7:00 a. m. – 7:00 p. m.', 'Domingos · 8:00 a. m. – 1:00 p. m.'],
  ['Lunes a viernes · 8:00 a. m. – 6:00 p. m.'],
  ['Todos los días · 6:00 a. m. – 9:00 p. m.'],
  ['Pedidos por WhatsApp · entregas de 2:00 p. m. a 8:00 p. m.'],
];

// Deterministic per business, so the same business always gets the same mock details.
function hash(text: string): number {
  let value = 0;
  for (const character of text) value = (value * 31 + character.charCodeAt(0)) >>> 0;
  return value;
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function detailsFor(business: Business): BusinessDetails {
  const seed = hash(business.id);
  const keyword = styleFor(business.category).photoKeyword;
  const imageCount = 2 + (seed % 4);

  return {
    description: `${business.name} es un negocio de ${business.category.toLowerCase()} en Alameda del Río. ${
      business.hasPhysicalStore
        ? 'Visítanos en nuestro local o pide a domicilio dentro del conjunto.'
        : 'Atendemos solo a domicilio dentro del conjunto; escríbenos y te llevamos tu pedido.'
    }`,
    hours: hourOptions[seed % hourOptions.length] ?? [],
    website: seed % 3 === 0 ? null : `https://example.com/${slugify(business.name)}`,
    images: Array.from({ length: imageCount }, (_, index) => ({
      // picsum photos are random, not category-matched; the keyword only varies the seed.
      // 2:1 to match the detail modal's main image, so nothing is cropped.
      url: `https://picsum.photos/seed/${keyword}-${seed % 1000}-${index}/800/400`,
      alt: `Foto ${index + 1} de ${business.name}`,
    })),
  };
}

export function withMockData(businesses: Business[], enabled: boolean): PlaygroundBusiness[] {
  if (!enabled) return businesses;
  return [...businesses, ...mockBusinesses].map((business) => ({ ...business, details: detailsFor(business) }));
}
