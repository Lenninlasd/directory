import { strings } from '../../strings.ts';
import { SearchIcon } from './icons.tsx';

// Shown in place of the featured section and the full list when nothing matches (spec 003 AC-7.5).
export function NoResults() {
  return (
    <div role="status" className="flex flex-col items-center gap-2 px-4 py-16 text-center">
      <SearchIcon className="size-10 text-ink-muted" />
      <p className="font-medium text-ink">{strings.noResultsTitle}</p>
      <p className="text-sm text-ink-muted">{strings.noResultsHint}</p>
    </div>
  );
}
