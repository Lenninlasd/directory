import { useState, type FormEvent } from 'react';
import { ChevronDownIcon } from '../../icons.tsx';
import { formatPrice } from '../format.ts';
import { isPending, type DraftProduct } from '../state.ts';
import type { Currency } from '../types.ts';

interface CategorySectionProps {
  category: string;
  products: DraftProduct[];
  currency: Currency;
  confirmed: boolean;
  open: boolean;
  onToggle: () => void;
  onConfirm: (confirmed: boolean) => void;
  onRename: (to: string) => void;
  onEdit: (product: DraftProduct) => void;
  onAdd: () => void;
}

const link = 'min-h-11 rounded-lg px-3 text-sm font-medium text-brand hover:bg-teal-50';

export function CategorySection(props: CategorySectionProps) {
  const { category, products, currency, confirmed, open, onToggle, onConfirm, onRename, onEdit, onAdd } = props;
  const [newName, setNewName] = useState<string | null>(null);

  const rename = (event: FormEvent) => {
    event.preventDefault();
    if (newName !== null) onRename(newName);
    setNewName(null);
  };

  return (
    <section data-category={category} className="scroll-mt-28 overflow-hidden rounded-xl border border-border bg-surface">
      <h3>
        <button onClick={onToggle} aria-expanded={open} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left">
          <span
            aria-hidden="true"
            className={`grid size-6 shrink-0 place-items-center rounded-full text-sm ${
              confirmed ? 'bg-brand text-white' : 'border border-stone-300 text-transparent'
            }`}
          >
            ✓
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium break-words">{category}</span>
            <span className="block text-sm text-ink-muted">
              {products.length} {products.length === 1 ? 'producto' : 'productos'}
              {confirmed && ' · revisada'}
            </span>
          </span>
          <ChevronDownIcon className={`size-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </h3>

      {open && (
        <div className="border-t border-border">
          <ul className="divide-y divide-stone-100">
            {products.map((product) => (
              <li key={product.id}>
                <button
                  onClick={() => onEdit(product)}
                  aria-label={`Editar ${product.name}`}
                  className="flex min-h-12 w-full items-baseline justify-between gap-3 px-4 py-2 text-left hover:bg-stone-50"
                >
                  <span className="min-w-0">
                    <span className="break-words">
                      {isPending(product) && <span className="mr-1.5 inline-block size-2 rounded-full bg-amber-500" />}
                      {product.name}
                      {product.variant !== null && <span className="text-ink-muted"> {product.variant}</span>}
                    </span>
                    {product.description !== null && (
                      <span className="block truncate text-sm text-ink-muted">{product.description}</span>
                    )}
                  </span>
                  <span className={`shrink-0 tabular-nums ${product.price === null ? 'text-sm text-ink-muted' : 'font-medium'}`}>
                    {formatPrice(product.price, currency)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-1 border-t border-border p-2">
            {newName === null ? (
              <>
                <button onClick={onAdd} className={link}>
                  Agregar
                </button>
                <button onClick={() => setNewName(category)} className={link}>
                  Renombrar
                </button>
                <button
                  onClick={() => onConfirm(!confirmed)}
                  className={`ml-auto min-h-11 rounded-lg px-4 text-sm font-medium ${
                    confirmed ? 'border border-stone-300' : 'bg-brand text-white'
                  }`}
                >
                  {confirmed ? 'Volver a revisar' : 'Está bien'}
                </button>
              </>
            ) : (
              <form onSubmit={rename} className="flex w-full gap-2">
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  aria-label="Nuevo nombre de la categoría"
                  autoFocus
                  className="min-w-0 flex-1 rounded-lg border border-border px-3 text-base"
                />
                <button type="submit" className="min-h-11 rounded-lg bg-brand px-4 text-sm font-medium text-white">
                  Guardar
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
