import { ExternalLinkIcon } from '../../icons.tsx';
import type { MenuSource } from '../types.ts';

// Phones cannot show a PDF inside the page, so there the file opens in another tab.
export function OriginalMenuLink({ source }: { source: MenuSource }) {
  if (source.kind === 'text') {
    return (
      <details className="rounded-xl border border-border bg-surface lg:hidden">
        <summary className="min-h-11 cursor-pointer px-4 py-2.5 text-sm font-medium text-brand">Ver el menú original</summary>
        <OriginalText text={source.text} />
      </details>
    );
  }
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-medium text-brand lg:hidden"
    >
      <ExternalLinkIcon className="size-4" />
      Ver el menú original
    </a>
  );
}

export function OriginalMenuPane({ source }: { source: MenuSource }) {
  return (
    <aside
      aria-label="Menú original"
      className="sticky top-28 hidden h-[calc(100dvh-12.5rem)] overflow-auto rounded-xl border border-border bg-surface lg:block"
    >
      {source.kind === 'text' && <OriginalText text={source.text} />}
      {source.kind === 'image' && <img src={source.url} alt="Menú original" className="w-full" />}
      {source.kind === 'pdf' && <iframe src={`${source.url}#navpanes=0&view=FitH`} title="Menú original" className="size-full" />}
    </aside>
  );
}

function OriginalText({ text }: { text: string }) {
  return <pre className="overflow-x-auto p-4 font-mono text-sm whitespace-pre-wrap">{text}</pre>;
}
