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

let nextId = 0;

function business(overrides: Partial<Business>): Business {
  nextId += 1;
  return {
    id: `id-${nextId}`,
    name: `Negocio ${nextId}`,
    category: 'Comida',
    locationSummary: 'Local 1',
    hasPhysicalStore: true,
    whatsappNumber: null,
    ...overrides,
  };
}

describe('normalizeForMatching', () => {
  it('ignores accents, letter case, and surrounding spaces', () => {
    expect(normalizeForMatching('  Café ')).toBe('cafe');
    expect(normalizeForMatching('PANADERÍA')).toBe('panaderia');
  });

  it('matches "ñ" with "n" (plan D-8)', () => {
    expect(normalizeForMatching('Peña')).toBe('pena');
  });
});

describe('SUPPORTED_CATEGORIES', () => {
  it('lists the 15 categories of spec section 7, each keyed by its normalized name', () => {
    expect(SUPPORTED_CATEGORIES).toHaveLength(15);
    for (const category of SUPPORTED_CATEGORIES) {
      expect(category.key).toBe(normalizeForMatching(category.name));
    }
  });
});

describe('listCategoryOptions', () => {
  it('groups spelling variants of a supported category under its section 7 name', () => {
    const options = listCategoryOptions([
      business({ category: 'cafeteria' }),
      business({ category: 'Cafetería' }),
      business({ category: ' Cafeteria ' }),
    ]);

    expect(options).toEqual([{ key: 'cafeteria', label: 'Cafetería' }]);
  });

  it('labels an unsupported category with its first spelling in list order', () => {
    const options = listCategoryOptions([business({ category: 'Óptica' }), business({ category: 'optica' })]);

    expect(options).toEqual([{ key: 'optica', label: 'Óptica' }]);
  });

  it('orders options alphabetically with Spanish rules', () => {
    const options = listCategoryOptions([
      business({ category: 'Panadería' }),
      business({ category: 'Óptica' }),
      business({ category: 'Ferretería' }),
      business({ category: 'Alimentos' }),
      business({ category: 'Educación' }),
    ]);

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
    { key: 'belleza', label: 'Belleza' },
  ];

  it('keeps a key that is among the options', () => {
    expect(resolveSelectedCategory(options, 'belleza')).toBe('belleza');
  });

  it('returns null for a key that is no longer among the options (AC-3.10)', () => {
    expect(resolveSelectedCategory(options, 'mascotas')).toBeNull();
  });

  it('keeps null as null', () => {
    expect(resolveSelectedCategory(options, null)).toBeNull();
  });
});

describe('filterBusinesses', () => {
  const cafe = business({ name: 'Café del Río', category: 'Cafetería', locationSummary: 'Torre 4' });
  const bakery = business({ name: 'Doña Rosa', category: 'Panadería', locationSummary: 'Local 3' });
  const coffeeShop = business({ name: 'Tinto y Pan', category: 'cafeteria', locationSummary: 'Local 9' });
  const all = [cafe, bakery, coffeeShop];

  it('finds a business by its name, ignoring accents and case', () => {
    expect(filterBusinesses(all, { searchText: 'cafe', categoryKey: null })).toEqual([cafe, coffeeShop]);
  });

  it('finds a business by its category', () => {
    expect(filterBusinesses(all, { searchText: 'panaderia', categoryKey: null })).toEqual([bakery]);
  });

  it('does not search the location summary', () => {
    expect(filterBusinesses(all, { searchText: 'Torre 4', categoryKey: null })).toEqual([]);
  });

  it('returns every business in input order when the search is empty or only spaces', () => {
    expect(filterBusinesses(all, { searchText: '', categoryKey: null })).toEqual(all);
    expect(filterBusinesses(all, { searchText: '   ', categoryKey: null })).toEqual(all);
  });

  it('keeps every spelling variant of the selected category', () => {
    expect(filterBusinesses(all, { searchText: '', categoryKey: 'cafeteria' })).toEqual([cafe, coffeeShop]);
  });

  it('keeps only businesses that match both the category and the search', () => {
    expect(filterBusinesses(all, { searchText: 'tinto', categoryKey: 'cafeteria' })).toEqual([coffeeShop]);
  });

  it('returns no businesses when nothing matches', () => {
    expect(filterBusinesses(all, { searchText: 'mascotas', categoryKey: null })).toEqual([]);
  });
});

describe('featuredBusinesses', () => {
  const storeA = business({ name: 'A', hasPhysicalStore: true, category: 'Comida' });
  const deliveryOnly = business({ name: 'B', hasPhysicalStore: false, category: 'Postres' });
  const storeC = business({ name: 'C', hasPhysicalStore: true, category: 'Belleza' });
  const all = [storeA, deliveryOnly, storeC];

  it('returns only businesses with a store, in input order, when no filter is active', () => {
    expect(featuredBusinesses(all, { searchText: '', categoryKey: null })).toEqual([storeA, storeC]);
    expect(featuredBusinesses(all, { searchText: '  ', categoryKey: null })).toEqual([storeA, storeC]);
  });

  it('returns nothing while a category is selected', () => {
    expect(featuredBusinesses(all, { searchText: '', categoryKey: 'comida' })).toEqual([]);
  });

  it('returns nothing while the search has text', () => {
    expect(featuredBusinesses(all, { searchText: 'a', categoryKey: null })).toEqual([]);
  });
});
