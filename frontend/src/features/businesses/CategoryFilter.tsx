import { strings } from '../../strings.ts';
import { appearanceFor } from './categoryAppearance.ts';
import type { CategoryOption } from './directory.ts';
import { AllCategoriesIcon, type IconComponent } from './icons.tsx';

interface CategoryFilterProps {
  options: readonly CategoryOption[];
  /** The selected option key, or null for "Todos". */
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
}

// Controlled category filter (spec 003 AC-3.3 to AC-3.9, AC-3.11). Options scroll sideways
// on narrow screens, and labels wrap instead of being cut.
export function CategoryFilter({ options, selectedKey, onSelect }: CategoryFilterProps) {
  return (
    <nav aria-label={strings.categoryFilterLabel}>
      <ul className="flex gap-3 overflow-x-auto px-4 py-4 [scrollbar-width:none]">
        <li className="shrink-0">
          <CategoryOptionButton
            label={strings.allCategories}
            icon={AllCategoriesIcon}
            tintClass="bg-canvas"
            iconClass="text-ink"
            selected={selectedKey === null}
            onClick={() => onSelect(null)}
          />
        </li>
        {options.map((option) => {
          const appearance = appearanceFor(option.key);
          const selected = option.key === selectedKey;
          return (
            <li key={option.key} className="shrink-0">
              <CategoryOptionButton
                label={option.label}
                icon={appearance.icon}
                tintClass={appearance.tintClass}
                iconClass={appearance.iconOnTintClass}
                selected={selected}
                onClick={() => onSelect(selected ? null : option.key)}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

interface CategoryOptionButtonProps {
  label: string;
  icon: IconComponent;
  tintClass: string;
  iconClass: string;
  selected: boolean;
  onClick: () => void;
}

function CategoryOptionButton({ label, icon: Icon, tintClass, iconClass, selected, onClick }: CategoryOptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="group flex w-18 flex-col items-center gap-1.5 rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-ink"
    >
      <span
        className={`grid size-14 place-items-center rounded-2xl ${tintClass} ${
          selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''
        }`}
      >
        <Icon className={`size-7 ${iconClass}`} />
      </span>
      <span className={`text-center text-xs leading-tight break-words ${selected ? 'font-semibold text-ink' : 'text-ink-muted'}`}>
        {label}
      </span>
    </button>
  );
}
