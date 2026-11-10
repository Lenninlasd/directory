import type { ReactNode } from 'react';
import { strings } from '../../strings.ts';

interface DirectoryHeaderProps {
  /** The search field, only while the list is loaded and not empty (spec 003 AC-1.1, AC-1.3). */
  search: ReactNode;
}

// Sticky header with the page's main heading as plain text (AC-1.1, AC-1.4).
export function DirectoryHeader({ search }: DirectoryHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3">
        <h1 className="text-lg font-bold text-ink">{strings.directoryTitle}</h1>
        {search}
      </div>
    </header>
  );
}
