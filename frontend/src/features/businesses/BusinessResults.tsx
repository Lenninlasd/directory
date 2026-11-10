import { useId } from 'react';
import type { Business } from '../../api/businesses.ts';
import { strings } from '../../strings.ts';
import { BusinessTile } from './BusinessTile.tsx';
import { NoResults } from './NoResults.tsx';

interface BusinessResultsProps {
  /** Businesses already filtered by filterBusinesses(), in API order. */
  businesses: readonly Business[];
  /** The selected category label, or null for "Todos". */
  categoryLabel: string | null;
  onOpen: (business: Business, trigger: HTMLElement) => void;
}

// The full list (spec 003 FR-7): title, a count that screen readers announce, and the tile grid.
export function BusinessResults({ businesses, categoryLabel, onOpen }: BusinessResultsProps) {
  const titleId = useId();

  if (businesses.length === 0) {
    return <NoResults />;
  }

  return (
    <section aria-labelledby={titleId} className="mt-6">
      <div className="mb-3 px-4">
        <h2 id={titleId} className="text-xl font-bold tracking-tight text-ink">
          {categoryLabel ?? strings.allBusinessesTitle}
        </h2>
        {/* role="status" is polite, so the count is announced after typing pauses (plan R-6). */}
        <p role="status" className="text-sm text-ink-muted">
          {strings.resultCount(businesses.length)}
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-6 px-4 sm:grid-cols-2 lg:grid-cols-3">
        {businesses.map((business) => (
          <li key={business.id} className="min-w-0">
            <BusinessTile business={business} onOpen={(trigger) => onOpen(business, trigger)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
