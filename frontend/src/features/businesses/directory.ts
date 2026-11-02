import type { Business } from '../../api/businesses.ts';
import { SUPPORTED_CATEGORIES } from './supportedCategories.ts';

// Search, category filter, and featured rules of spec 003 (plan section 3). Every list keeps the
// input order, which is the API order of spec 001 FR-5.

export interface CategoryOption {
  key: string;
  label: string;
}

export interface DirectoryFilters {
  searchText: string;
  /** Normalized category key, or null for "Todos". */
  categoryKey: string | null;
}

const spanishCollator = new Intl.Collator('es');
const supportedNamesByKey = new Map<string, string>(SUPPORTED_CATEGORIES.map(({ key, name }) => [key, name]));

// Removing diacritics also turns "ñ" into "n" (plan D-8).
export function normalizeForMatching(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

// One option per normalized category (AC-3.1). Supported categories use their section 7 name,
// others the first spelling in list order (AC-3.11).
export function listCategoryOptions(businesses: readonly Business[]): CategoryOption[] {
  const labelsByKey = new Map<string, string>();
  for (const business of businesses) {
    const key = normalizeForMatching(business.category);
    if (!labelsByKey.has(key)) {
      labelsByKey.set(key, supportedNamesByKey.get(key) ?? business.category.trim());
    }
  }
  return [...labelsByKey]
    .map(([key, label]) => ({ key, label }))
    .sort((first, second) => spanishCollator.compare(first.label, second.label));
}

// Name or category contains the search text, within the selected category (AC-2.1 to AC-2.4, AC-3.7).
// The location summary is not searched.
export function filterBusinesses(businesses: readonly Business[], filters: DirectoryFilters): Business[] {
  const term = normalizeForMatching(filters.searchText);
  return businesses.filter((business) => {
    const categoryKey = normalizeForMatching(business.category);
    if (filters.categoryKey !== null && categoryKey !== filters.categoryKey) return false;
    return term === '' || normalizeForMatching(business.name).includes(term) || categoryKey.includes(term);
  });
}

// Shown only while browsing everything, so filtered results never appear twice (AC-6.1, AC-6.2).
export function featuredBusinesses(businesses: readonly Business[], filters: DirectoryFilters): Business[] {
  if (filters.categoryKey !== null || filters.searchText.trim() !== '') return [];
  return businesses.filter((business) => business.hasPhysicalStore);
}

// A selection that disappeared after a reload falls back to "Todos" (AC-3.10).
export function resolveSelectedCategory(options: readonly CategoryOption[], categoryKey: string | null): string | null {
  return categoryKey !== null && options.some((option) => option.key === categoryKey) ? categoryKey : null;
}
