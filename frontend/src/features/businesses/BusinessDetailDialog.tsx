import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { Business } from '../../api/businesses.ts';
import { strings } from '../../strings.ts';
import { CategoryCover } from './CategoryCover.tsx';
import { CloseIcon, ExternalLinkIcon } from './icons.tsx';
import { formatOpeningHours } from './openingHours.ts';
import { OpeningHoursEditor } from './OpeningHoursEditor.tsx';
import { StoreTypeBadge } from './StoreTypeBadge.tsx';
import { websiteLinkText } from './website.ts';
import { WhatsAppButton } from './WhatsAppButton.tsx';

interface BusinessDetailDialogProps {
  /** The open business, looked up in the query data by Directory, or null when closed. */
  business: Business | null;
  /** Called once the dialog has closed, by any means. */
  onClose: () => void;
  /** Admin mode adds the opening hours editing controls (business-editing spec, "Admin mode"). */
  adminMode: boolean;
}

// Native modal dialog (spec 003 FR-8, plan D-4): the browser provides the focus trap, the inert
// page, and Escape. Bottom sheet on phones, centered from `sm` (AC-8.4). No animation (NFR-9).
export function BusinessDetailDialog({ business, onClose, adminMode }: BusinessDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Layout effect, so the dialog opens or closes in the same frame as its content changes.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }
    if (business !== null && !dialog.open) {
      dialog.showModal();
    } else if (business === null && dialog.open) {
      // A reload removed the open business (AC-8.7).
      dialog.close();
    }
  }, [business]);

  const close = () => dialogRef.current?.close();

  // Editing state is kept by business id, so it never carries over to another business (design D-14).
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
  const [savedBusinessId, setSavedBusinessId] = useState<string | null>(null);
  const isEditing = business !== null && editingBusinessId === business.id;

  // When the panel closes, focus goes back to "Editar horario", since the focused control was removed.
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusToEditButtonRef = useRef(false);
  useEffect(() => {
    if (!isEditing && returnFocusToEditButtonRef.current) {
      returnFocusToEditButtonRef.current = false;
      editButtonRef.current?.focus();
    }
  }, [isEditing]);

  const openEditor = (businessId: string) => {
    setSavedBusinessId(null);
    setEditingBusinessId(businessId);
  };
  const closeEditor = (savedBusinessIdOrNull: string | null) => {
    returnFocusToEditButtonRef.current = true;
    setEditingBusinessId(null);
    setSavedBusinessId(savedBusinessIdOrNull);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // React passes `close` events up through the component tree, so only act on this dialog's own (D-4).
      onClose={(event) => {
        if (event.target === event.currentTarget) {
          // Closing the dialog closes the panel and stores nothing (business-editing spec, "Canceling").
          setEditingBusinessId(null);
          setSavedBusinessId(null);
          onClose();
        }
      }}
      // The dialog element itself is only hit outside its content, on the backdrop (AC-8.6).
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
      className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/50 sm:m-auto sm:rounded-3xl"
    >
      {business !== null && (
        <div className="relative flex max-h-[92dvh] flex-col">
          {/* First in the DOM, so showModal() focuses "Cerrar" rather than the WhatsApp link. */}
          <button
            type="button"
            onClick={close}
            aria-label={strings.closeDialogLabel}
            className="absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full bg-surface text-ink shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <CloseIcon className="size-5" />
          </button>
          <div className="overflow-y-auto">
            {/* Wide and short, so on a 320 px screen the location and WhatsApp stay visible (AC-8.5). */}
            <CategoryCover category={business.category} className="aspect-[2/1] max-h-36 w-full sm:max-h-52" />
            <div className="flex flex-col gap-5 p-5">
              <div className="flex flex-col items-start gap-1">
                <p className="text-sm font-medium text-ink-muted">{business.category}</p>
                <h2 id={titleId} className="text-2xl font-bold tracking-tight break-words">
                  {business.name}
                </h2>
                <StoreTypeBadge hasPhysicalStore={business.hasPhysicalStore} className="mt-1 bg-canvas" />
              </div>
              {/* Rows without data are not rendered (directory spec, "Detail dialog hours and website rows"). */}
              <dl className="flex flex-col gap-3 rounded-2xl border border-border p-4 text-sm">
                <div>
                  <dt className="font-medium text-ink">{strings.locationLabel}</dt>
                  <dd className="break-words text-ink-muted">{business.locationSummary}</dd>
                </div>
                {/* In admin mode the row always shows, so hours can be added (directory spec, "No hours in admin mode"). */}
                {(business.openingHours.length > 0 || adminMode) && (
                  <div>
                    <dt className="font-medium text-ink">{strings.openingHoursLabel}</dt>
                    {business.openingHours.length > 0 ? (
                      formatOpeningHours(business.openingHours).map((line) => (
                        <dd key={line} className="text-ink-muted">
                          {line}
                        </dd>
                      ))
                    ) : (
                      <dd className="text-ink-muted">{strings.noOpeningHours}</dd>
                    )}
                    {adminMode && (
                      <dd className="mt-2 flex flex-col items-start gap-2">
                        {isEditing ? (
                          <OpeningHoursEditor
                            business={business}
                            onCancel={() => closeEditor(null)}
                            onSaved={() => closeEditor(business.id)}
                          />
                        ) : (
                          <button
                            ref={editButtonRef}
                            type="button"
                            onClick={() => openEditor(business.id)}
                            className="min-h-11 rounded-md border border-border bg-surface px-4 font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                          >
                            {strings.editOpeningHours}
                          </button>
                        )}
                        <p role="status" className="text-ink empty:hidden">
                          {savedBusinessId === business.id ? strings.saved : ''}
                        </p>
                      </dd>
                    )}
                  </div>
                )}
                {business.websiteUrl !== null && (
                  <div>
                    <dt className="font-medium text-ink">{strings.websiteLabel}</dt>
                    <dd>
                      <a
                        href={business.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 font-medium break-all text-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        {websiteLinkText(business.websiteUrl)}
                        <ExternalLinkIcon className="size-4 shrink-0" />
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
          <div className="flex border-t border-border p-4">
            {business.whatsappNumber !== null ? (
              <WhatsAppButton whatsappNumber={business.whatsappNumber} />
            ) : (
              <p className="flex-1 py-3 text-center text-sm text-ink-muted">{strings.noWhatsapp}</p>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
