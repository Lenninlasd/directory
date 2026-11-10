import {
  BasketIcon,
  BookIcon,
  BreadIcon,
  CakeIcon,
  CartIcon,
  CoffeeIcon,
  DumbbellIcon,
  FlowerIcon,
  PawIcon,
  PhoneIcon,
  PillIcon,
  ShirtIcon,
  SparklesIcon,
  TagIcon,
  UtensilsIcon,
  WrenchIcon,
  type IconComponent,
} from './icons.tsx';
import type { SupportedCategoryKey } from './supportedCategories.ts';

export interface CategoryAppearance {
  icon: IconComponent;
  /** Gradient stops for the cover; the direction is set by CategoryCover. */
  coverClass: string;
  /** Background behind the filter option icon. */
  tintClass: string;
  /** Color of the filter option icon. */
  iconOnTintClass: string;
}

// Every class is a full literal so Tailwind detects it (plan 003 R-4). A Record over the supported
// keys makes TypeScript report a category with no appearance (plan D-7).
const appearanceByKey: Record<SupportedCategoryKey, CategoryAppearance> = {
  alimentos: {
    icon: BasketIcon,
    coverClass: 'from-category-alimentos-from to-category-alimentos-to',
    tintClass: 'bg-category-alimentos-tint',
    iconOnTintClass: 'text-category-alimentos-to',
  },
  belleza: {
    icon: SparklesIcon,
    coverClass: 'from-category-belleza-from to-category-belleza-to',
    tintClass: 'bg-category-belleza-tint',
    iconOnTintClass: 'text-category-belleza-to',
  },
  cafeteria: {
    icon: CoffeeIcon,
    coverClass: 'from-category-cafeteria-from to-category-cafeteria-to',
    tintClass: 'bg-category-cafeteria-tint',
    iconOnTintClass: 'text-category-cafeteria-to',
  },
  comida: {
    icon: UtensilsIcon,
    coverClass: 'from-category-comida-from to-category-comida-to',
    tintClass: 'bg-category-comida-tint',
    iconOnTintClass: 'text-category-comida-to',
  },
  deportes: {
    icon: DumbbellIcon,
    coverClass: 'from-category-deportes-from to-category-deportes-to',
    tintClass: 'bg-category-deportes-tint',
    iconOnTintClass: 'text-category-deportes-to',
  },
  educacion: {
    icon: BookIcon,
    coverClass: 'from-category-educacion-from to-category-educacion-to',
    tintClass: 'bg-category-educacion-tint',
    iconOnTintClass: 'text-category-educacion-to',
  },
  farmacia: {
    icon: PillIcon,
    coverClass: 'from-category-farmacia-from to-category-farmacia-to',
    tintClass: 'bg-category-farmacia-tint',
    iconOnTintClass: 'text-category-farmacia-to',
  },
  ferreteria: {
    icon: WrenchIcon,
    coverClass: 'from-category-ferreteria-from to-category-ferreteria-to',
    tintClass: 'bg-category-ferreteria-tint',
    iconOnTintClass: 'text-category-ferreteria-to',
  },
  floristeria: {
    icon: FlowerIcon,
    coverClass: 'from-category-floristeria-from to-category-floristeria-to',
    tintClass: 'bg-category-floristeria-tint',
    iconOnTintClass: 'text-category-floristeria-to',
  },
  lavanderia: {
    icon: ShirtIcon,
    coverClass: 'from-category-lavanderia-from to-category-lavanderia-to',
    tintClass: 'bg-category-lavanderia-tint',
    iconOnTintClass: 'text-category-lavanderia-to',
  },
  mascotas: {
    icon: PawIcon,
    coverClass: 'from-category-mascotas-from to-category-mascotas-to',
    tintClass: 'bg-category-mascotas-tint',
    iconOnTintClass: 'text-category-mascotas-to',
  },
  mercado: {
    icon: CartIcon,
    coverClass: 'from-category-mercado-from to-category-mercado-to',
    tintClass: 'bg-category-mercado-tint',
    iconOnTintClass: 'text-category-mercado-to',
  },
  panaderia: {
    icon: BreadIcon,
    coverClass: 'from-category-panaderia-from to-category-panaderia-to',
    tintClass: 'bg-category-panaderia-tint',
    iconOnTintClass: 'text-category-panaderia-to',
  },
  postres: {
    icon: CakeIcon,
    coverClass: 'from-category-postres-from to-category-postres-to',
    tintClass: 'bg-category-postres-tint',
    iconOnTintClass: 'text-category-postres-to',
  },
  tecnologia: {
    icon: PhoneIcon,
    coverClass: 'from-category-tecnologia-from to-category-tecnologia-to',
    tintClass: 'bg-category-tecnologia-tint',
    iconOnTintClass: 'text-category-tecnologia-to',
  },
};

export const FALLBACK_APPEARANCE: CategoryAppearance = {
  icon: TagIcon,
  coverClass: 'from-category-other-from to-category-other-to',
  tintClass: 'bg-category-other-tint',
  iconOnTintClass: 'text-category-other-to',
};

function isSupportedKey(categoryKey: string): categoryKey is SupportedCategoryKey {
  return Object.hasOwn(appearanceByKey, categoryKey);
}

/** Icon and colors for a normalized category key; unknown keys get the fallback (AC-4.3). */
export function appearanceFor(categoryKey: string): CategoryAppearance {
  return isSupportedKey(categoryKey) ? appearanceByKey[categoryKey] : FALLBACK_APPEARANCE;
}
