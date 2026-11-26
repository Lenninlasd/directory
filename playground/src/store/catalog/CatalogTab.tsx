import { useState } from 'react';
import { categoryLabel, formatPrice, groupBy, normalize } from '../format.ts';
import type { Catalog, CatalogProduct, MenuImport } from '../types.ts';
import { productTitle } from '../commands/operations.ts';
import { DropCard } from './DropCard.tsx';
import { orderUrl } from './order.ts';

interface CatalogTabProps {
  menu: MenuImport;
  catalog: Catalog | null;
  onReview: () => void;
}

export function CatalogTab({ menu, catalog, onReview }: CatalogTabProps) {
  const [version, setVersion] = useState<'published' | 'golden'>('published');
  const shown = version === 'golden' && menu.golden !== null ? { products: menu.golden, drops: [] } : catalog;

  return (
    <>
      {menu.golden !== null && (
        <div className="border-b border-dashed border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <label className="mx-auto flex max-w-2xl items-center gap-2">
            Comparar (no lo ve el cliente):
            <select
              value={version}
              onChange={(event) => setVersion(event.target.value === 'golden' ? 'golden' : 'published')}
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-2 text-base"
            >
              <option value="published">Lo que publicaste</option>
              <option value="golden">Corregido a mano (golden)</option>
            </select>
          </label>
        </div>
      )}
      {shown === null ? (
        <div className="p-8 text-center">
          <p className="text-ink-muted">Todavía no has publicado este menú.</p>
          <button onClick={onReview} className="mt-4 min-h-11 rounded-lg bg-brand px-4 font-medium text-white">
            Ir a revisar
          </button>
        </div>
      ) : (
        <PublicCatalog key={version} menu={menu} catalog={shown} />
      )}
    </>
  );
}

