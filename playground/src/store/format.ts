import type { Currency } from './types.ts';

const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export function formatPrice(price: number | null, currency: Currency): string {
  if (price === null) return 'Precio a consultar';
  if (price === 0) return 'Gratis';
  return (currency === 'COP' ? pesos : euros).format(price);
}

/** What a person types in the price field. undefined when it is not a price. */
export function parsePriceInput(text: string, currency: Currency): number | null | undefined {
  const value = text.trim().replace(/^[$€]\s*|\s*€$/g, '');
  if (value === '') return null;
  if (currency === 'COP') {
    return /^\d+$|^\d{1,3}([.,]\d{3})+$/.test(value) ? Number(value.replace(/\D/g, '')) : undefined;
  }
  return /^\d+([.,]\d{1,2})?$/.test(value) ? Number(value.replace(',', '.')) : undefined;
}

export function priceToInput(price: number | null, currency: Currency): string {
  if (price === null) return '';
  return currency === 'COP' ? price.toLocaleString('es-CO') : String(price).replace('.', ',');
}

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export const NO_CATEGORY = 'Sin categoría';
export const categoryLabel = (category: string | null): string => category ?? NO_CATEGORY;

export function formatSeconds(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

const day = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
const hour = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });

export const formatDay = (iso: string): string => day.format(new Date(iso));
export const formatDayAndHour = (iso: string): string => `${day.format(new Date(iso))}, ${hour.format(new Date(iso))}`;

/** In order of first appearance, with the items of each group together. */
export function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(keyOf(item));
    if (group === undefined) groups.set(keyOf(item), [item]);
    else group.push(item);
  }
  return [...groups];
}
