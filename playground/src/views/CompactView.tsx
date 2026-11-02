import { buildWhatsappUrl } from '../features/businesses/whatsapp.ts';
import { strings } from '../strings.ts';
import type { ViewProps } from './index.ts';

// Dense rows grouped by category.
export function CompactView({ businesses }: ViewProps) {
  const byCategory = new Map<string, typeof businesses>();
  for (const business of businesses) {
    byCategory.set(business.category, [...(byCategory.get(business.category) ?? []), business]);
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      {[...byCategory].map(([category, items]) => (
        <section key={category} className="mb-6">
          <h2 className="mb-2 text-xs font-semibold tracking-wider text-ink-muted uppercase">{category}</h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {items.map((business) => (
              <li key={business.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{business.name}</p>
                  <p className="truncate text-sm text-ink-muted">
                    {business.locationSummary} · {business.hasPhysicalStore ? strings.inStore : strings.deliveryOnly}
                  </p>
                </div>
                {business.whatsappNumber !== null && (
                  <a
                    href={buildWhatsappUrl(business.whatsappNumber)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={strings.whatsappButtonLabel(business.name)}
                    className="shrink-0 rounded-full bg-whatsapp px-3 py-1 text-sm text-surface"
                  >
                    {strings.whatsappButtonText}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
