import { useEffect, useId, useRef } from 'react';
import type { Business } from '../../api/businesses.ts';
import { strings } from '../../strings.ts';
import { CategoryCover } from './CategoryCover.tsx';
import { CloseIcon, LocationIcon } from './icons.tsx';
import { StoreTypeBadge } from './StoreTypeBadge.tsx';
import { WhatsAppButton } from './WhatsAppButton.tsx';

interface BusinessDetailDialogProps {
  /** The business to show, or null to close the dialog. */
  business: Business | null;
  /** Called after the dialog closes, however it was closed. */
  onClose: () => void;
}

// Native modal dialog (spec 003 FR-8, plan D-4): the browser provides the focus trap, the inert
// page, and Escape. Bottom sheet on phones, centered from `sm` (AC-8.4).
export function BusinessDetailDialog({ business, onClose }: BusinessDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const isOpen = business !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // The page behind does not scroll while the dialog is open (AC-8.8).
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    root.classList.add('overflow-hidden');
    return () => root.classList.remove('overflow-hidden');
  }, [isOpen]);

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // React passes `close` events up through the component tree, so only this dialog's own count (plan D-4).
      onClose={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      // A click whose target is the dialog itself landed on the backdrop, outside the content (AC-8.6).
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/50 sm:m-auto sm:rounded-3xl"
    >
      {business !== null && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="overflow-y-auto">
            {/* Short cover, so location and WhatsApp stay visible at 320 px (AC-8.5). */}
            <CategoryCover category={business.category} className="aspect-2/1 max-h-56 w-full" />
            <div className="flex flex-col gap-5 p-5">
              <div className="flex flex-col items-start gap-2">
                <div>
                  <p className="text-sm font-medium text-ink-muted">{business.category}</p>
                  <h2 id={titleId} className="text-2xl font-bold tracking-tight break-words">
                    {business.name}
                  </h2>
                </div>
                <StoreTypeBadge hasPhysicalStore={business.hasPhysicalStore} />
              </div>
              <dl className="flex gap-3 rounded-2xl border border-border p-4">
                <LocationIcon className="size-5 shrink-0 text-ink-muted" />
                <div className="min-w-0 text-sm">
                  <dt className="font-medium text-ink">{strings.locationLabel}</dt>
                  <dd className="break-words text-ink-muted">{business.locationSummary}</dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="border-t border-border p-4">
            {business.whatsappNumber !== null ? (
              <WhatsAppButton whatsappNumber={business.whatsappNumber} />
            ) : (
              <p className="py-3 text-center text-sm text-ink-muted">{strings.noWhatsapp}</p>
            )}
          </div>
          <button
            type="button"
            aria-label={strings.closeDialog}
            onClick={close}
            className="absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-surface text-ink shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
      )}
    </dialog>
  );
}
