import { applyOperations } from './commands/operations.ts';
import { categoryLabel } from './format.ts';
import type { Catalog, CatalogProduct, ImportedProduct, MenuImport, Operation } from './types.ts';

export interface DraftProduct extends ImportedProduct {
  /** The owner already looked at its doubts. */
  resolved: boolean;
}

export type ProductFields = Pick<ImportedProduct, 'category' | 'name' | 'variant' | 'price' | 'description'>;

interface Draft {
  products: DraftProduct[];
  /** Labels of the categories the owner said are right. */
  confirmed: string[];
  corrections: number;
}

export interface PublishSummary {
  products: number;
  corrections: number;
  seconds: number;
}

export interface ChangeRecord {
  id: number;
  message: string;
  before: Catalog;
}

export interface StoreState {
  started: boolean;
  draft: Draft;
  /** Earlier drafts, for undo. Not saved: a reload forgets them. */
  past: Draft[];
  publish: PublishSummary | null;
  catalog: Catalog | null;
  changes: ChangeRecord[];
  nextId: number;
}

export type StoreAction =
  | { type: 'start' }
  | { type: 'saveProduct'; id: string; fields: ProductFields }
  | { type: 'addProduct'; fields: ProductFields }
  | { type: 'deleteProduct'; id: string }
  | { type: 'resolve'; id: string }
  | { type: 'join'; halfId: string; otherId: string }
  | { type: 'renameCategory'; from: string; to: string }
  | { type: 'confirmCategory'; category: string; confirmed: boolean }
  | { type: 'undo' }
  | { type: 'publish'; seconds: number }
  | { type: 'applyChange'; message: string; operations: Operation[] }
  | { type: 'undoChange' }
  | { type: 'reset'; menu: MenuImport };

const MAX_UNDO = 30;

export const isPending = (product: DraftProduct): boolean => product.doubts.length > 0 && !product.resolved;

export function initialState(menu: MenuImport): StoreState {
  return {
    started: false,
    draft: { products: menu.products.map((product) => ({ ...product, resolved: false })), confirmed: [], corrections: 0 },
    past: [],
    publish: null,
    catalog: null,
    changes: [],
    nextId: 1,
  };
}

export function reducer(state: StoreState, action: StoreAction): StoreState {
  const { draft } = state;
  const edit = (change: Partial<Draft>): StoreState => ({
    ...state,
    draft: { ...draft, ...change },
    past: [...state.past, draft].slice(-MAX_UNDO),
  });
  const correct = (products: DraftProduct[], change: Partial<Draft> = {}): StoreState =>
    edit({ products, corrections: draft.corrections + 1, ...change });

  switch (action.type) {
    case 'start':
      return { ...state, started: true };

    case 'saveProduct':
      return correct(
        draft.products.map((product) =>
          product.id === action.id ? { ...product, ...action.fields, resolved: true } : product,
        ),
      );

    case 'addProduct': {
      const added: DraftProduct = { id: `new${state.nextId}`, priceText: null, doubts: [], resolved: true, ...action.fields };
      const last = draft.products.findLastIndex(({ category }) => category === added.category);
      const products = last === -1 ? [...draft.products, added] : draft.products.toSpliced(last + 1, 0, added);
      return { ...correct(products), nextId: state.nextId + 1 };
    }

    case 'deleteProduct':
      return correct(draft.products.filter(({ id }) => id !== action.id));

    case 'resolve':
      return edit({
        products: draft.products.map((product) => (product.id === action.id ? { ...product, resolved: true } : product)),
      });

    case 'join': {
      const pair = draft.products.filter(({ id }) => id === action.halfId || id === action.otherId);
      const name = pair.map((product) => product.name).join(' ');
      return correct(
        draft.products
          .filter(({ id }) => id !== action.halfId)
          .map((product) => (product.id === action.otherId ? { ...product, name } : product)),
      );
    }

    case 'renameCategory': {
      const to = action.to.trim();
      if (to === '' || to === action.from) return state;
      return correct(
        draft.products.map((product) =>
          categoryLabel(product.category) === action.from ? { ...product, category: to } : product,
        ),
        { confirmed: draft.confirmed.filter((category) => category !== action.from) },
      );
    }

    case 'confirmCategory': {
      const others = draft.confirmed.filter((category) => category !== action.category);
      return edit({ confirmed: action.confirmed ? [...others, action.category] : others });
    }

    case 'undo': {
      const previous = state.past.at(-1);
      return previous === undefined ? state : { ...state, draft: previous, past: state.past.slice(0, -1) };
    }

    case 'publish':
      if (draft.products.some(isPending)) return state;
      return publish(state, action.seconds);

    case 'applyChange':
      if (state.catalog === null) return state;
      return {
        ...state,
        catalog: applyOperations(action.operations, state.catalog),
        changes: [...state.changes, { id: state.nextId, message: action.message, before: state.catalog }],
        nextId: state.nextId + 1,
      };

    case 'undoChange': {
      const last = state.changes.at(-1);
      return last === undefined ? state : { ...state, catalog: last.before, changes: state.changes.slice(0, -1) };
    }

    case 'reset':
      return initialState(action.menu);
  }
}

function publish(state: StoreState, seconds: number): StoreState {
  const products = state.draft.products.map(toCatalogProduct);
  return {
    ...state,
    catalog: { products, drops: state.catalog?.drops ?? [] },
    changes: [],
    publish: { products: products.length, corrections: state.draft.corrections, seconds },
  };
}

function toCatalogProduct({ id, category, name, variant, price, description }: DraftProduct): CatalogProduct {
  return { id, category, name, variant, price, description, soldOut: false };
}
