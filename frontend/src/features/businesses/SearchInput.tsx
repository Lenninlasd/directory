import { useRef } from 'react';
import { strings } from '../../strings.ts';
import { CloseIcon, SearchIcon } from './icons.tsx';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

// Controlled search field (spec 003 FR-2). Its own clear button replaces the browser's, which some
// browsers do not show (AC-2.5). The 16 px text keeps phones from zooming in on focus.
export function SearchInput({ value, onChange }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2 rounded-full bg-canvas pr-1 pl-4 focus-within:outline-2 focus-within:outline-ink">
      <SearchIcon className="size-5 shrink-0 text-ink-muted" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={strings.searchLabel}
        placeholder={strings.searchPlaceholder}
        className="min-h-11 w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value !== '' && (
        <button
          type="button"
          aria-label={strings.clearSearch}
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          className="grid size-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-border focus-visible:outline-2 focus-visible:outline-ink"
        >
          <CloseIcon className="size-4" />
        </button>
      )}
    </div>
  );
}
