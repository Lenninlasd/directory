import { normalize } from '../format.ts';
import type { Catalog, Interpretation } from '../types.ts';

// Stands in for the model. It understands these four messages and nothing else: there is no AI here.

type Simulation = (catalog: Catalog, now: Date) => Interpretation;

const SIMULATIONS: { message: string; run: Simulation }[] = [
  {
    message: 'sube los brownies a 8.000',
    run: (catalog) => {
      const found = find(catalog, 'brownie');
      if (found.length === 0) return nothing('No hay brownies en tu catálogo.');
      return {
        status: 'proposal',
        operations: found.map(({ id }) => ({ type: 'set_price', productId: id, price: 8000 })),
        assumptions: [],
      };
    },
  },
  {
    message: 'se acabó el enyucado',
    run: (catalog) => {
      const found = find(catalog, 'enyucado');
      if (found.length === 0) return nothing('No hay enyucado en tu catálogo.');
      return {
        status: 'proposal',
        operations: found.map(({ id }) => ({ type: 'set_sold_out', productId: id, soldOut: true })),
        assumptions: found.length > 1 ? ['No dijiste cuál tamaño, así que incluí todos. Desmarca el que no.'] : [],
      };
    },
  },
  {
    message: 'este sábado 20 cheesecakes a 45 mil, pedidos hasta el viernes a las 6',
    run: (catalog, now) => {
      const { date, deadline } = nextSaturday(now);
      return {
        status: 'proposal',
        operations: [
          {
            type: 'create_drop',
            drop: {
              id: `d${now.getTime()}`,
              name: find(catalog, 'cheesecake')[0]?.name ?? 'Cheesecake',
              units: 20,
              price: 45000,
              date: date.toISOString(),
              deadline: deadline.toISOString(),
              status: 'open',
            },
          },
        ],
        assumptions: ['«A las 6» lo tomé como 6 de la tarde.'],
      };
    },
  },
  {
    message: 'cierra los pedidos',
    run: ({ drops }) => {
      const open = drops.filter(({ status }) => status === 'open');
      if (open.length === 0) return nothing('No hay tandas abiertas.');
      return {
        status: 'proposal',
        operations: open.map(({ id }) => ({ type: 'close_drop', dropId: id })),
        assumptions: [],
      };
    },
  },
];

export const EXAMPLES: readonly string[] = SIMULATIONS.map(({ message }) => message);

export function interpret(message: string, catalog: Catalog, now: Date): Interpretation {
  const simulation = SIMULATIONS.find((candidate) => normalize(candidate.message) === normalize(message));
  return simulation?.run(catalog, now) ?? { status: 'not_understood' };
}

const nothing = (reason: string): Interpretation => ({ status: 'nothing_to_change', reason });
const find = (catalog: Catalog, word: string) => catalog.products.filter(({ name }) => normalize(name).includes(word));

/** The next Saturday whose Friday at 6 p. m. has not passed. */
function nextSaturday(now: Date): { date: Date; deadline: Date } {
  const deadline = new Date(now);
  deadline.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
  deadline.setHours(18, 0, 0, 0);
  if (deadline <= now) deadline.setDate(deadline.getDate() + 7);
  const date = new Date(deadline);
  date.setDate(deadline.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return { date, deadline };
}
