import type { ComponentType } from 'react';
import type { PlaygroundBusiness } from '../mockData.ts';
import { CardsView } from './CardsView.tsx';
import { CompactView } from './CompactView.tsx';
import { DeliveryView } from './DeliveryView.tsx';

export interface ViewProps {
  businesses: PlaygroundBusiness[];
}

type View = { id: string; label: string; description: string; component: ComponentType<ViewProps> };

// Register new views here; the first one is the default.
export const views: [View, ...View[]] = [
  { id: 'cards', label: 'Actual (tarjetas)', description: 'La vista de producción', component: CardsView },
  { id: 'compact', label: 'Lista compacta', description: 'Filas agrupadas por categoría', component: CompactView },
  {
    id: 'delivery',
    label: 'App de domicilios',
    description: 'Buscador, categorías y carrusel',
    component: DeliveryView,
  },
];
