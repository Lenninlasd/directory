import { useEffect, useRef, useState } from 'react';
import { buildWhatsappUrl } from './features/businesses/whatsapp.ts';
import { strings } from './strings.ts';
import { styleFor } from './categories.ts';
import { ExternalLinkDialog } from './ExternalLinkDialog.tsx';
import { ChatIcon, ClockIcon, CloseIcon, GlobeIcon, PinIcon, ScooterIcon, StoreIcon } from './icons.tsx';
import type { PlaygroundBusiness } from './mockData.ts';

interface BusinessDetailDialogProps {
  business: PlaygroundBusiness | null;
  onClose: () => void;
}

// Bottom sheet on phones, centered modal on larger screens. Native <dialog> handles focus and Escape.
export function BusinessDetailDialog({ business, onClose }: BusinessDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (business === null || dialog === null) return;
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add('overflow-hidden');
    return () => document.documentElement.classList.remove('overflow-hidden');
  }, [business]);

  const close = () => dialogRef.current?.close();

  return (
    <>
      <dialog
        ref={dialogRef}
        // React bubbles `close` through the component tree, so ignore it when it comes from another dialog.
        onClose={(event) => event.target === event.currentTarget && onClose()}
        onClick={(event) => event.target === event.currentTarget && close()}
        aria-label={business?.name}
        className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-black/50 sm:m-auto sm:rounded-3xl"
      >
        {business !== null && (
          <div className="flex max-h-[92dvh] flex-col">
            <div className="overflow-y-auto">
              {/* Remount on business change so the gallery resets to the first photo. */}
              <Gallery key={business.id} business={business} />
              <div className="space-y-5 p-5">
                <div>
                  <p className="text-sm font-medium text-stone-500">{business.category}</p>
                  <h2 className="text-2xl font-bold tracking-tight break-words">{business.name}</h2>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium">
                    {business.hasPhysicalStore ? <StoreIcon className="size-3.5" /> : <ScooterIcon className="size-3.5" />}
                    {business.hasPhysicalStore ? strings.inStore : strings.deliveryOnly}
                  </span>
                </div>

                {business.details && <p className="text-sm leading-relaxed text-stone-700">{business.details.description}</p>}

                <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200">
                  <InfoRow icon={<PinIcon className="size-5" />} label="Ubicación">
                    {business.locationSummary}
                  </InfoRow>
                  {business.details && business.details.hours.length > 0 && (
                    <InfoRow icon={<ClockIcon className="size-5" />} label="Horario">
                      {business.details.hours.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </InfoRow>
                  )}
                  {business.details?.website && (
                    <InfoRow icon={<GlobeIcon className="size-5" />} label="Página web">
                      <a
                        href={business.details.website}
                        onClick={(event) => {
                          event.preventDefault();
                          setPendingUrl(business.details?.website ?? null);
                        }}
                        className="font-medium break-all text-emerald-700 underline underline-offset-2"
                      >
                        {new URL(business.details.website).hostname + new URL(business.details.website).pathname}
                      </a>
                    </InfoRow>
                  )}
                </ul>

                {business.details && (
                  <p className="text-xs text-stone-400">Descripción, horario, fotos y página web son datos de ejemplo.</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 border-t border-stone-200 p-4">
              {business.whatsappNumber !== null ? (
                <a
                  href={buildWhatsappUrl(business.whatsappNumber)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={strings.whatsappButtonLabel(business.name)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-whatsapp py-3 font-semibold text-white hover:brightness-110"
                >
                  <ChatIcon className="size-5" />
                  Escribir por {strings.whatsappButtonText}
                </a>
              ) : (
                <p className="flex-1 py-3 text-center text-sm text-stone-500">Este negocio no tiene WhatsApp registrado</p>
              )}
            </div>

            <button
              onClick={close}
              aria-label="Cerrar"
              className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white/90 text-stone-800 shadow-md hover:bg-white"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
        )}
      </dialog>
      {/* A sibling, not a child, of the detail dialog so its events never reach the detail dialog. */}
      <ExternalLinkDialog url={pendingUrl} onClose={() => setPendingUrl(null)} />
    </>
  );
}

function Gallery({ business }: { business: PlaygroundBusiness }) {
  const style = styleFor(business.category);
  const IconComponent = style.icon;
  const images = business.details?.images ?? [];
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const current = images[selected];

  return (
    <div>
      {/* Wide and short so location, hours, and website stay visible without scrolling. */}
      <div className={`relative aspect-[2/1] max-h-56 w-full bg-gradient-to-br ${style.cover}`}>
        <IconComponent className="absolute top-1/2 left-1/2 size-16 -translate-1/2 text-white/80" />
        {current && !failed.has(selected) && (
          <img
            src={current.url}
            alt={current.alt}
            onError={() => setFailed((previous) => new Set(previous).add(selected))}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {images.length > 1 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
            {selected + 1} / {images.length}
          </span>
        )}
      </div>
      {images.length > 1 && (
        // Vertical padding leaves room for the selected thumbnail's ring, which overflow-x-auto would clip.
        <div className="flex gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none]">
          {images.map((image, index) => (
            <button
              key={image.url}
              onClick={() => setSelected(index)}
              aria-label={`Ver ${image.alt.toLowerCase()}`}
              aria-current={index === selected}
              className={`relative size-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br ${style.cover} ${
                index === selected ? 'ring-2 ring-stone-900 ring-offset-2' : 'opacity-70 hover:opacity-100'
              }`}
            >
              {!failed.has(index) && (
                <img
                  src={image.url}
                  alt=""
                  loading="lazy"
                  onError={() => setFailed((previous) => new Set(previous).add(index))}
                  className="size-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 p-4">
      <span className="text-stone-500">{icon}</span>
      <div className="min-w-0 text-sm">
        <p className="font-medium text-stone-900">{label}</p>
        <div className="text-stone-600">{children}</div>
      </div>
    </li>
  );
}
