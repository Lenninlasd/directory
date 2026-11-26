import { useMemo, useState, type Dispatch } from 'react';
import { categoryLabel, formatSeconds, groupBy } from '../format.ts';
import { isPending, type DraftProduct, type ProductFields, type StoreAction, type StoreState } from '../state.ts';
import { readSeconds, writeSeconds } from '../storage.ts';
import type { MenuImport } from '../types.ts';
import { CategorySection } from './CategorySection.tsx';
import { DoubtCard } from './DoubtCard.tsx';
import { OriginalMenuLink, OriginalMenuPane } from './OriginalMenu.tsx';
import { ProductEditor } from './ProductEditor.tsx';
import { ReviewTimer } from './ReviewTimer.tsx';

interface ReviewTabProps {
  menu: MenuImport;
  state: StoreState;
  dispatch: Dispatch<StoreAction>;
  onPublished: () => void;
}

/** What the editor is open for: a product, or a new one in a category. */
type Editing = { product: DraftProduct } | { product: null; category: string | null };

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

export function ReviewTab({ menu, state, dispatch, onPublished }: ReviewTabProps) {
  const { draft } = state;
  const [editing, setEditing] = useState<Editing | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [paused, setPaused] = useState(state.publish !== null);
  const [confirmingPublish, setConfirmingPublish] = useState(false);

  const groups = useMemo(() => groupBy(draft.products, ({ category }) => categoryLabel(category)), [draft.products]);
  const pending = draft.products.filter(isPending);
  const doubts = draft.products.filter(({ doubts }) => doubts.length > 0).length;
  const unchecked = groups.filter(([category]) => !draft.confirmed.includes(category)).length;

  // Here and not in reset: the timer saves its last second when it goes away, after the reset.
  const start = () => {
    writeSeconds(menu, 0);
    setPaused(false);
    dispatch({ type: 'start' });
  };

  if (!state.started) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-ink-muted">Leímos tu menú y encontramos</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{plural(draft.products.length, 'producto', 'productos')}</p>
          <p className="mt-1 text-ink-muted">en {plural(groups.length, 'categoría', 'categorías')}</p>
          <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${doubts > 0 ? 'bg-amber-50 text-amber-900' : 'bg-teal-50 text-teal-900'}`}>
            {doubts > 0 ? `Hay ${plural(doubts, 'duda', 'dudas')} por resolver` : 'No tenemos dudas, pero revisa los precios'}
          </p>
          <button
            onClick={start}
            className="mt-5 min-h-12 w-full rounded-lg bg-brand px-4 font-medium text-white"
          >
            Empezar a revisar
          </button>
          <p className="mt-2 text-sm text-ink-muted">Aquí empieza a contar el tiempo. Nada se publica hasta que lo confirmes.</p>
        </div>
      </div>
    );
  }

  const neighborsOf = (product: DraftProduct): DraftProduct[] => {
    const index = draft.products.indexOf(product);
    return [draft.products[index - 1], draft.products[index + 1]].filter(
      (other): other is DraftProduct => other !== undefined && other.category === product.category && other.price !== null,
    );
  };

  const confirmCategory = (category: string, confirmed: boolean) => {
    dispatch({ type: 'confirmCategory', category, confirmed });
    if (!confirmed) return;
    const next = groups.find(([other]) => other !== category && !draft.confirmed.includes(other))?.[0] ?? null;
    setOpenCategory(next);
    if (next === null) return;
    // After the sections change their height.
    requestAnimationFrame(() =>
      document.querySelector(`[data-category="${CSS.escape(next)}"]`)?.scrollIntoView({ block: 'start' }),
    );
  };

  const save = (fields: ProductFields) => {
    if (editing === null) return;
    dispatch(
      editing.product === null ? { type: 'addProduct', fields } : { type: 'saveProduct', id: editing.product.id, fields },
    );
    setEditing(null);
  };

  const remove = () => {
    if (editing?.product) dispatch({ type: 'deleteProduct', id: editing.product.id });
    setEditing(null);
  };

  const publish = () => {
    if (!confirmingPublish && (unchecked > 0 || state.changes.length > 0)) {
      setConfirmingPublish(true);
      return;
    }
    dispatch({ type: 'publish', seconds: readSeconds(menu) });
    onPublished();
  };

  const reset = () => {
    if (!window.confirm('Se borran las correcciones y lo publicado de este menú. ¿Continuar?')) return;
    dispatch({ type: 'reset', menu });
  };

  return (
    <div className="mx-auto max-w-6xl gap-6 p-4 pb-32 lg:grid lg:grid-cols-2">
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ReviewTimer menu={menu} running={!paused} onToggle={() => setPaused(!paused)} />
            <p className="text-sm text-ink-muted">{plural(draft.corrections, 'corrección', 'correcciones')}</p>
            <button onClick={reset} className="ml-auto min-h-11 rounded-lg px-3 text-sm text-ink-muted hover:bg-stone-200">
              Reiniciar
            </button>
          </div>
          {state.publish !== null && (
            <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">
              Publicaste {plural(state.publish.products, 'producto', 'productos')} en {formatSeconds(state.publish.seconds)}, con{' '}
              {plural(state.publish.corrections, 'corrección', 'correcciones')}.
            </p>
          )}
          <OriginalMenuLink source={menu.source} />
        </div>

        {doubts > 0 && (
          <section aria-label="Dudas">
            <h2 className="mb-2 font-semibold">
              {pending.length > 0 ? `Por resolver (${pending.length} de ${doubts})` : 'Resolviste todas las dudas ✓'}
            </h2>
            <ul className="space-y-3">
              {pending.map((product) => (
                <DoubtCard
                  key={product.id}
                  product={product}
                  neighbors={neighborsOf(product)}
                  currency={menu.currency}
                  onEdit={() => setEditing({ product })}
                  onAccept={() => dispatch({ type: 'resolve', id: product.id })}
                  onJoin={(otherId) => dispatch({ type: 'join', halfId: product.id, otherId })}
                  onDelete={() => dispatch({ type: 'deleteProduct', id: product.id })}
                />
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Categorías">
          <h2 className="mb-2 font-semibold">
            Categorías ({groups.length - unchecked} de {groups.length} revisadas)
          </h2>
          <div className="space-y-2">
            {groups.map(([category, products]) => (
              <CategorySection
                key={category}
                category={category}
                products={products}
                currency={menu.currency}
                confirmed={draft.confirmed.includes(category)}
                open={openCategory === category}
                onToggle={() => setOpenCategory(openCategory === category ? null : category)}
                onConfirm={(confirmed) => confirmCategory(category, confirmed)}
                onRename={(to) => {
                  dispatch({ type: 'renameCategory', from: category, to });
                  setOpenCategory(to.trim() || category);
                }}
                onEdit={(product) => setEditing({ product })}
                onAdd={() => setEditing({ product: null, category: products[0]?.category ?? null })}
              />
            ))}
          </div>
        </section>
      </div>

      <OriginalMenuPane source={menu.source} />

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-white/95 backdrop-blur">
        {confirmingPublish && (
          <p role="alert" className="mx-auto max-w-6xl px-4 pt-3 text-sm text-amber-900">
            {unchecked > 0 && `Te ${unchecked === 1 ? 'falta' : 'faltan'} ${plural(unchecked, 'categoría', 'categorías')} por mirar. `}
            {state.changes.length > 0 && 'Se reemplaza el catálogo publicado, con sus cambios por mensaje. '}
            Toca de nuevo para publicar.
          </p>
        )}
        <div className="mx-auto flex max-w-6xl gap-2 p-3">
          <button
            onClick={() => dispatch({ type: 'undo' })}
            disabled={state.past.length === 0}
            className="min-h-12 rounded-lg border border-stone-300 px-4 font-medium disabled:text-stone-400"
          >
            Deshacer
          </button>
          <button
            onClick={publish}
            disabled={pending.length > 0 || draft.products.length === 0}
            className="min-h-12 flex-1 rounded-lg bg-brand px-4 font-medium text-white disabled:bg-stone-300 disabled:text-stone-600"
          >
            {pending.length > 0
              ? `Publicar (${plural(pending.length, 'duda pendiente', 'dudas pendientes')})`
              : confirmingPublish
                ? 'Publicar de todos modos'
                : 'Publicar'}
          </button>
        </div>
      </div>

      {editing !== null && (
        <ProductEditor
          product={editing.product}
          category={editing.product === null ? editing.category : editing.product.category}
          categories={groups.map(([category]) => category)}
          currency={menu.currency}
          onSave={save}
          onDelete={remove}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
