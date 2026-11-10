import { useId } from 'react';
import type { Business } from '../../api/businesses.ts';
import { strings } from '../../strings.ts';
import { BusinessTile } from './BusinessTile.tsx';

interface FeaturedSectionProps {
  /** Businesses with a store, already chosen by featuredBusinesses(). */
  businesses: readonly Business[];
  onOpen: (business: Business, trigger: HTMLElement) => void;
}

// "Visítalos en su tienda" as a horizontal row (spec 003 FR-6). Renders nothing for an empty list.
export function FeaturedSection({ businesses, onOpen }: FeaturedSectionProps) {
  const titleId = useId();

  if (businesses.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby={titleId} className="mt-2">
      <div className="mb-3 px-4">
        <h2 id={titleId} className="text-xl font-bold tracking-tight text-ink">
          {strings.featuredTitle}
        </h2>
        <p className="text-sm text-ink-muted">{strings.featuredSubtitle}</p>
      </div>
      {/* Vertical padding keeps the tiles' focus outline from being clipped by the scroll area. */}
      <ul className="flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
        {businesses.map((business) => (
          <li key={business.id} className="w-64 shrink-0 snap-start sm:w-72">
            <BusinessTile business={business} onOpen={(trigger) => onOpen(business, trigger)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
