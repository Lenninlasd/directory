import type { ImportedProduct, MenuImport } from '../types.ts';

// An invented menu, the only one in git. Its "answer" holds one case of each doubt on purpose.
const text = `🍰 DULCES DE EJEMPLO 🍰
Pedidos por WhatsApp, entrega en el barrio

PARA COMPARTIR
Cheesecake de maracuyá ....... desde 45.000
Torta de zanahoria ........... 60 mil
Enyucado x6 .................. $28.000
Enyucado x12 ................. $52.000

INDIVIDUALES
Brownie con nuez ............. 7.000
Alfajores .................... 2x15.000
Galleta de avena ............. 500
Leche asada con
caramelo salado .............. 8.500

POR ENCARGO
Bandeja surtida .............. precio según tamaño
`;

type Row = Pick<ImportedProduct, 'name' | 'priceText' | 'price'> & Partial<ImportedProduct>;

const row = (category: string, product: Row, index: number): ImportedProduct => ({
  id: `p${index}`,
  category,
  variant: null,
  description: null,
  doubts: [],
  ...product,
});

const rows: [string, Row][] = [
  ['Para compartir', { name: 'Cheesecake de maracuyá', priceText: 'desde 45.000', price: 45000, doubts: ['unverified'] }],
  ['Para compartir', { name: 'Torta de zanahoria', priceText: '60 mil', price: 60, doubts: ['mismatch', 'unlikely'] }],
  ['Para compartir', { name: 'Enyucado', variant: 'x6', priceText: '$28.000', price: 28000 }],
  ['Para compartir', { name: 'Enyucado', variant: 'x12', priceText: '$52.000', price: 52000 }],
  ['Individuales', { name: 'Brownie', priceText: '7.000', price: 7000, description: 'con nuez' }],
  ['Individuales', { name: 'Alfajores', variant: 'x2', priceText: '2x15.000', price: 15000 }],
  ['Individuales', { name: 'Galleta de avena', priceText: '500', price: 500, doubts: ['mismatch', 'unlikely'] }],
  ['Individuales', { name: 'Leche asada con', priceText: null, price: null, doubts: ['half_name'] }],
  ['Individuales', { name: 'caramelo salado', priceText: '8.500', price: 8500 }],
  ['Por encargo', { name: 'Bandeja surtida', priceText: 'precio según tamaño', price: null, doubts: ['missing_price'] }],
];

export const demoMenu: MenuImport = {
  id: 'demo',
  run: 'demo-1',
  businessName: 'Dulces de Ejemplo (inventado)',
  currency: 'COP',
  source: { kind: 'text', text },
  products: rows.map(([category, product], index) => row(category, product, index)),
  golden: null,
};
