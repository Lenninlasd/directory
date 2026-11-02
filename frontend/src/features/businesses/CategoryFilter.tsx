import type { ComponentType } from 'react';
import { strings } from '../../strings.ts';
import { appearanceForCategory } from './categoryAppearance.ts';
import type { CategoryOption } from './directory.ts';
import { AllCategoriesIcon, type IconProps } from './icons.tsx';

interface CategoryFilterProps {
  options: readonly CategoryOption[];
  /** Selected category key, or null for "Todos". */
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
}

// "Todos" plus one option per category, single choice (spec 003 FR-3). Scrolls sideways on narrow
// screens (AC-3.9); labels wrap instead of being cut (AC-3.11).
export function CategoryFilter({ options, selectedKey, onSelect }: CategoryFilterProps) {
  return (
    <nav aria-label={strings.categoriesLabel}>
      <ul className="flex gap-3 overflow-x-auto px-4 py-4 [scrollbar-width:none]">
        <li>
          <CategoryFilterOption
            label={strings.allCategories}
            icon={AllCategoriesIcon}
            tintClass="bg-surface"
            iconClass="text-ink"
            pressed={selectedKey === null}
            onClick={() => onSelect(null)}
          />
        </li>
        {options.map((option) => {
          const appearance = appearanceForCategory(option.key);
          const pressed = option.key === selectedKey;
          return (
            <li key={option.key}>
              <CategoryFilterOption
                label={option.label}
                icon={appearance.icon}
                tintClass={appearance.tintClass}
                iconClass={appearance.iconOnTintClass}
                pressed={pressed}
                onClick={() => onSelect(pressed ? null : option.key)}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

interface CategoryFilterOptionProps {
  label: string;
  icon: ComponentType<IconProps>;
  tintClass: string;
  iconClass: string;
  pressed: boolean;
  onClick: () => void;
}

function CategoryFilterOption({ label, icon: OptionIcon, tintClass, iconClass, pressed, onClick }: CategoryFilterOptionProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="flex w-20 flex-col items-center gap-1.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <span
        className={`grid size-14 place-items-center rounded-2xl ${tintClass} ${pressed ? 'ring-2 ring-ink ring-offset-2' : ''}`}
      >
        <OptionIcon className={`size-7 ${iconClass}`} />
      </span>
      <span className={`w-full text-center text-xs break-words hyphens-auto ${pressed ? 'font-semibold text-ink' : 'text-ink-muted'}`}>
        {label}
      </span>
    </button>
  );
}
