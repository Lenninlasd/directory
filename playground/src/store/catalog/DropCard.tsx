import { formatDay, formatDayAndHour, formatPrice } from '../format.ts';
import type { Currency, Drop } from '../types.ts';
import { orderUrl } from './order.ts';

interface DropCardProps {
  drop: Drop;
  businessName: string;
  currency: Currency;
}

export function DropCard({ drop, businessName, currency }: DropCardProps) {
  const open = drop.status === 'open' && new Date(drop.deadline) > new Date();
  return (
    <article className={`rounded-2xl p-5 ${open ? 'bg-teal-900 text-white' : 'bg-stone-200 text-stone-700'}`}>
      <p className="text-sm font-medium first-letter:uppercase">{formatDay(drop.date)}</p>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <h2 className="min-w-0 text-xl font-bold break-words">{drop.name}</h2>
        <p className="shrink-0 text-lg font-semibold tabular-nums">{formatPrice(drop.price, currency)}</p>
      </div>
      <p className="mt-1 text-sm">
        {open ? `${drop.units} unidades · pedidos hasta el ${formatDayAndHour(drop.deadline)}` : 'Pedidos cerrados'}
      </p>
      {open && (
        <a
          href={orderUrl(businessName, [{ title: `${drop.name} (tanda del ${formatDay(drop.date)})`, units: 1 }])}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex min-h-12 items-center justify-center rounded-lg bg-white px-4 font-medium text-teal-900"
        >
          Pedir por WhatsApp
        </a>
      )}
    </article>
  );
}
