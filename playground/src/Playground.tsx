import { useEffect, useState } from 'react';
import { useBusinesses } from './features/businesses/useBusinesses.ts';
import { strings } from './strings.ts';
import { CloseIcon, MenuIcon } from './icons.tsx';
import { withMockData } from './mockData.ts';
import { views } from './views/index.ts';

// The selected view lives in the URL hash (#cards, #compact, ...) so a reload keeps it.
function readViewId(): string {
  const id = window.location.hash.slice(1);
  return views.some((view) => view.id === id) ? id : views[0].id;
}

const MOCK_DATA_KEY = 'playground.mockData';

function readMockDataEnabled(): boolean {
  try {
    return localStorage.getItem(MOCK_DATA_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function Playground() {
  const [viewId, setViewId] = useState(readViewId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mockDataEnabled, setMockDataEnabled] = useState(readMockDataEnabled);
  const query = useBusinesses();

  useEffect(() => {
    const onHashChange = () => {
      setViewId(readViewId());
      setMenuOpen(false);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const toggleMockData = () => {
    const next = !mockDataEnabled;
    setMockDataEnabled(next);
    try {
      localStorage.setItem(MOCK_DATA_KEY, next ? 'on' : 'off');
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this session.
    }
  };

  const current = views.find((view) => view.id === viewId) ?? views[0];
  const View = current.component;

  return (
    <>
      <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b border-stone-200 bg-white/90 px-2 backdrop-blur">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú de vistas"
          aria-expanded={menuOpen}
          className="grid size-9 place-items-center rounded-full text-stone-700 hover:bg-stone-100"
        >
          <MenuIcon className="size-5" />
        </button>
        <span className="text-sm font-medium text-stone-800">{current.label}</span>
        <span className="ml-auto rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-amber-800 uppercase">
          Playground
        </span>
      </header>

      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-20 bg-black/40 transition-opacity ${menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <aside
        aria-label="Vistas"
        inert={!menuOpen}
        className={`fixed inset-y-0 left-0 z-30 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-12 items-center justify-between border-b border-stone-200 px-4">
          <span className="font-semibold text-stone-900">Vistas</span>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
            className="grid size-9 place-items-center rounded-full text-stone-700 hover:bg-stone-100"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto p-2">
          {views.map((view) => (
            <li key={view.id}>
              <a
                href={`#${view.id}`}
                onClick={() => setMenuOpen(false)}
                aria-current={view.id === viewId ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2.5 ${view.id === viewId ? 'bg-stone-900 text-white' : 'hover:bg-stone-100'}`}
              >
                <span className="block text-sm font-medium">{view.label}</span>
                <span className={`block text-xs ${view.id === viewId ? 'text-stone-300' : 'text-stone-500'}`}>
                  {view.description}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <label className="flex cursor-pointer items-start gap-3 border-t border-stone-200 p-4">
          <input
            type="checkbox"
            checked={mockDataEnabled}
            onChange={toggleMockData}
            className="mt-0.5 size-4 accent-stone-900"
          />
          <span>
            <span className="block text-sm font-medium text-stone-900">Datos de ejemplo</span>
            <span className="block text-xs text-stone-500">
              Agrega negocios ficticios en más categorías, y fotos, web y horario a todos.
            </span>
          </span>
        </label>
      </aside>

      {query.isPending ? (
        <p className="p-6 text-ink-muted">{strings.loading}</p>
      ) : query.isError ? (
        <div className="p-6 text-danger">
          <p>{strings.loadError}</p>
          <button className="mt-2 underline" onClick={() => void query.refetch()}>
            {strings.retry}
          </button>
        </div>
      ) : query.data.length === 0 ? (
        <p className="p-6 text-ink-muted">{strings.empty}</p>
      ) : (
        <View businesses={withMockData(query.data, mockDataEnabled)} />
      )}
    </>
  );
}
