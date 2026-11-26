// The invalid Colombian prefix 570 never reaches a real person (playground/AGENTS.md).
const WHATSAPP_NUMBER = '570000000000';

export function orderUrl(businessName: string, lines: { title: string; units: number }[]): string {
  const text = [`Hola, quiero pedir en ${businessName}:`, ...lines.map(({ title, units }) => `${units} x ${title}`)];
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text.join('\n'))}`;
}
