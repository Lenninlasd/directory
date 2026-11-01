import { useEffect, useRef } from 'react';
import { ExternalLinkIcon } from './icons.tsx';

interface ExternalLinkDialogProps {
  /** The URL waiting for confirmation, or null when closed. */
  url: string | null;
  onClose: () => void;
}

// Asks before leaving the directory. Opens the site in a new tab only after "Continuar".
export function ExternalLinkDialog({ url, onClose }: ExternalLinkDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (url !== null && dialog !== null && !dialog.open) dialog.showModal();
  }, [url]);

  const close = () => dialogRef.current?.close();

  const proceed = () => {
    if (url !== null) window.open(url, '_blank', 'noopener,noreferrer');
    close();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={(event) => event.target === event.currentTarget && onClose()}
      onClick={(event) => event.target === event.currentTarget && close()}
      aria-labelledby="leave-title"
      // Its own backdrop sets it apart from the detail modal underneath.
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-2xl bg-white p-6 text-stone-900 shadow-2xl backdrop:bg-black/40"
    >
      <span className="grid size-12 place-items-center rounded-full bg-amber-100 text-amber-700">
        <ExternalLinkIcon className="size-6" />
      </span>
      <h2 id="leave-title" className="mt-4 text-lg font-bold">
        Vas a salir del directorio
      </h2>
      <p className="mt-2 text-sm text-stone-600">
        Te llevaremos a un sitio externo que no administra el Directorio de Alameda del Río:
      </p>
      {url !== null && (
        <p className="mt-2 rounded-lg bg-stone-100 px-3 py-2 text-sm font-medium break-all">{new URL(url).hostname}</p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={close} className="rounded-full px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100">
          Cancelar
        </button>
        <button
          onClick={proceed}
          autoFocus
          className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Continuar
        </button>
      </div>
    </dialog>
  );
}
