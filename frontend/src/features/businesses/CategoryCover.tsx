import type { ReactNode } from 'react';
import { appearanceFor } from './categoryAppearance.ts';
import { normalizeForMatching } from './directory.ts';

interface CategoryCoverProps {
  /** The business category as the API returns it. */
  category: string;
  /** Sizing classes, for example the aspect ratio. */
  className: string;
  /** Overlays such as the store type badge or the WhatsApp link. */
  children?: ReactNode;
}

// Gradient cover in the category colors with a large faded icon and a centered icon
// (spec 003 AC-5.1, AC-8.1). The icons are decorative; the category name is shown as text nearby.
export function CategoryCover({ category, className, children }: CategoryCoverProps) {
  const { icon: Icon, coverClass } = appearanceFor(normalizeForMatching(category));

  return (
    <div className={`relative overflow-hidden bg-linear-to-br ${coverClass} ${className}`}>
      <Icon className="absolute -right-4 -bottom-6 size-36 text-surface/20 motion-safe:transition-transform motion-safe:group-hover:scale-105" />
      <Icon className="absolute top-1/2 left-1/2 size-12 -translate-1/2 text-surface" />
      {children}
    </div>
  );
}
