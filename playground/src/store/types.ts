// The shapes the future API (store-api) must answer with. Only api.ts knows that today they are simulated.

export type Currency = 'COP' | 'EUR';

/** Why code asks the owner to look at a product. The price ones are the warnings of catalog-lab (SCORE-7). */
export type Doubt =
  | 'missing_price'
  | 'half_name'
  | 'mismatch'
  | 'unverified'
  | 'unlikely'
  | 'no_source'
  | 'no_currency';

export interface ImportedProduct {
  id: string;
  /** The heading of the menu, "Bebidas / Frías" when nested. null under no heading. */
  category: string | null;
  name: string;
  variant: string | null;
  /** The price exactly as the menu writes it. */
  priceText: string | null;
  /** null is unknown. 0 is free. */
  price: number | null;
  description: string | null;
  doubts: Doubt[];
}

export type MenuSource = { kind: 'pdf' | 'image'; url: string } | { kind: 'text'; text: string };

export interface MenuSummary {
  id: string;
  businessName: string;
}

export interface MenuImport extends MenuSummary {
  /** Changes when the menu is imported again, so an old draft is not mixed with new products. */
  run: string;
  currency: Currency;
  source: MenuSource;
  products: ImportedProduct[];
  /** The same menu labelled by hand, to compare. null when there is none. */
  golden: CatalogProduct[] | null;
}

export interface CatalogProduct {
  id: string;
  category: string | null;
  name: string;
  variant: string | null;
  price: number | null;
  description: string | null;
  soldOut: boolean;
}

/** A "tanda": some units of a product for one date. Dates are ISO strings. */
export interface Drop {
  id: string;
  name: string;
  units: number;
  price: number;
  date: string;
  deadline: string;
  status: 'open' | 'closed';
}

export interface Catalog {
  products: CatalogProduct[];
  drops: Drop[];
}

export type Operation =
  | { type: 'set_price'; productId: string; price: number }
  | { type: 'set_sold_out'; productId: string; soldOut: boolean }
  | { type: 'create_drop'; drop: Drop }
  | { type: 'close_drop'; dropId: string };

export type Interpretation =
  | { status: 'proposal'; operations: Operation[]; assumptions: string[] }
  | { status: 'nothing_to_change'; reason: string }
  | { status: 'not_understood' };
