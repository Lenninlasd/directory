import { strings } from '../../strings.ts';
import { BusinessCard } from './BusinessCard.tsx';
import { useBusinesses } from './useBusinesses.ts';

// Always renders one of loading, error, empty, or the list (spec 001 NFR-4).
export function BusinessList() {
  const { data, isPending, isError, refetch } = useBusinesses();

  if (isPending) {
    return (
      <p role="status" className="text-ink-muted">
        {strings.loading}
      </p>
    );
  }

  // Shows only the friendly message, never the error details (AC-6.4).
  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-danger">{strings.loadError}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="min-h-11 rounded-md bg-brand px-4 font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {strings.retry}
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="text-ink-muted">{strings.empty}</p>;
  }

  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map((business) => (
        <li key={business.id} className="min-w-0">
          <BusinessCard business={business} />
        </li>
      ))}
    </ul>
  );
}
