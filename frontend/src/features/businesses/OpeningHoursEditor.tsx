import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { Business } from '../../api/businesses.ts';
import { UnauthorizedError } from '../../api/openingHours.ts';
import { strings } from '../../strings.ts';
import { AdminKeyDialog } from './AdminKeyDialog.tsx';
import { clearAdminKey, getAdminKey, setAdminKey } from './adminKey.ts';
import { CloseIcon, SparkleIcon } from './icons.tsx';
import { changedDays, formatDayList, formatOpeningHours } from './openingHours.ts';
import { useInterpretOpeningHours, useSaveOpeningHours } from './useOpeningHoursMutations.ts';

type EditorAction = 'interpret' | 'save';

interface OpeningHoursEditorProps {
  /** The business being edited; its `openingHours` are the stored week the proposal is compared with. */
  business: Business;
  /** The close button: closes the panel without storing anything. */
  onCancel: () => void;
  /** Called after the week was stored and the list was loaded again. */
  onSaved: () => void;
}

const isUnauthorized = (error: unknown) => error instanceof UnauthorizedError;

/**
 * The panel of the business-editing spec, "Opening hours edit flow" (design D-14). It holds only UI
 * state: the request text, and the action waiting for a key after a `401`. The proposal and the
 * loading and error states come from the two mutations, so no server data is copied (AGENTS.md).
 */
export function OpeningHoursEditor({ business, onCancel, onSaved }: OpeningHoursEditorProps) {
  const requestFieldId = useId();
  const [requestText, setRequestText] = useState('');
  // Opens the key dialog when not null: the action to run again once a key is entered (design D-19).
  const [actionAwaitingKey, setActionAwaitingKey] = useState<EditorAction | null>(null);
  const [keyRejected, setKeyRejected] = useState(false);
  const interpretation = useInterpretOpeningHours();
  const saving = useSaveOpeningHours();

  const proposal = interpretation.data?.understood === true ? interpretation.data.openingHours : null;
  const proposalChanges = proposal === null ? [] : changedDays(business.openingHours, proposal);
  const isBusy = interpretation.isPending || saving.isPending;

  // A disabled text box loses the focus, so it gets it back when an answer arrives, unless the key
  // dialog is taking it (business-editing spec, "Announced to screen readers").
  const requestFieldRef = useRef<HTMLTextAreaElement>(null);
  const wasBusyRef = useRef(false);
  useEffect(() => {
    if (wasBusyRef.current && !isBusy && actionAwaitingKey === null) {
      requestFieldRef.current?.focus();
    }
    wasBusyRef.current = isBusy;
  }, [isBusy, actionAwaitingKey]);

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
      // No key is kept, for example when the browser blocks the storage: ask for it.
      setKeyRejected(false);
      setActionAwaitingKey(action);
      return;
    }
    run(action, adminKey);
  };

  const submitKey = (adminKey: string) => {
    // Kept for the tab. If the storage is blocked, the key is still used for this request.
    setAdminKey(adminKey);
    const action = actionAwaitingKey;
    setActionAwaitingKey(null);
    if (action !== null) {
      run(action, adminKey);
    }
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

  // Enter sends the request and Shift+Enter adds a line break (design D-20). Enter does nothing
  // while composing text, with an empty text, or while the proposal for this text is shown.
  const sendOnEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    if (requestText.trim() !== '' && proposal === null && !isBusy) {
      start('interpret');
    }
  };

  const statusText = (): string => {
    if (interpretation.isPending) {
      return strings.interpreting;
    }
    if (saving.isPending) {
      return strings.saving;
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
    // Full width of the row, so the text box keeps its width and only grows in height (design D-18).
    <div className="flex w-full flex-col gap-3 pt-1">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={requestFieldId} className="font-medium text-ink">
            {strings.openingHoursRequestLabel}
          </label>
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            aria-label={strings.cancel}
            className="grid size-8 shrink-0 place-items-center rounded-full text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
        {/*
          The AI border: a gradient behind 3 px of padding that turns only while interpreting, and glows
          while the text box has the focus, which is its focus indicator (design D-18). The text box
          radius is the wrapper's minus that padding, so the border is 3 px wide at the corners too.
        */}
        <div
          data-interpreting={interpretation.isPending ? '' : undefined}
          className="relative rounded-xl bg-ai-border p-0.75 focus-within:shadow-ai-glow motion-safe:data-interpreting:animate-ai-border-spin"
        >
          <textarea
            ref={requestFieldRef}
            id={requestFieldId}
            value={requestText}
            onChange={(event) => changeRequestText(event.target.value)}
            onKeyDown={sendOnEnter}
            maxLength={300}
            placeholder={strings.openingHoursRequestPlaceholder}
            disabled={isBusy}
            autoFocus
            className="block max-h-36 min-h-16 w-full resize-none overflow-y-auto rounded-[calc(var(--radius-xl)-3px)] bg-surface p-3 pr-9 text-ink outline-hidden field-sizing-content placeholder:text-ink-muted disabled:opacity-90"
          />
          <SparkleIcon className="pointer-events-none absolute top-3 right-3 size-5 text-ai-to" />
        </div>
      </div>

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

      {proposal !== null && (
        <button
          type="button"
          onClick={() => start('save')}
          disabled={isBusy || proposalChanges.length === 0}
          className="min-h-11 self-start rounded-md bg-brand px-4 font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
        >
          {strings.save}
        </button>
      )}

      <AdminKeyDialog
        open={actionAwaitingKey !== null}
        rejected={keyRejected}
        onSubmit={submitKey}
        onClose={() => setActionAwaitingKey(null)}
      />
    </div>
  );
}
