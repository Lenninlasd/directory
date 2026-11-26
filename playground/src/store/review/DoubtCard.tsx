import { categoryLabel, formatPrice } from '../format.ts';
import type { DraftProduct } from '../state.ts';
import type { Currency, Doubt } from '../types.ts';

interface DoubtCardProps {
  product: DraftProduct;
  /** Products next to it in its category: what a half name can be joined to. */
  neighbors: DraftProduct[];
  currency: Currency;
  onEdit: () => void;
  onAccept: () => void;
  onJoin: (otherId: string) => void;
  onDelete: () => void;
}

const REASONS: Record<Doubt, string> = {
  missing_price: 'No encontramos el precio',
  half_name: 'Puede ser la mitad de un nombre',
  mismatch: 'El precio no coincide con el menú',
  unverified: 'No estamos seguros de este precio',
  unlikely: 'El precio parece raro',
  no_source: 'El menú no muestra este precio',
  no_currency: 'No sabemos en qué moneda está',
};

const secondary = 'min-h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium hover:bg-stone-50';
const primary = 'min-h-11 rounded-lg bg-brand px-3 text-sm font-medium text-white';

export function DoubtCard({ product, neighbors, currency, onEdit, onAccept, onJoin, onDelete }: DoubtCardProps) {
  const half = product.doubts.includes('half_name');

  return (
    <li className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">{product.doubts.map((doubt) => REASONS[doubt]).join('. ')}</p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className="min-w-0 font-medium break-words">
          {product.name}
          {product.variant !== null && <span className="text-ink-muted"> {product.variant}</span>}
        </p>
        <p className="shrink-0 font-semibold">{product.price === null ? 'Sin precio' : formatPrice(product.price, currency)}</p>
      </div>
      <p className="text-sm text-ink-muted">{categoryLabel(product.category)}</p>
      {product.priceText !== null && (
        <p className="mt-2 text-sm">
          El menú dice: <strong>«{product.priceText}»</strong>
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {half &&
          neighbors.map((neighbor) => (
            <button key={neighbor.id} onClick={() => onJoin(neighbor.id)} className={primary}>
              Unir con «{neighbor.name}»
            </button>
          ))}
        {!half && (
          <button onClick={onEdit} className={primary}>
            {product.price === null ? 'Poner precio' : 'Corregir'}
          </button>
        )}
        <button onClick={onAccept} className={secondary}>
          {product.price === null ? 'Dejar «a consultar»' : `Está bien: ${formatPrice(product.price, currency)}`}
        </button>
        {half && (
          <>
            <button onClick={onEdit} className={secondary}>
              Corregir
            </button>
            <button onClick={onDelete} className={`${secondary} text-danger`}>
              Borrar
            </button>
          </>
        )}
      </div>
    </li>
  );
}
