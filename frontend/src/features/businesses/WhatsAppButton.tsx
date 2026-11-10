import { strings } from '../../strings.ts';
import { WhatsAppGlyph } from './icons.tsx';
import { buildWhatsappUrl } from './whatsapp.ts';

interface WhatsAppIconLinkProps {
  businessName: string;
  whatsappNumber: string;
}

interface WhatsAppButtonProps {
  whatsappNumber: string;
}

// Tile variant: the official glyph alone on a round green button, so the accessible name
// comes from aria-label (spec 003 AC-5.3, plan D-10). It sits above the tile's stretched button.
export function WhatsAppIconLink({ businessName, whatsappNumber }: WhatsAppIconLinkProps) {
  return (
    <a
      href={buildWhatsappUrl(whatsappNumber)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={strings.whatsappButtonLabel(businessName)}
      className="relative z-20 grid size-11 place-items-center rounded-full bg-whatsapp shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface motion-safe:transition-transform motion-safe:hover:scale-110"
    >
      <WhatsAppGlyph className="size-5" />
    </a>
  );
}

// Dialog variant: the glyph next to the visible text "Escribir por WhatsApp". There is no
// aria-label, so the accessible name equals the visible text (spec 003 AC-8.2, WCAG 2.5.3). The
// glyph is a separate element and never replaces the word (plan D-10). WhatsApp opens in a new
// tab and the directory stays open (plan 001 section 5).
export function WhatsAppButton({ whatsappNumber }: WhatsAppButtonProps) {
  return (
    <a
      href={buildWhatsappUrl(whatsappNumber)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-11 flex-1 items-center justify-center gap-2.5 rounded-full bg-whatsapp px-4 py-3 font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <WhatsAppGlyph className="size-5 shrink-0" />
      {strings.dialogWhatsappButtonText}
    </a>
  );
}
