import type { Business } from '../../api/businesses.ts';
import { strings } from '../../strings.ts';
import { CategoryCover } from './CategoryCover.tsx';
import { StoreTypeBadge } from './StoreTypeBadge.tsx';
import { WhatsAppIconLink } from './WhatsAppButton.tsx';

interface BusinessTileProps {
  business: Business;
  /** Receives the button that opened the details, so focus can return to it (plan 003 D-5). */
  onOpen: (trigger: HTMLElement) => void;
}

// Shows only the fields of spec 003 AC-5.1 and AC-5.2. A stretched button opens the details, and
// the WhatsApp link sits above it so both can be activated (plan 003 D-9).
export function BusinessTile({ business, onOpen }: BusinessTileProps) {
  return (
    <article className="group relative min-w-0">
      <CategoryCover category={business.category} className="aspect-video rounded-xl">
        <span className="absolute top-2 left-2">
          <StoreTypeBadge hasPhysicalStore={business.hasPhysicalStore} />
        </span>
        {business.whatsappNumber !== null && (
          <span className="absolute right-2 bottom-2 z-20">
            <WhatsAppIconLink businessName={business.name} whatsappNumber={business.whatsappNumber} />
          </span>
        )}
      </CategoryCover>
      <h3 className="mt-2 truncate font-semibold text-ink" title={business.name}>
        {business.name}
      </h3>
      <p className="truncate text-sm text-ink-muted">
        <span>{business.category}</span>
        <span aria-hidden="true"> · </span>
        <span>{business.locationSummary}</span>
      </p>
      <button
        type="button"
        aria-label={strings.viewDetailsLabel(business.name)}
        onClick={(event) => onOpen(event.currentTarget)}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      />
    </article>
  );
}
