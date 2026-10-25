import { describe, expect, it } from 'vitest';
import type { BusinessRow } from '../../src/domain/business.ts';
import { listActiveBusinesses } from '../../src/services/businessService.ts';

function row(overrides: Partial<BusinessRow> & Pick<BusinessRow, 'id'>): BusinessRow {
  return {
    name: 'Business',
    category: 'Bakery',
    locationSummary: 'Centro Comercial Plaza',
    hasPhysicalStore: true,
    whatsappNumber: '573001234567',
    createdAt: new Date('2026-10-01T12:00:00Z'),
    ...overrides,
  };
}

function findRowsReturning(rows: BusinessRow[]) {
  return async () => rows;
}

const sameTime = new Date('2026-10-01T12:00:00Z');

describe('listActiveBusinesses', () => {
  it('orders businesses from newest to oldest (AC-5.1)', async () => {
    const rows = [
      row({ id: 'a', name: 'Old', createdAt: new Date('2026-01-01T00:00:00Z') }),
      row({ id: 'b', name: 'New', createdAt: new Date('2026-10-01T00:00:00Z') }),
      row({ id: 'c', name: 'Middle', createdAt: new Date('2026-05-01T00:00:00Z') }),
    ];

    const result = await listActiveBusinesses(findRowsReturning(rows));

    expect(result.map((business) => business.name)).toEqual(['New', 'Middle', 'Old']);
  });

  it('orders equal creation times alphabetically with Spanish rules for accents and case (AC-5.2, EC-6)', async () => {
    const rows = [
      row({ id: '1', name: 'Zapatería', createdAt: sameTime }),
      row({ id: '2', name: 'Árbol', createdAt: sameTime }),
      row({ id: '3', name: 'abeja', createdAt: sameTime }),
      row({ id: '4', name: 'Ñame', createdAt: sameTime }),
      row({ id: '5', name: 'Nube', createdAt: sameTime }),
    ];

    const result = await listActiveBusinesses(findRowsReturning(rows));

    expect(result.map((business) => business.name)).toEqual(['abeja', 'Árbol', 'Nube', 'Ñame', 'Zapatería']);
  });

  it('orders equal creation time and name by id (AC-5.2, EC-6)', async () => {
    const rows = [
      row({ id: 'c', name: 'Panadería', createdAt: sameTime }),
      row({ id: 'a', name: 'Panadería', createdAt: sameTime }),
      row({ id: 'b', name: 'Panadería', createdAt: sameTime }),
    ];

    const result = await listActiveBusinesses(findRowsReturning(rows));

    expect(result.map((business) => business.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty list when there are no businesses (EC-1)', async () => {
    expect(await listActiveBusinesses(findRowsReturning([]))).toEqual([]);
  });

  it('returns a normalized number, or null when the number is invalid or missing (AC-2.3)', async () => {
    const rows = [
      row({ id: 'a', name: 'A', whatsappNumber: '+57 300 123-4567' }),
      row({ id: 'b', name: 'B', whatsappNumber: '123' }),
      row({ id: 'c', name: 'C', whatsappNumber: null }),
    ];

    const result = await listActiveBusinesses(findRowsReturning(rows));

    expect(result.map((business) => business.whatsappNumber)).toEqual(['573001234567', null, null]);
  });

  it('returns exactly the six API fields (AC-2.4)', async () => {
    const result = await listActiveBusinesses(findRowsReturning([row({ id: 'a' })]));

    expect(result).toEqual([
      {
        id: 'a',
        name: 'Business',
        category: 'Bakery',
        locationSummary: 'Centro Comercial Plaza',
        hasPhysicalStore: true,
        whatsappNumber: '573001234567',
      },
    ]);
    expect(Object.keys(result[0] ?? {}).sort()).toEqual(
      ['category', 'hasPhysicalStore', 'id', 'locationSummary', 'name', 'whatsappNumber'],
    );
  });

  it('does not modify the rows it receives', async () => {
    const rows = [row({ id: 'b', name: 'B' }), row({ id: 'a', name: 'A' })];

    await listActiveBusinesses(findRowsReturning(rows));

    expect(rows.map((businessRow) => businessRow.id)).toEqual(['b', 'a']);
  });
});
