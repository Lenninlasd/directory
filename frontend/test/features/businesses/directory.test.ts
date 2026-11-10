import { describe, expect, it } from 'vitest';
import type { Business } from '../../../src/api/businesses.ts';
import {
  featuredBusinesses,
  filterBusinesses,
  listCategoryOptions,
  normalizeForMatching,
  resolveSelectedCategory,
} from '../../../src/features/businesses/directory.ts';
import { SUPPORTED_CATEGORIES } from '../../../src/features/businesses/supportedCategories.ts';

function business(overrides: Partial<Business> & Pick<Business, 'id'>): Business {
  return {
    name: `Business ${overrides.id}`,
    category: 'Comida',
    locationSummary: 'Alameda del Río',
    hasPhysicalStore: false,
    whatsappNumber: null,
    ...overrides,
  };
}

function withCategories(categories: string[]): Business[] {
  return categories.map((category, index) => business({ id: String(index), category }));
}

describe('normalizeForMatching', () => {
  it('trims, lowercases, and removes accents', () => {
    expect(normalizeForMatching('  Café ')).toBe('cafe');
    expect(normalizeForMatching('PANADERÍA')).toBe('panaderia');
  });

  it('matches "ñ" as "n" (plan D-8)', () => {
    expect(normalizeForMatching('Peña')).toBe('pena');
  });
});

describe('SUPPORTED_CATEGORIES', () => {
  it('lists the 15 categories of spec section 7, each keyed by its normalized name', () => {
    expect(SUPPORTED_CATEGORIES).toHaveLength(15);
    for (const { key, name } of SUPPORTED_CATEGORIES) {
      expect(key).toBe(normalizeForMatching(name));
    }
  });
});

describe('listCategoryOptions', () => {
  it('groups spelling variants of a supported category under its section 7 name', () => {
    expect(listCategoryOptions(withCategories(['Cafeteria', 'Cafetería', ' Cafeteria ']))).toEqual([
      { key: 'cafeteria', label: 'Cafetería' },
    ]);
  });

  it('labels an unsupported category with its first spelling in list order', () => {
    expect(listCategoryOptions(withCategories(['Óptica', 'optica']))).toEqual([
      { key: 'optica', label: 'Óptica' },
    ]);
    expect(listCategoryOptions(withCategories(['optica', 'Óptica']))).toEqual([
      { key: 'optica', label: 'optica' },
    ]);
  });

  it('orders options alphabetically with Spanish rules', () => {
    const options = listCategoryOptions(
      withCategories(['Panadería', 'Óptica', 'Ferretería', 'Alimentos', 'Educación']),
    );

    expect(options.map((option) => option.label)).toEqual([
      'Alimentos',
      'Educación',
      'Ferretería',
      'Óptica',
      'Panadería',
    ]);
  });

  it('returns no options for an empty list', () => {
    expect(listCategoryOptions([])).toEqual([]);
  });
});

describe('resolveSelectedCategory', () => {
  const options = [
    { key: 'comida', label: 'Comida' },
    { key: 'farmacia', label: 'Farmacia' },
  ];

  it('keeps a key that is among the options', () => {
    expect(resolveSelectedCategory(options, 'farmacia')).toBe('farmacia');
  });

  it('gives null for a key that is no longer among the options (AC-3.10)', () => {
    expect(resolveSelectedCategory(options, 'mascotas')).toBeNull();
  });

  it('keeps null as null', () => {
    expect(resolveSelectedCategory(options, null)).toBeNull();
  });
});

describe('filterBusinesses', () => {
  const cafe = business({ id: 'cafe', name: 'Café del Río', category: 'Cafetería', locationSummary: 'Torre 4' });
  const bakery = business({ id: 'bakery', name: 'La Esquina', category: 'Panadería', hasPhysicalStore: true });
  const coffeeVariant = business({ id: 'coffee', name: 'Tinto Express', category: 'cafeteria ' });
  const all = [cafe, bakery, coffeeVariant];

  const ids = (businesses: Business[]) => businesses.map(({ id }) => id);

  it('matches the name ignoring case and accents', () => {
    // A category that does not contain "cafe", so only the name can match.
    const cafeServingFood = { ...cafe, category: 'Comida' };

    expect(ids(filterBusinesses([cafeServingFood, bakery], { searchText: 'cafe', categoryKey: null }))).toEqual([
      'cafe',
    ]);
  });

  it('matches the category ignoring case and accents', () => {
    expect(ids(filterBusinesses(all, { searchText: 'panaderia', categoryKey: null }))).toEqual(['bakery']);
  });

  it('does not match the location summary (AC-2.1)', () => {
    expect(filterBusinesses(all, { searchText: 'Torre 4', categoryKey: null })).toEqual([]);
  });

  it('returns every business in input order for an empty or blank search', () => {
    expect(filterBusinesses(all, { searchText: '', categoryKey: null })).toEqual(all);
    expect(filterBusinesses(all, { searchText: '   ', categoryKey: null })).toEqual(all);
  });

  it('keeps spelling variants of the selected category', () => {
    expect(ids(filterBusinesses(all, { searchText: '', categoryKey: 'cafeteria' }))).toEqual(['cafe', 'coffee']);
  });

  it('keeps only businesses that match both the category and the search', () => {
    expect(ids(filterBusinesses(all, { searchText: 'tinto', categoryKey: 'cafeteria' }))).toEqual(['coffee']);
    expect(filterBusinesses(all, { searchText: 'tinto', categoryKey: 'panaderia' })).toEqual([]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterBusinesses(all, { searchText: 'zapatería', categoryKey: null })).toEqual([]);
  });
});

describe('featuredBusinesses', () => {
  const store1 = business({ id: 'store-1', hasPhysicalStore: true });
  const delivery = business({ id: 'delivery', hasPhysicalStore: false });
  const store2 = business({ id: 'store-2', hasPhysicalStore: true });
  const all = [store1, delivery, store2];

  it('returns only businesses with a store, in input order, with no filter', () => {
    expect(featuredBusinesses(all, { searchText: '', categoryKey: null })).toEqual([store1, store2]);
    expect(featuredBusinesses(all, { searchText: '  ', categoryKey: null })).toEqual([store1, store2]);
  });

  it('returns nothing while a category is selected', () => {
    expect(featuredBusinesses(all, { searchText: '', categoryKey: 'comida' })).toEqual([]);
  });

  it('returns nothing while the search has text', () => {
    expect(featuredBusinesses(all, { searchText: 'business', categoryKey: null })).toEqual([]);
  });
});
