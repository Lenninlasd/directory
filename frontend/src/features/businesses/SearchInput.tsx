import { useRef } from 'react';
import { strings } from '../../strings.ts';
import { CloseIcon, SearchIcon } from './icons.tsx';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

// Controlled search field (spec 003 AC-2.5). It has its own clear button because some browsers
// show no built-in one, so the native control is hidden to avoid showing two.
export function SearchInput({ value, onChange }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2 rounded-full bg-canvas px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
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
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          aria-label={strings.clearSearchLabel}
          className="-mr-2 grid size-9 shrink-0 place-items-center rounded-full text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
        >
          <CloseIcon className="size-5" />
        </button>
      )}
    </div>
  );
}
