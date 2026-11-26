import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { CloseIcon } from '../../icons.tsx';
import { formatPrice, NO_CATEGORY, parsePriceInput, priceToInput } from '../format.ts';
import type { DraftProduct, ProductFields } from '../state.ts';
import type { Currency } from '../types.ts';

interface ProductEditorProps {
  /** null adds a new product. */
  product: DraftProduct | null;
  category: string | null;
  categories: string[];
  currency: Currency;
  onSave: (fields: ProductFields) => void;
  onDelete: () => void;
  onClose: () => void;
}

const inputClass = 'mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-base';
const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim());

// Bottom sheet on phones, centered on larger screens. Mounted only while open.
export function ProductEditor({ product, category, categories, currency, onSave, onDelete, onClose }: ProductEditorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listId = useId();
  const [name, setName] = useState(product?.name ?? '');
  const [variant, setVariant] = useState(product?.variant ?? '');
  const [price, setPrice] = useState(priceToInput(product?.price ?? null, currency));
  const [description, setDescription] = useState(product?.description ?? '');
  const [categoryText, setCategoryText] = useState(category ?? '');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) dialog.showModal();
    document.documentElement.classList.add('overflow-hidden');
    return () => document.documentElement.classList.remove('overflow-hidden');
  }, []);

  const parsedPrice = parsePriceInput(price, currency);
  const valid = name.trim() !== '' && parsedPrice !== undefined;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    onSave({
      name: name.trim(),
      variant: orNull(variant),
      price: parsedPrice,
      description: orNull(description),
      category: categoryText.trim() === NO_CATEGORY ? null : orNull(categoryText),
    });
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && dialogRef.current?.close()}
      aria-label={product === null ? 'Agregar producto' : 'Editar producto'}
      className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-black/50 sm:m-auto sm:rounded-3xl"
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{product === null ? 'Agregar producto' : 'Editar producto'}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Cerrar"
            className="grid size-11 place-items-center rounded-full hover:bg-stone-100"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        {product?.priceText && (
          <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm">
            El menú dice: <strong>«{product.priceText}»</strong>
          </p>
        )}

        <Field label="Precio" hint={priceHint(parsedPrice, currency)} invalid={parsedPrice === undefined}>
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            onFocus={(event) => event.target.select()}
            inputMode="decimal"
            autoFocus={product !== null}
            className={inputClass}
          />
        </Field>
        <Field label="Nombre">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus={product === null}
            className={inputClass}
          />
        </Field>
        <Field label="Tamaño o variante (opcional)">
          <input value={variant} onChange={(event) => setVariant(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Descripción (opcional)">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            className={inputClass}
          />
        </Field>
        <Field label="Categoría (opcional)">
          <input
            value={categoryText}
            onChange={(event) => setCategoryText(event.target.value)}
            list={listId}
            className={inputClass}
          />
          <datalist id={listId}>
            {categories.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </Field>

        <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-2 border-t border-border bg-white px-5 py-3">
          {product !== null && (
            <button type="button" onClick={onDelete} className="min-h-11 rounded-lg px-4 font-medium text-danger hover:bg-red-50">
              Borrar
            </button>
          )}
          <button
            type="submit"
            disabled={!valid}
            className="min-h-11 flex-1 rounded-lg bg-brand px-4 font-medium text-white disabled:bg-stone-300 disabled:text-stone-600"
          >
            Guardar
          </button>
        </div>
      </form>
    </dialog>
  );
}

function priceHint(price: number | null | undefined, currency: Currency): string {
  if (price === undefined) return currency === 'COP' ? 'Escríbelo en números, por ejemplo 8.000' : 'Por ejemplo 9,50';
  const label = price === null ? 'Vacío: se publica como «Precio a consultar»' : `Se publica como ${formatPrice(price, currency)}`;
  return currency === 'COP' && price !== null && price > 0 && price < 1000 ? `${label}. ¿Le faltan los miles?` : label;
}

function Field({ label, hint, invalid, children }: { label: string; hint?: string; invalid?: boolean; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
      {hint !== undefined && (
        <span className={`mt-1 block text-sm font-normal ${invalid ? 'text-danger' : 'text-ink-muted'}`}>{hint}</span>
      )}
    </label>
  );
}
