import type { Business } from '../../api/businesses.ts';
import { strings } from '../../strings.ts';
import { CategoryCover } from './CategoryCover.tsx';
import { StoreTypeBadge } from './StoreTypeBadge.tsx';
import { WhatsAppIconLink } from './WhatsAppButton.tsx';

interface BusinessTileProps {
  business: Business;
  /** Called with the "Ver detalles" button, so focus can return to it when the dialog closes (plan D-5). */
  onOpen: (trigger: HTMLElement) => void;
}

// Spec 003 FR-5, plan D-9: a stretched button covers the tile and opens the dialog, and the
// WhatsApp link is stacked above it, since a link cannot sit inside a button. Shows only the
// attributes of AC-5.1 and AC-5.2 (AC-5.8).
export function BusinessTile({ business, onOpen }: BusinessTileProps) {
  return (
    <article className="group relative min-w-0">
      <button
        type="button"
        onClick={(event) => onOpen(event.currentTarget)}
        aria-label={strings.viewDetailsLabel(business.name)}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      />
      <CategoryCover category={business.category} className="aspect-video rounded-xl">
        <StoreTypeBadge
          hasPhysicalStore={business.hasPhysicalStore}
          className="absolute top-2 left-2 bg-surface shadow-sm"
        />
        {business.whatsappNumber !== null && (
          <div className="absolute right-2 bottom-2">
            <WhatsAppIconLink businessName={business.name} whatsappNumber={business.whatsappNumber} />
          </div>
        )}
      </CategoryCover>
      <div className="mt-2 min-w-0">
        <h3 className="truncate font-semibold text-ink">{business.name}</h3>
        <p className="truncate text-sm text-ink-muted">
          <span>{business.category}</span>
          <span aria-hidden="true"> · </span>
          <span>{business.locationSummary}</span>
        </p>
      </div>
    </article>
  );
}
