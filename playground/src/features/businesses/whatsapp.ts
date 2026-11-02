import { strings } from '../../strings.ts';

// wa.me opens the WhatsApp app when installed and WhatsApp Web otherwise (spec 001 AC-4.2).
export function buildWhatsappUrl(whatsappNumber: string): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(strings.whatsappGreeting)}`;
}
