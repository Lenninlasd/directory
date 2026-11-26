import { formatDay, formatDayAndHour, formatPrice } from '../format.ts';
import type { Catalog, CatalogProduct, Currency, Operation } from '../types.ts';

// The part that is code and not a model: the before and after, the checks, and the change itself.

export interface Change {
  title: string;
  before: string;
  after: string;
  /** Allowed, but the owner should look twice. */
  warning: string | null;
  /** Not allowed, so it cannot be confirmed. */
  error: string | null;
}

const LARGE_CHANGE = 0.3;

export const productTitle = ({ name, variant }: Pick<CatalogProduct, 'name' | 'variant'>): string =>
  variant === null ? name : `${name} ${variant}`;

export function describe(operation: Operation, catalog: Catalog, currency: Currency, now: Date): Change {
  const unknown: Change = { title: 'Operación', before: '', after: '', warning: null, error: 'Ya no existe en tu catálogo.' };
  switch (operation.type) {
    case 'set_price': {
      const product = catalog.products.find(({ id }) => id === operation.productId);
      if (product === undefined) return unknown;
      const ratio = product.price ? Math.abs(operation.price - product.price) / product.price : 0;
      return {
        title: productTitle(product),
        before: formatPrice(product.price, currency),
        after: formatPrice(operation.price, currency),
        warning: ratio > LARGE_CHANGE ? `Cambia un ${Math.round(ratio * 100)} %. ¿Es correcto?` : null,
        error: operation.price > 0 ? null : 'El precio debe ser mayor que cero.',
      };
    }
    case 'set_sold_out': {
      const product = catalog.products.find(({ id }) => id === operation.productId);
      if (product === undefined) return unknown;
      const label = (soldOut: boolean) => (soldOut ? 'Agotado' : 'Disponible');
      return {
        title: productTitle(product),
        before: label(product.soldOut),
        after: label(operation.soldOut),
        warning: product.soldOut === operation.soldOut ? 'Ya estaba así.' : null,
        error: null,
      };
    }
    case 'create_drop': {
      const { drop } = operation;
      const price = formatPrice(drop.price, currency);
      return {
        title: `Tanda: ${drop.name}`,
        before: 'No existe',
        after: `${drop.units} unidades a ${price}, para el ${formatDay(drop.date)}. Pedidos hasta el ${formatDayAndHour(drop.deadline)}`,
        warning: null,
        error:
          drop.units <= 0 ? 'Faltan las unidades.' : new Date(drop.deadline) <= now ? 'La fecha límite ya pasó.' : null,
      };
    }
    case 'close_drop': {
      const drop = catalog.drops.find(({ id }) => id === operation.dropId);
      if (drop === undefined) return unknown;
      return { title: `Tanda: ${drop.name}`, before: 'Recibe pedidos', after: 'Pedidos cerrados', warning: null, error: null };
    }
  }
}

export function applyOperations(operations: readonly Operation[], catalog: Catalog): Catalog {
  return operations.reduce(applyOperation, catalog);
}

function applyOperation(catalog: Catalog, operation: Operation): Catalog {
  const editProduct = (id: string, change: Partial<CatalogProduct>): Catalog => ({
    ...catalog,
    products: catalog.products.map((product) => (product.id === id ? { ...product, ...change } : product)),
  });
  switch (operation.type) {
    case 'set_price':
      return editProduct(operation.productId, { price: operation.price });
    case 'set_sold_out':
      return editProduct(operation.productId, { soldOut: operation.soldOut });
    case 'create_drop':
      return { ...catalog, drops: [operation.drop, ...catalog.drops] };
    case 'close_drop':
      return {
        ...catalog,
        drops: catalog.drops.map((drop) => (drop.id === operation.dropId ? { ...drop, status: 'closed' } : drop)),
      };
  }
}
