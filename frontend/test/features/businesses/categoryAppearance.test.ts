import { describe, expect, it } from 'vitest';
import { appearanceForCategory } from '../../../src/features/businesses/categoryAppearance.ts';
import { SUPPORTED_CATEGORIES } from '../../../src/features/businesses/supportedCategories.ts';

// Tailwind only generates classes it finds as full text (plan 003 R-4), so each class must name
// its own category's tokens literally.
function expectTokensOf(category: string, slug: string) {
  const appearance = appearanceForCategory(category);
  expect(appearance.coverClass).toBe(`from-category-${slug}-from to-category-${slug}-to`);
  expect(appearance.tintClass).toBe(`bg-category-${slug}-tint`);
  expect(appearance.iconOnTintClass).toBe(`text-category-${slug}-to`);
}

describe('appearanceForCategory', () => {
  it('gives every supported category its own icon and tokens (AC-4.1)', () => {
    for (const { key, name } of SUPPORTED_CATEGORIES) {
      expectTokensOf(name, key);
    }
    const icons = new Set(SUPPORTED_CATEGORIES.map(({ name }) => appearanceForCategory(name).icon));
    expect(icons.size).toBe(SUPPORTED_CATEGORIES.length);
  });

  it('matches spelling variants of a supported category (AC-4.2)', () => {
    expect(appearanceForCategory('  cafeteria ')).toBe(appearanceForCategory('Cafetería'));
  });

  it('uses the fallback for an unknown category (AC-4.3)', () => {
    expectTokensOf('Óptica', 'other');
  });
});