function PublicCatalog({ menu, catalog }: { menu: MenuImport; catalog: Catalog }) {
  const [units, setUnits] = useState<Record<string, number>>({});

  // "Bebidas / Frías" and "Bebidas / Calientes" are two parts of the same section.
  const sections = groupBy(catalog.products, ({ category }) => categoryLabel(category).split(' / ')[0] ?? '');
  const lines = catalog.products
    .filter(({ id, soldOut }) => (units[id] ?? 0) > 0 && !soldOut)
    .map((product) => ({ product, units: units[product.id] ?? 0 }));
  const count = lines.reduce((total, line) => total + line.units, 0);
  const total = lines.reduce((sum, line) => sum + line.units * (line.product.price ?? 0), 0);
  const hasUnpriced = lines.some(({ product }) => product.price === null);
  const change = (id: string, by: number) => setUnits({ ...units, [id]: Math.max(0, (units[id] ?? 0) + by) });

  return (
    <div className="pb-28">
      <header className="mx-auto max-w-2xl px-4 pt-6 pb-3">
        <h1 className="text-2xl font-bold tracking-tight break-words">{menu.businessName}</h1>
      </header>

      {catalog.drops.length > 0 && (
        <section aria-label="Tandas" className="mx-auto max-w-2xl space-y-3 px-4 pb-4">
          {catalog.drops.map((drop) => (
            <DropCard key={drop.id} drop={drop} businessName={menu.businessName} currency={menu.currency} />
          ))}
        </section>
      )}

      {sections.length > 1 && (
        <nav aria-label="Categorías" className="sticky top-[6.75rem] z-[5] border-y border-border bg-canvas/95 backdrop-blur">
          <ul className="mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 py-2">
            {sections.map(([section], index) => (
              <li key={section} className="shrink-0">
                <button
                  onClick={() => document.getElementById(`section-${index}`)?.scrollIntoView({ behavior: 'smooth' })}
                  className="min-h-11 rounded-full border border-stone-300 bg-white px-4 text-sm font-medium whitespace-nowrap"
                >
                  {section}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="mx-auto max-w-2xl px-4">
        {sections.map(([section, products], index) => (
          <section key={section} id={`section-${index}`} className="scroll-mt-44 pt-6">
            <h2 className="text-xl font-semibold break-words">{section}</h2>
            {groupBy(products, ({ category }) => categoryLabel(category).split(' / ').slice(1).join(' / ')).map(
              ([part, partProducts]) => (
                <div key={part} className="mt-3">
                  {part !== '' && <h3 className="mb-2 text-sm font-semibold text-ink-muted">{part}</h3>}
                  <ul className="divide-y divide-stone-100 rounded-xl border border-border bg-surface">
                    {/* The sizes of a product share its name. */}
                    {groupBy(partProducts, ({ name }) => normalize(name)).map(([name, variants]) => (
                      <ProductCard
                        key={name}
                        variants={variants}
                        menu={menu}
                        units={units}
                        onChange={change}
                      />
                    ))}
                  </ul>
                </div>
              ),
            )}
          </section>
        ))}
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-white/95 p-3 backdrop-blur">
          <a
            href={orderUrl(
              menu.businessName,
              lines.map((line) => ({ title: productTitle(line.product), units: line.units })),
            )}
            target="_blank"
            rel="noreferrer"
            className="mx-auto flex min-h-12 max-w-2xl items-center justify-between gap-3 rounded-lg bg-whatsapp px-4 font-medium text-white"
          >
            <span>Pedir por WhatsApp ({count})</span>
            <span className="text-right tabular-nums">
              {total > 0 || !hasUnpriced ? formatPrice(total, menu.currency) : ''}
              {hasUnpriced && <span className="block text-xs font-normal">{total > 0 ? '+ lo que falta consultar' : 'Precio a consultar'}</span>}
            </span>
          </a>
        </div>
      )}
    </div>
  );
}

interface ProductCardProps {
  variants: CatalogProduct[];
  menu: MenuImport;
  units: Record<string, number>;
  onChange: (id: string, by: number) => void;
}

function ProductCard({ variants, menu, units, onChange }: ProductCardProps) {
  const [first] = variants;
  if (first === undefined) return null;
  const single = variants.length === 1;
  const description = variants.every((variant) => variant.description === first.description) ? first.description : null;

  return (
    <li className="px-4 py-3">
      {!single && <p className="font-medium break-words">{first.name}</p>}
      {variants.map((variant) => (
        <div key={variant.id} className={`flex items-center gap-3 ${single ? '' : 'mt-1'} ${variant.soldOut ? 'opacity-60' : ''}`}>
          <div className="min-w-0 flex-1">
            <p className={`break-words ${single ? 'font-medium' : 'text-sm'}`}>
              {single ? variant.name : (variant.variant ?? (description === null ? variant.description : null) ?? variant.name)}
              {single && variant.variant !== null && <span className="font-normal text-ink-muted"> {variant.variant}</span>}
            </p>
            {single && description !== null && <p className="text-sm text-ink-muted">{description}</p>}
            <p className={`text-sm tabular-nums ${variant.price === null ? 'text-ink-muted' : 'font-semibold'}`}>
              {formatPrice(variant.price, menu.currency)}
            </p>
          </div>
          {variant.soldOut ? (
            <span className="shrink-0 rounded-full bg-stone-200 px-3 py-1 text-sm font-medium">Agotado</span>
          ) : (
            <Stepper
              label={productTitle(variant)}
              units={units[variant.id] ?? 0}
              onChange={(by) => onChange(variant.id, by)}
            />
          )}
        </div>
      ))}
      {!single && description !== null && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
    </li>
  );
}

function Stepper({ label, units, onChange }: { label: string; units: number; onChange: (by: number) => void }) {
  const button = 'grid size-11 place-items-center rounded-full border border-stone-300 bg-white text-xl leading-none';
  return (
    <div className="flex shrink-0 items-center gap-1">
      {units > 0 && (
        <>
          <button onClick={() => onChange(-1)} aria-label={`Quitar ${label}`} className={button}>
            −
          </button>
          <span className="w-7 text-center font-medium tabular-nums">{units}</span>
        </>
      )}
      <button onClick={() => onChange(1)} aria-label={`Agregar ${label}`} className={button}>
        +
      </button>
    </div>
  );
}
