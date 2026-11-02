import type { ReactNode } from 'react';
import { appearanceForCategory } from './categoryAppearance.ts';

interface CategoryCoverProps {
  category: string;
  /** Shape of the cover, for example aspect ratio and corner radius. */
  className: string;
  /** Overlays placed on the cover, such as the store type badge. */
  children?: ReactNode;
}

// Category gradient with a large faded icon and a centered icon (spec 003 AC-5.1, AC-8.1).
export function CategoryCover({ category, className, children }: CategoryCoverProps) {
  const { icon: CategoryIcon, coverClass } = appearanceForCategory(category);

  return (
    <div className={`relative overflow-hidden bg-linear-to-br ${coverClass} ${className}`}>
      <CategoryIcon className="absolute -right-4 -bottom-6 size-36 text-surface/20 motion-safe:transition-transform motion-safe:group-hover:scale-105" />
      <CategoryIcon className="absolute top-1/2 left-1/2 size-12 -translate-1/2 text-surface" />
      {children}
    </div>
  );
}
