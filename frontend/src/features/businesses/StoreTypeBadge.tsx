import { strings } from '../../strings.ts';
import { DeliveryIcon, StoreIcon } from './icons.tsx';

interface StoreTypeBadgeProps {
  hasPhysicalStore: boolean;
  /** Background and shadow, which differ between the tile cover and the dialog. */
  className: string;
}

// "En tienda" or "Solo domicilios" with an icon (spec 003 AC-5.2, spec 001 FR-3). Always ink text
// on a light pill, so the text never sits on a category color (NFR-6).
export function StoreTypeBadge({ hasPhysicalStore, className }: StoreTypeBadgeProps) {
  const Icon = hasPhysicalStore ? StoreIcon : DeliveryIcon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-ink ${className}`}>
      <Icon className="size-3.5" />
      {hasPhysicalStore ? strings.inStore : strings.deliveryOnly}
    </span>
  );
}
