import { demoMenu } from './data/demoMenu.ts';
import { interpret } from './commands/simulate.ts';
import type { Catalog, CatalogProduct, Currency, ImportedProduct, Interpretation, MenuImport, MenuSummary } from './types.ts';

// Simulated: the only file that changes when store-api exists.

/** What catalog-lab/scripts/export_front.py writes. */
interface ExportedMenu {
  id: string;
  run: string;
  businessName: string;
  currency: Currency;
  source: { kind: 'pdf' | 'image'; file: string } | { kind: 'text'; text: string };
  products: ImportedProduct[];
  golden: CatalogProduct[] | null;
}

// data.local/ is in .gitignore. Without it both globs are empty and only the invented menu is left.
const exportedMenus = import.meta.glob<ExportedMenu>('./data.local/*.json', { import: 'default', eager: true });
const exportedFiles = import.meta.glob<string>('./data.local/menus/*', { query: '?url', import: 'default', eager: true });

const menus: MenuImport[] = [demoMenu, ...Object.values(exportedMenus).map(toMenuImport)];

function toMenuImport({ source, ...menu }: ExportedMenu): MenuImport {
  if (source.kind === 'text') return { ...menu, source };
  return { ...menu, source: { kind: source.kind, url: exportedFiles[`./data.local/menus/${source.file}`] ?? '' } };
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function fetchMenus(): Promise<MenuSummary[]> {
  return Promise.resolve(menus.map(({ id, businessName }) => ({ id, businessName })));
}

export async function fetchMenu(id: string): Promise<MenuImport> {
  await wait(150);
  const menu = menus.find((candidate) => candidate.id === id);
  if (menu === undefined) throw new Error(`Menu ${id} not found`);
  return menu;
}

/** In the real API the server reads the catalog: the page never sends it. */
export async function interpretMessage(message: string, catalog: Catalog): Promise<Interpretation> {
  await wait(900);
  return interpret(message, catalog, new Date());
}
