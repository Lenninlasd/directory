import type { Business } from '../../api/businesses.ts';
import { SUPPORTED_CATEGORIES } from './supportedCategories.ts';

// Directory rules of spec 003 (plan section 3). No React: every function is pure and keeps
// the input order, which is the API order of spec 001 FR-5.

export interface CategoryOption {
  key: string;
  label: string;
}

const supportedNameByKey = new Map<string, string>(
  SUPPORTED_CATEGORIES.map(({ key, name }) => [key, name]),
);

const spanishCollator = new Intl.Collator('es');

/** Removes diacritics, lowercases, and trims, so "  Café " and "cafe" match (AC-2.2, AC-4.2, D-8). */
export function normalizeForMatching(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/**
 * One option per normalized category (AC-3.1). The label is the section 7 name for a supported
 * category, otherwise the first spelling in list order (AC-3.11). Sorted with Spanish rules (AC-3.2).
 */
export function listCategoryOptions(businesses: readonly Business[]): CategoryOption[] {
  const labelByKey = new Map<string, string>();
  for (const { category } of businesses) {
    const key = normalizeForMatching(category);
    if (!labelByKey.has(key)) {
      labelByKey.set(key, supportedNameByKey.get(key) ?? category.trim());
    }
  }
  return [...labelByKey]
    .map(([key, label]) => ({ key, label }))
    .sort((first, second) => spanishCollator.compare(first.label, second.label));
}

export interface DirectoryFilter {
  searchText: string;
  /** A key from listCategoryOptions(), or null for "Todos". */
  categoryKey: string | null;
}

/**
 * Businesses in the selected category whose name or category contains the search text, ignoring
 * case, accents, and surrounding spaces. The location summary is not searched (AC-2.1 to AC-2.4,
 * AC-3.4, AC-3.7).
 */
export function filterBusinesses(businesses: readonly Business[], filter: DirectoryFilter): Business[] {
  const term = normalizeForMatching(filter.searchText);
  return businesses.filter((business) => {
    const categoryKey = normalizeForMatching(business.category);
    if (filter.categoryKey !== null && categoryKey !== filter.categoryKey) {
      return false;
    }
    return term === '' || normalizeForMatching(business.name).includes(term) || categoryKey.includes(term);
  });
}

/** Businesses with a physical store, only while browsing all with a blank search (AC-6.1, AC-6.2). */
export function featuredBusinesses(businesses: readonly Business[], filter: DirectoryFilter): Business[] {
  if (filter.categoryKey !== null || filter.searchText.trim() !== '') {
    return [];
  }
  return businesses.filter((business) => business.hasPhysicalStore);
}

/** The selected key while it is still an option, otherwise null ("Todos", AC-3.10, D-3). */
export function resolveSelectedCategory(
  options: readonly CategoryOption[],
  categoryKey: string | null,
): string | null {
  return options.some((option) => option.key === categoryKey) ? categoryKey : null;
}
