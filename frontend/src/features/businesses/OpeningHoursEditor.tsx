import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { Business } from '../../api/businesses.ts';
import { UnauthorizedError } from '../../api/openingHours.ts';
import { strings } from '../../strings.ts';
import { clearAdminKey, getAdminKey, setAdminKey } from './adminKey.ts';
import { SparkleIcon } from './icons.tsx';
import { changedDays, formatDayList, formatOpeningHours } from './openingHours.ts';
import { useInterpretOpeningHours, useSaveOpeningHours } from './useOpeningHoursMutations.ts';

type EditorAction = 'interpret' | 'save';

interface OpeningHoursEditorProps {
  /** The business being edited; its `openingHours` are the stored week the proposal is compared with. */
  business: Business;
  /** "Cancelar": closes the panel without storing anything. */
  onCancel: () => void;
  /** Called after the week was stored and the list was loaded again. */
  onSaved: () => void;
}

const BUTTON = 'min-h-11 rounded-md px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50';
const PRIMARY_BUTTON = `${BUTTON} bg-brand text-surface`;
const SECONDARY_BUTTON = `${BUTTON} border border-border bg-surface text-ink`;

const isUnauthorized = (error: unknown) => error instanceof UnauthorizedError;

/**
 * The panel of the business-editing spec, "Opening hours edit flow" (design D-14). It holds only UI
 * state: the request text, the key field, and the action waiting for a key. The proposal and the
 * loading and error states come from the two mutations, so no server data is copied (AGENTS.md).
 */
