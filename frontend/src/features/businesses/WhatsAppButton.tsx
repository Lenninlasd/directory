import { strings } from '../../strings.ts';
import { WhatsAppGlyph } from './icons.tsx';
import { buildWhatsappUrl } from './whatsapp.ts';

// Both are links styled as buttons: WhatsApp opens in a new tab and the directory stays open
// (plan 001 section 5). The glyph is the official one, always on the `whatsapp` color (plan 003 D-10).

interface WhatsAppButtonProps {
  whatsappNumber: string;
}

// The dialog's main button (spec 003 AC-8.2). The dialog title names the business, so the
// accessible name is the visible text (WCAG 2.5.3).
export function WhatsAppButton({ whatsappNumber }: WhatsAppButtonProps) {
  return (
    <a
      href={buildWhatsappUrl(whatsappNumber)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-whatsapp px-4 font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <WhatsAppGlyph className="size-5" />
      {strings.whatsappDialogButton}
    </a>
  );
}

interface WhatsAppIconLinkProps {
  businessName: string;
  whatsappNumber: string;
}

// The tile's round, glyph-only WhatsApp link (spec 003 AC-5.3).
export function WhatsAppIconLink({ businessName, whatsappNumber }: WhatsAppIconLinkProps) {
  return (
    <a
      href={buildWhatsappUrl(whatsappNumber)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={strings.whatsappButtonLabel(businessName)}
      className="grid size-11 place-items-center rounded-full bg-whatsapp shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-safe:transition-transform motion-safe:hover:scale-110"
    >
      <WhatsAppGlyph className="size-5" />
    </a>
  );
}
