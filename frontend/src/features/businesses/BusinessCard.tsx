import type { Business } from '../../api/businesses.ts';
import { strings } from '../../strings.ts';
import { WhatsAppButton } from './WhatsAppButton.tsx';

interface BusinessCardProps {
  business: Business;
}

// Shows only the fields allowed by spec 001 AC-2.1 and AC-2.4. Long text wraps (EC-4).
export function BusinessCard({ business }: BusinessCardProps) {
  return (
    <article className="flex h-full min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface p-4 break-words">
      <h2 className="text-lg font-semibold text-ink">{business.name}</h2>
      <p className="text-sm text-ink-muted">{business.category}</p>
      <p className="text-sm text-ink-muted">{business.locationSummary}</p>
      <p className="text-sm font-medium text-brand">
        {business.hasPhysicalStore ? strings.inStore : strings.deliveryOnly}
      </p>
      {business.whatsappNumber !== null && (
        <div className="mt-auto pt-2">
          <WhatsAppButton businessName={business.name} whatsappNumber={business.whatsappNumber} />
        </div>
      )}
    </article>
  );
}
