import { useMemo, useRef, useState } from 'react';
import { strings } from '../../strings.ts';
import { BusinessDetailDialog } from './BusinessDetailDialog.tsx';
import { BusinessResults } from './BusinessResults.tsx';
import { CategoryFilter } from './CategoryFilter.tsx';
import { DirectoryHeader } from './DirectoryHeader.tsx';
import { featuredBusinesses, filterBusinesses, listCategoryOptions, resolveSelectedCategory } from './directory.ts';
import { FeaturedSection } from './FeaturedSection.tsx';
import { SearchInput } from './SearchInput.tsx';
import { useBusinesses } from './useBusinesses.ts';

// The directory screen (plan 003 section 4). Holds only UI state; business data stays in the query
// cache (plan 003 D-2). Always renders loading, error, empty, or the content (spec 001 NFR-4).
export function Directory() {
  const { data, isPending, isError, refetch } = useBusinesses();
  const [searchText, setSearchText] = useState('');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [openBusinessId, setOpenBusinessId] = useState<string | null>(null);
  // The element that opened the dialog. Focus returns to it explicitly, since Safari does not
  // focus a button on click and the browser's own restore would miss it (plan 003 D-5).
  const openerRef = useRef<HTMLElement | null>(null);

  const categoryOptions = useMemo(() => listCategoryOptions(data ?? []), [data]);
  // Derived at render time, so a category that disappears after a reload falls back to "Todos" (AC-3.10).
  const categoryKey = resolveSelectedCategory(categoryOptions, selectedCategoryKey);
  const results = useMemo(
    () => filterBusinesses(data ?? [], { searchText, categoryKey }),
    [data, searchText, categoryKey],
  );
  const featured = useMemo(
    () => featuredBusinesses(data ?? [], { searchText, categoryKey }),
    [data, searchText, categoryKey],
  );
  const categoryLabel = categoryOptions.find((option) => option.key === categoryKey)?.label ?? null;
  const hasBusinesses = data !== undefined && data.length > 0;
  // Read from the query data, so a reload that removes the business closes the dialog (AC-8.7).
  const openBusiness = data?.find((business) => business.id === openBusinessId) ?? null;

  const openDetails = (businessId: string, opener: HTMLElement) => {
    openerRef.current = opener;
    setOpenBusinessId(businessId);
  };

  const closeDetails = () => {
    setOpenBusinessId(null);
    openerRef.current?.focus();
    openerRef.current = null;
  };

  let content;
  if (isPending) {
    content = (
      <p role="status" className="text-ink-muted">
        {strings.loading}
      </p>
    );
  } else if (isError) {
    // Shows only the friendly message, never the error details (spec 001 AC-6.4).
    content = (
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
  } else if (!hasBusinesses) {
    content = <p className="text-ink-muted">{strings.empty}</p>;
  }

  return (
    <>
      <DirectoryHeader search={hasBusinesses ? <SearchInput value={searchText} onChange={setSearchText} /> : null} />
      <main className="mx-auto max-w-5xl pb-10">
        {content !== undefined ? (
          <div className="p-4">{content}</div>
        ) : (
          <>
            <CategoryFilter options={categoryOptions} selectedKey={categoryKey} onSelect={setSelectedCategoryKey} />
            <FeaturedSection businesses={featured} onOpen={openDetails} />
            <BusinessResults businesses={results} categoryLabel={categoryLabel} onOpen={openDetails} />
          </>
        )}
      </main>
      <BusinessDetailDialog business={openBusiness} onClose={closeDetails} />
    </>
  );
}
