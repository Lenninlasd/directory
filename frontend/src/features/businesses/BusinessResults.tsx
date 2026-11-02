import { useId } from 'react';
import type { Business } from '../../api/businesses.ts';
import { strings } from '../../strings.ts';
import { BusinessTile } from './BusinessTile.tsx';
import { NoResults } from './NoResults.tsx';

interface BusinessResultsProps {
  businesses: readonly Business[];
  /** Label of the selected category, or null for "Todos". */
  categoryLabel: string | null;
  onOpen: (businessId: string, trigger: HTMLElement) => void;
}

// Every matching business, with a title and an announced count (spec 003 FR-7).
export function BusinessResults({ businesses, categoryLabel, onOpen }: BusinessResultsProps) {
  const titleId = useId();

  if (businesses.length === 0) return <NoResults />;

  return (
    <section aria-labelledby={titleId} className="mt-6">
      <div className="mb-3 px-4">
        <h2 id={titleId} className="text-xl font-bold tracking-tight text-ink">
          {categoryLabel ?? strings.allBusinessesTitle}
        </h2>
        <p role="status" className="text-sm text-ink-muted">
          {strings.resultCount(businesses.length)}
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-6 px-4 sm:grid-cols-2 lg:grid-cols-3">
        {businesses.map((business) => (
          <li key={business.id} className="min-w-0">
            <BusinessTile business={business} onOpen={(trigger) => onOpen(business.id, trigger)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
