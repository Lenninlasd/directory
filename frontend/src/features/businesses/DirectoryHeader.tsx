import type { ReactNode } from 'react';
import { strings } from '../../strings.ts';

interface DirectoryHeaderProps {
  /** The search field, or null while there is nothing to search (spec 003 AC-1.3). */
  search: ReactNode;
}

// Stays at the top while scrolling, above the tiles' stacked buttons (spec 003 AC-1.1).
export function DirectoryHeader({ search }: DirectoryHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3">
        <h1 className="text-lg font-bold tracking-tight text-ink">{strings.directoryTitle}</h1>
        {search}
      </div>
    </header>
  );
}
