import { strings } from '../../strings.ts';
import { buildWhatsappUrl } from './whatsapp.ts';

interface WhatsAppButtonProps {
  businessName: string;
  whatsappNumber: string;
}

// A link styled as a button: WhatsApp opens in a new tab and the directory stays open (plan 001 section 5).
export function WhatsAppButton({ businessName, whatsappNumber }: WhatsAppButtonProps) {
  return (
    <a
      href={buildWhatsappUrl(whatsappNumber)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={strings.whatsappButtonLabel(businessName)}
      className="inline-flex min-h-11 items-center justify-center rounded-md bg-whatsapp px-4 font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {strings.whatsappButtonText}
    </a>
  );
}
