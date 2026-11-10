import { describe, expect, it } from 'vitest';
import {
  FALLBACK_APPEARANCE,
  appearanceFor,
  type CategoryAppearance,
} from '../../../src/features/businesses/categoryAppearance.ts';
import { SUPPORTED_CATEGORIES } from '../../../src/features/businesses/supportedCategories.ts';

const classLists = (appearance: CategoryAppearance) => [
  appearance.coverClass,
  appearance.tintClass,
  appearance.iconOnTintClass,
];

describe('categoryAppearance', () => {
  it('gives every supported category its own icon and classes (AC-4.1)', () => {
    for (const { key } of SUPPORTED_CATEGORIES) {
      const appearance = appearanceFor(key);

      expect(appearance).not.toBe(FALLBACK_APPEARANCE);
      expect(appearance.icon).toBeTypeOf('function');
    }
  });

  it('uses the fallback for an unknown category (AC-4.3, EC-3)', () => {
    expect(appearanceFor('optica')).toBe(FALLBACK_APPEARANCE);
  });

  // Plan R-4: full literal class names that name the category's own tokens.
  it.each(SUPPORTED_CATEGORIES.map(({ key }) => key))('every class of "%s" names its own tokens', (key) => {
    for (const classList of classLists(appearanceFor(key))) {
      for (const className of classList.split(' ')) {
        expect(className).toContain(`category-${key}-`);
      }
    }
  });

  it('every fallback class names the fallback tokens', () => {
    for (const classList of classLists(FALLBACK_APPEARANCE)) {
      for (const className of classList.split(' ')) {
        expect(className).toContain('category-other-');
      }
    }
  });
});