export function OpeningHoursEditor({ business, onCancel, onSaved }: OpeningHoursEditorProps) {
  const requestFieldId = useId();
  const keyFieldId = useId();
  const [requestText, setRequestText] = useState('');
  const [keyText, setKeyText] = useState('');
  // Shows the key step when not null: the action to run once the key is entered.
  const [actionAwaitingKey, setActionAwaitingKey] = useState<EditorAction | null>(null);
  const [keyRejected, setKeyRejected] = useState(false);
  const interpretation = useInterpretOpeningHours();
  const saving = useSaveOpeningHours();

  const proposal = interpretation.data?.understood === true ? interpretation.data.openingHours : null;
  const proposalChanges = proposal === null ? [] : changedDays(business.openingHours, proposal);
  const isBusy = interpretation.isPending || saving.isPending;

  // Disabled controls lose the focus, so when an answer arrives it goes back to the text box, or to
  // the key field when the key step is shown (business-editing spec, "Announced to screen readers").
  const requestFieldRef = useRef<HTMLTextAreaElement>(null);
  const keyFieldRef = useRef<HTMLInputElement>(null);
  const wasBusyRef = useRef(false);
  useEffect(() => {
    if (wasBusyRef.current && !isBusy) {
      (keyFieldRef.current ?? requestFieldRef.current)?.focus();
    }
    wasBusyRef.current = isBusy;
  }, [isBusy]);

  /** A `401` forgets the kept key and asks for a new one, keeping the text and the proposal. */
  const askForKeyAgain = (action: EditorAction) => (error: unknown) => {
    if (isUnauthorized(error)) {
      clearAdminKey();
      setKeyRejected(true);
      setActionAwaitingKey(action);
    }
  };

  const run = (action: EditorAction, adminKey: string) => {
    if (action === 'interpret') {
      interpretation.mutate(
        { businessId: business.id, request: requestText, adminKey },
        { onError: askForKeyAgain('interpret') },
      );
    } else if (proposal !== null) {
      saving.mutate(
        { businessId: business.id, openingHours: proposal, adminKey },
        { onSuccess: onSaved, onError: askForKeyAgain('save') },
      );
    }
  };

  const start = (action: EditorAction) => {
    const adminKey = getAdminKey();
    if (adminKey === null) {
      setKeyRejected(false);
      setActionAwaitingKey(action);
      return;
    }
    run(action, adminKey);
  };

  const submitKey = (event: FormEvent) => {
    event.preventDefault();
    if (actionAwaitingKey === null || keyText === '') {
      return;
    }
    // Kept for the tab. If the storage is blocked, the key is still used for this request.
    setAdminKey(keyText);
    setActionAwaitingKey(null);
    setKeyRejected(false);
    setKeyText('');
    run(actionAwaitingKey, keyText);
  };

  // A new text makes the proposal and any message stale, so they are cleared.
  const changeRequestText = (text: string) => {
    setRequestText(text);
    if (!interpretation.isIdle) {
      interpretation.reset();
    }
    if (!saving.isIdle) {
      saving.reset();
    }
  };

  const statusText = (): string => {
    if (interpretation.isPending) {
      return strings.interpreting;
    }
    if (saving.isPending) {
      return strings.saving;
    }
    if (keyRejected && actionAwaitingKey !== null) {
      return strings.wrongAdminKey;
    }
    if (saving.isError && !isUnauthorized(saving.error)) {
      return strings.saveError;
    }
    if (interpretation.isError && !isUnauthorized(interpretation.error)) {
      return strings.interpretationError;
    }
    if (interpretation.data?.understood === false) {
      return strings.notUnderstood;
    }
    if (proposal !== null) {
      return proposalChanges.length === 0
        ? strings.noChanges
        : strings.changedDays(formatDayList(proposalChanges));
    }
    return '';
  };

  const proposalLines = proposal === null ? [] : formatOpeningHours(proposal);

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex flex-col gap-1">
        <label htmlFor={requestFieldId} className="font-medium text-ink">
          {strings.openingHoursRequestLabel}
        </label>
        {/*
          The AI border: a gradient behind 2 px of padding that turns only while interpreting (design D-18).
          The text box radius is the wrapper's minus that padding, so the border is 2 px wide at the corners too.
        */}
        <div
          data-interpreting={interpretation.isPending ? '' : undefined}
          className="relative rounded-xl bg-ai-border p-0.5 motion-safe:data-interpreting:animate-ai-border-spin"
        >
          <textarea
            ref={requestFieldRef}
            id={requestFieldId}
            value={requestText}
            onChange={(event) => changeRequestText(event.target.value)}
            maxLength={300}
            placeholder={strings.openingHoursRequestPlaceholder}
            disabled={isBusy}
            autoFocus
            className="block max-h-36 min-h-16 w-full resize-none overflow-y-auto rounded-[calc(var(--radius-xl)-2px)] bg-surface p-3 pr-9 text-ink field-sizing-content placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:opacity-70"
          />
          <SparkleIcon className="pointer-events-none absolute top-3 right-3 size-5 text-ai-to" />
        </div>
      </div>

      {actionAwaitingKey !== null && (
        <form onSubmit={submitKey} className="flex flex-col gap-1">
          <label htmlFor={keyFieldId} className="font-medium text-ink">
            {strings.adminKeyLabel}
          </label>
          <div className="flex gap-2">
            <input
              ref={keyFieldRef}
              id={keyFieldId}
              type="password"
              autoComplete="off"
              value={keyText}
              onChange={(event) => setKeyText(event.target.value)}
              autoFocus
              className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            />
            <button type="submit" disabled={keyText === ''} className={PRIMARY_BUTTON}>
              {strings.adminKeyContinue}
            </button>
          </div>
        </form>
      )}

      {proposal !== null && (
        <div className="flex flex-col gap-1">
          <p className="font-medium text-ink">{strings.proposalTitle}</p>
          {proposalLines.length === 0 ? (
            <p className="text-ink-muted">{strings.noOpeningHours}</p>
          ) : (
            <ul className="text-ink-muted">
              {proposalLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Always rendered, so screen readers announce each new text (business-editing spec). */}
      <p role="status" className="text-ink empty:hidden">
        {statusText()}
      </p>

      <div className="flex flex-wrap gap-2">
        {actionAwaitingKey === null &&
          (proposal === null ? (
            <button
              type="button"
              onClick={() => start('interpret')}
              disabled={isBusy || requestText.trim() === ''}
              className={PRIMARY_BUTTON}
            >
              {strings.reviewChange}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => start('save')}
              disabled={isBusy || proposalChanges.length === 0}
              className={PRIMARY_BUTTON}
            >
              {strings.save}
            </button>
          ))}
        <button type="button" onClick={onCancel} disabled={isBusy} className={SECONDARY_BUTTON}>
          {strings.cancel}
        </button>
      </div>
    </div>
  );
}
