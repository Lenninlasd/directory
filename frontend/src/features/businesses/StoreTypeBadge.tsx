import { strings } from '../../strings.ts';
import { DeliveryIcon, StoreIcon } from './icons.tsx';

interface StoreTypeBadgeProps {
  hasPhysicalStore: boolean;
}

// "En tienda" or "Solo domicilios" with an icon (spec 003 AC-5.2, spec 001 FR-3).
export function StoreTypeBadge({ hasPhysicalStore }: StoreTypeBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-xs font-medium text-ink shadow-sm">
      {hasPhysicalStore ? <StoreIcon className="size-3.5" /> : <DeliveryIcon className="size-3.5" />}
      {hasPhysicalStore ? strings.inStore : strings.deliveryOnly}
    </span>
  );
}
