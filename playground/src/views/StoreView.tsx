import { useEffect, useReducer, useState } from 'react';
import { CatalogTab } from '../store/catalog/CatalogTab.tsx';
import { CommandsTab } from '../store/commands/CommandsTab.tsx';
import { useMenu, useMenus } from '../store/queries.ts';
import { ReviewTab } from '../store/review/ReviewTab.tsx';
import { reducer } from '../store/state.ts';
import { loadState, readItem, saveState, sessionKey, writeItem } from '../store/storage.ts';
import type { MenuImport } from '../store/types.ts';
import { strings } from '../strings.ts';

const TABS = [
  { id: 'review', label: 'Revisar' },
  { id: 'catalog', label: 'Catálogo' },
  { id: 'commands', label: 'Mensajes' },
] as const;
type TabId = (typeof TABS)[number]['id'];

// The store mock-up (docs/ideas/prompt-first-store.md): simulated data, no backend and no AI.
export function StoreView() {
  const [tab, setTabState] = useState<TabId>(() => TABS.find(({ id }) => id === readItem('tab'))?.id ?? 'review');
  const [chosenId, setChosenId] = useState(() => readItem('menu'));
  const menus = useMenus();
  // The menu of the last visit may be gone, since data.local/ is not in git.
  const menuId = menus.data?.find(({ id }) => id === chosenId)?.id ?? 'demo';
  const menu = useMenu(menuId);

  const setTab = (id: TabId) => {
    writeItem('tab', id);
    setTabState(id);
    window.scrollTo(0, 0);
  };

  const chooseMenu = (id: string) => {
    writeItem('menu', id);
    setChosenId(id);
  };

  return (
    <>
      <nav aria-label="Tienda" className="sticky top-12 z-10 flex h-[3.75rem] border-b border-border bg-white">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-current={id === tab ? 'page' : undefined}
            className={`flex-1 border-b-2 text-sm font-medium ${id === tab ? 'border-brand text-brand' : 'border-transparent text-ink-muted'}`}
          >
            {label}
          </button>
        ))}
      </nav>

      <label className="mx-auto flex max-w-6xl items-center gap-2 px-4 pt-3 text-sm text-ink-muted">
        Menú
        <select
          value={menuId}
          onChange={(event) => chooseMenu(event.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-white px-3 text-base text-ink sm:max-w-sm"
        >
          {menus.data?.map(({ id, businessName }) => (
            <option key={id} value={id}>
              {businessName}
            </option>
          ))}
        </select>
      </label>

      {menu.isPending ? (
        <p className="p-6 text-ink-muted">{strings.loading}</p>
      ) : menu.isError ? (
        <p className="p-6 text-danger">No pudimos cargar el menú.</p>
      ) : (
        <StoreSession key={sessionKey(menu.data)} menu={menu.data} tab={tab} onTab={setTab} />
      )}
    </>
  );
}

function StoreSession({ menu, tab, onTab }: { menu: MenuImport; tab: TabId; onTab: (id: TabId) => void }) {
  const [state, dispatch] = useReducer(reducer, menu, loadState);
  useEffect(() => saveState(menu, state), [menu, state]);

  switch (tab) {
    case 'review':
      return <ReviewTab menu={menu} state={state} dispatch={dispatch} onPublished={() => onTab('catalog')} />;
    case 'catalog':
      return <CatalogTab menu={menu} catalog={state.catalog} onReview={() => onTab('review')} />;
    case 'commands':
      return (
        <CommandsTab
          menu={menu}
          state={state}
          dispatch={dispatch}
          onReview={() => onTab('review')}
          onCatalog={() => onTab('catalog')}
        />
      );
  }
}
