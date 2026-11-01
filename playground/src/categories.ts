import type { ComponentType, SVGProps } from 'react';
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
} from './icons.tsx';

export interface CategoryStyle {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Cover gradient and chip tint, as Tailwind classes. */
  cover: string;
  chip: string;
  /** English keyword used to seed example photos. */
  photoKeyword: string;
}

// Keyed by the exact `category` string the API returns. Unknown categories use the fallback.
export const categoryStyles: Record<string, CategoryStyle> = {
  Ferretería: { icon: WrenchIcon, cover: 'from-slate-500 to-slate-700', chip: 'bg-slate-100 text-slate-700', photoKeyword: 'hardware' },
  Comida: { icon: UtensilsIcon, cover: 'from-orange-400 to-red-500', chip: 'bg-orange-100 text-orange-700', photoKeyword: 'food' },
  Cafetería: { icon: CoffeeIcon, cover: 'from-amber-600 to-amber-900', chip: 'bg-amber-100 text-amber-800', photoKeyword: 'coffee' },
  Belleza: { icon: SparklesIcon, cover: 'from-pink-400 to-fuchsia-600', chip: 'bg-pink-100 text-pink-700', photoKeyword: 'manicure' },
  Educación: { icon: BookIcon, cover: 'from-sky-400 to-indigo-600', chip: 'bg-sky-100 text-sky-700', photoKeyword: 'books' },
  Panadería: { icon: BreadIcon, cover: 'from-yellow-400 to-orange-500', chip: 'bg-yellow-100 text-yellow-800', photoKeyword: 'bakery' },
  Alimentos: { icon: BasketIcon, cover: 'from-lime-500 to-emerald-700', chip: 'bg-lime-100 text-lime-800', photoKeyword: 'vegetables' },
  Farmacia: { icon: PillIcon, cover: 'from-red-400 to-rose-600', chip: 'bg-red-100 text-red-700', photoKeyword: 'pharmacy' },
  Mascotas: { icon: PawIcon, cover: 'from-violet-400 to-purple-600', chip: 'bg-violet-100 text-violet-700', photoKeyword: 'dog' },
  Lavandería: { icon: ShirtIcon, cover: 'from-cyan-400 to-blue-600', chip: 'bg-cyan-100 text-cyan-700', photoKeyword: 'laundry' },
  Postres: { icon: CakeIcon, cover: 'from-rose-300 to-pink-500', chip: 'bg-rose-100 text-rose-700', photoKeyword: 'dessert' },
  Tecnología: { icon: PhoneIcon, cover: 'from-zinc-600 to-zinc-900', chip: 'bg-zinc-100 text-zinc-700', photoKeyword: 'smartphone' },
  Floristería: { icon: FlowerIcon, cover: 'from-fuchsia-300 to-rose-500', chip: 'bg-fuchsia-100 text-fuchsia-700', photoKeyword: 'flowers' },
  Deportes: { icon: DumbbellIcon, cover: 'from-emerald-400 to-teal-700', chip: 'bg-emerald-100 text-emerald-700', photoKeyword: 'gym' },
  Mercado: { icon: CartIcon, cover: 'from-green-500 to-green-800', chip: 'bg-green-100 text-green-800', photoKeyword: 'grocery' },
};

const fallbackStyle: CategoryStyle = {
  icon: TagIcon,
  cover: 'from-teal-500 to-teal-700',
  chip: 'bg-teal-100 text-teal-700',
  photoKeyword: 'shop',
};

export const styleFor = (category: string): CategoryStyle => categoryStyles[category] ?? fallbackStyle;
