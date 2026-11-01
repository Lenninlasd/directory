import { BusinessCard } from '../features/businesses/BusinessCard.tsx';
import type { ViewProps } from './index.ts';

// Baseline: the real production card, for side-by-side comparison.
export function CardsView({ businesses }: ViewProps) {
  return (
    <ul className="mx-auto grid max-w-5xl gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {businesses.map((business) => (
        <li key={business.id}>
          <BusinessCard business={business} />
        </li>
      ))}
    </ul>
  );
}
