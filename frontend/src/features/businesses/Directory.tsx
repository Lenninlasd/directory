import { useEffect, useMemo, useRef, useState } from 'react';
import type { Business } from '../../api/businesses.ts';
import { strings } from '../../strings.ts';
import { isAdminMode } from './adminMode.ts';
import { BusinessDetailDialog } from './BusinessDetailDialog.tsx';
import { BusinessResults } from './BusinessResults.tsx';
import { CategoryFilter } from './CategoryFilter.tsx';
import { DirectoryHeader } from './DirectoryHeader.tsx';
import {
  featuredBusinesses,
  filterBusinesses,
  listCategoryOptions,
  resolveSelectedCategory,
} from './directory.ts';
import { FeaturedSection } from './FeaturedSection.tsx';
import { SearchInput } from './SearchInput.tsx';
import { useBusinesses } from './useBusinesses.ts';

const NO_BUSINESSES: readonly Business[] = [];

// The directory screen (spec 003 plan section 1). UI state holds only the search text, the selected
// category key, and the open business id; business data stays in the query cache (plan D-2).
export function Directory() {
  const { data, isPending, isError, refetch } = useBusinesses();
  const [searchText, setSearchText] = useState('');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [openBusinessId, setOpenBusinessId] = useState<string | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  // Read once: admin mode lasts as long as the page (business-editing spec, "Admin mode"; design D-13).
  const [adminMode] = useState(() => isAdminMode(window.location.search));

  const businesses = data ?? NO_BUSINESSES;
  const categoryOptions = useMemo(() => listCategoryOptions(businesses), [businesses]);
  // Derived at render time, so a reload that drops the category selects "Todos" (AC-3.10, plan D-3).
  const categoryKey = resolveSelectedCategory(categoryOptions, selectedCategoryKey);
  const results = useMemo(
    () => filterBusinesses(businesses, { searchText, categoryKey }),
    [businesses, searchText, categoryKey],
  );
  const featured = useMemo(
    () => featuredBusinesses(businesses, { searchText, categoryKey }),
    [businesses, searchText, categoryKey],
  );
  const categoryLabel = categoryOptions.find((option) => option.key === categoryKey)?.label ?? null;
  const hasBusinesses = !isPending && !isError && businesses.length > 0;

  // Read from the query data, so a reload that removes the business closes the dialog (AC-8.7).
  const openBusiness = businesses.find((business) => business.id === openBusinessId) ?? null;
  const isDialogOpen = openBusiness !== null;

  // The page behind the dialog does not scroll (AC-8.8); index.css keeps the scrollbar gutter (R-5).
  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }
    document.documentElement.classList.add('overflow-hidden');
    return () => document.documentElement.classList.remove('overflow-hidden');
  }, [isDialogOpen]);

  const handleOpen = (business: Business, trigger: HTMLElement) => {
    openerRef.current = trigger;
    setOpenBusinessId(business.id);
  };

  // Focus goes back to the tile explicitly, since Safari does not focus a button on click (plan D-5).
  const handleDialogClose = () => {
    setOpenBusinessId(null);
    openerRef.current?.focus();
    openerRef.current = null;
  };

  return (
    <>
      <DirectoryHeader search={hasBusinesses ? <SearchInput value={searchText} onChange={setSearchText} /> : null} />
      <main className="mx-auto max-w-5xl pb-10">
        {isPending ? (
          <div className="p-4">
            <p role="status" className="text-ink-muted">
              {strings.loading}
            </p>
          </div>
        ) : isError ? (
          // Shows only the friendly message, never the error details (spec 001 AC-6.4).
          <div className="p-4">
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
          </div>
        ) : businesses.length === 0 ? (
          <div className="p-4">
            <p className="text-ink-muted">{strings.empty}</p>
          </div>
        ) : (
          <>
            <CategoryFilter options={categoryOptions} selectedKey={categoryKey} onSelect={setSelectedCategoryKey} />
            {results.length > 0 && <FeaturedSection businesses={featured} onOpen={handleOpen} />}
            <BusinessResults businesses={results} categoryLabel={categoryLabel} onOpen={handleOpen} />
          </>
        )}
      </main>
      <BusinessDetailDialog business={openBusiness} onClose={handleDialogClose} adminMode={adminMode} />
    </>
  );
}
