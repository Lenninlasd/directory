import { useEffect, useRef, useState, type Dispatch, type FormEvent } from 'react';
import { useInterpretMessage } from '../queries.ts';
import type { StoreAction, StoreState } from '../state.ts';
import type { Catalog, Currency, MenuImport, Operation } from '../types.ts';
import { describe } from './operations.ts';
import { EXAMPLES } from './simulate.ts';

interface CommandsTabProps {
  menu: MenuImport;
  state: StoreState;
  dispatch: Dispatch<StoreAction>;
  onReview: () => void;
  onCatalog: () => void;
}

export function CommandsTab({ menu, state, dispatch, onReview, onCatalog }: CommandsTabProps) {
  const [message, setMessage] = useState('');
  const interpretation = useInterpretMessage();
  const { catalog, changes } = state;

  if (catalog === null) {
    return (
      <div className="p-8 text-center">
        <p className="text-ink-muted">Primero publica este menú. Luego lo cambias con mensajes.</p>
        <button onClick={onReview} className="mt-4 min-h-11 rounded-lg bg-brand px-4 font-medium text-white">
          Ir a revisar
        </button>
      </div>
    );
  }

  const send = (text: string) => {
    setMessage(text);
    interpretation.mutate({ message: text, catalog });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (message.trim() !== '') send(message);
  };

  const apply = (operations: Operation[]) => {
    dispatch({ type: 'applyChange', message, operations });
    interpretation.reset();
    setMessage('');
  };

  const result = interpretation.data;
  const last = changes.at(-1);

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4">
      <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Simulación: no hay una IA. Solo entiende los cuatro ejemplos, pensados para el menú «Dulces de Ejemplo».
      </p>

      <form onSubmit={submit} className="space-y-3">
        <label className="block font-semibold">
          ¿Qué quieres cambiar?
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            placeholder="Escríbelo como se lo dirías a alguien"
            className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-base font-normal"
          />
        </label>
        <ul className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => send(example)}
                disabled={interpretation.isPending}
                className="min-h-11 rounded-2xl border border-stone-300 bg-white px-4 py-2 text-left text-sm"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="submit"
          disabled={message.trim() === '' || interpretation.isPending}
          className="min-h-12 w-full rounded-lg bg-brand px-4 font-medium text-white disabled:bg-stone-300 disabled:text-stone-600"
        >
          {interpretation.isPending ? 'Leyendo tu mensaje…' : 'Ver qué cambiaría'}
        </button>
      </form>

      <div aria-live="polite">
        {interpretation.isError && <p className="text-danger">No pudimos leer tu mensaje. Inténtalo de nuevo.</p>}
        {result?.status === 'not_understood' && (
          <p className="rounded-lg bg-stone-200 px-3 py-2 text-sm">Ese mensaje todavía no está simulado. Prueba un ejemplo.</p>
        )}
        {result?.status === 'nothing_to_change' && <p className="rounded-lg bg-stone-200 px-3 py-2 text-sm">{result.reason}</p>}
        {result?.status === 'proposal' && (
          <Proposal
            key={interpretation.submittedAt}
            operations={result.operations}
            assumptions={result.assumptions}
            catalog={catalog}
            currency={menu.currency}
            onConfirm={apply}
            onCancel={() => interpretation.reset()}
          />
        )}
      </div>

      {last !== undefined && !result && (
        <section aria-label="Cambios" className="rounded-xl border border-border bg-surface p-4">
          <h2 className="font-semibold">Cambios hechos ({changes.length})</h2>
          <ol className="mt-2 space-y-1 text-sm text-ink-muted">
            {changes.toReversed().map((change) => (
              <li key={change.id}>«{change.message}»</li>
            ))}
          </ol>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => dispatch({ type: 'undoChange' })}
              className="min-h-11 rounded-lg border border-stone-300 px-4 text-sm font-medium"
            >
              Deshacer el último
            </button>
            <button onClick={onCatalog} className="min-h-11 rounded-lg px-4 text-sm font-medium text-brand">
              Ver el catálogo
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

interface ProposalProps {
  operations: Operation[];
  assumptions: string[];
  catalog: Catalog;
  currency: Currency;
  onConfirm: (operations: Operation[]) => void;
  onCancel: () => void;
}

function Proposal({ operations, assumptions, catalog, currency, onConfirm, onCancel }: ProposalProps) {
  const [excluded, setExcluded] = useState<number[]>([]);
  const [now] = useState(() => new Date());
  const sectionRef = useRef<HTMLElement>(null);
  // On a phone it starts below the fold.
  useEffect(() => {
    // Braces matter: recent browsers return a promise, which React would take as the cleanup.
    void sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  const rows = operations.map((operation) => ({ operation, change: describe(operation, catalog, currency, now) }));
  const chosen = rows.filter(({ change }, index) => change.error === null && !excluded.includes(index));

  return (
    <section ref={sectionRef} aria-label="Propuesta" className="scroll-mt-32 rounded-2xl border-2 border-brand bg-surface p-4">
      <h2 className="font-semibold">Esto es lo que cambiaría</h2>
      <ul className="mt-3 space-y-3">
        {rows.map(({ change }, index) => (
          <li key={index} className="rounded-xl bg-stone-50 p-3">
            <label className="flex items-center gap-2 font-medium">
              {rows.length > 1 && (
                <input
                  type="checkbox"
                  checked={!excluded.includes(index)}
                  onChange={() =>
                    setExcluded(excluded.includes(index) ? excluded.filter((other) => other !== index) : [...excluded, index])
                  }
                  className="size-5 accent-teal-700"
                />
              )}
              {change.title}
            </label>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 text-sm">
              <dt className="text-ink-muted">Antes</dt>
              <dd className="text-ink-muted line-through">{change.before}</dd>
              <dt>Después</dt>
              <dd className="font-semibold">{change.after}</dd>
            </dl>
            {change.warning !== null && <p className="mt-1 text-sm text-amber-900">⚠ {change.warning}</p>}
            {change.error !== null && <p className="mt-1 text-sm text-danger">{change.error}</p>}
          </li>
        ))}
      </ul>
      {assumptions.map((assumption) => (
        <p key={assumption} className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {assumption}
        </p>
      ))}
      <div className="mt-4 flex gap-2">
        <button onClick={onCancel} className="min-h-12 rounded-lg border border-stone-300 px-4 font-medium">
          Cancelar
        </button>
        <button
          onClick={() => onConfirm(chosen.map(({ operation }) => operation))}
          disabled={chosen.length === 0}
          className="min-h-12 flex-1 rounded-lg bg-brand px-4 font-medium text-white disabled:bg-stone-300 disabled:text-stone-600"
        >
          Confirmar
        </button>
      </div>
    </section>
  );
}
