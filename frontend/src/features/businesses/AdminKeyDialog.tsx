import { useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { strings } from '../../strings.ts';
import { CloseIcon } from './icons.tsx';

interface AdminKeyDialogProps {
  open: boolean;
  /** True after a `401`: shows "Clave incorrecta" (business-editing spec, "Wrong key"). */
  rejected: boolean;
  /** Called with the key the admin entered. The owner keeps it and closes the dialog. */
  onSubmit: (adminKey: string) => void;
  /** Called once the dialog has closed, with or without a key. */
  onClose: () => void;
}

/**
 * Asks for the admin key in its own modal dialog, over the detail dialog (design D-19). A native
 * `<dialog>`: the browser stacks it on top, traps the focus in it, and closes it with Escape.
 */
export function AdminKeyDialog({ open, rejected, onSubmit, onClose }: AdminKeyDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      // Explicit, since browsers differ in what showModal() focuses first.
      dialog.querySelector('input')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // React passes `close` events up the component tree, so only act on this dialog's own.
      onClose={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      // The dialog element itself is only hit outside its content, on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          dialogRef.current?.close();
        }
      }}
      className="m-auto w-[calc(100%-(--spacing(8)))] max-w-sm rounded-2xl bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/50"
    >
      {/* Mounted only while open, so the field is empty each time the dialog opens. */}
      {open && (
        <KeyForm
          titleId={titleId}
          rejected={rejected}
          onSubmit={onSubmit}
          onDismiss={() => dialogRef.current?.close()}
        />
      )}
    </dialog>
  );
}

interface KeyFormProps {
  titleId: string;
  rejected: boolean;
  onSubmit: (adminKey: string) => void;
  onDismiss: () => void;
}

function KeyForm({ titleId, rejected, onSubmit, onDismiss }: KeyFormProps) {
  const [keyText, setKeyText] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (keyText !== '') {
      onSubmit(keyText);
    }
  };

  return (
    <form onSubmit={submit} className="relative flex flex-col gap-4 p-5">
      <h2 id={titleId} className="pr-10 text-lg font-bold">
        {strings.adminKeyLabel}
      </h2>
      <input
        type="password"
        autoComplete="off"
        aria-labelledby={titleId}
        value={keyText}
        onChange={(event) => setKeyText(event.target.value)}
        // The outline is the field's border, 2 px and drawn inside: the focus only changes its color to brand.
        className="block min-h-11 w-full rounded-md bg-surface px-3.5 text-ink outline-2 -outline-offset-2 outline-border focus:outline-brand"
      />
      <p role="status" className="text-sm text-danger empty:hidden">
        {rejected ? strings.wrongAdminKey : ''}
      </p>
      <button
        type="submit"
        disabled={keyText === ''}
        className="min-h-11 rounded-md bg-brand px-4 font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
      >
        {strings.adminKeyContinue}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={strings.closeDialogLabel}
        className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <CloseIcon className="size-5" />
      </button>
    </form>
  );
}
