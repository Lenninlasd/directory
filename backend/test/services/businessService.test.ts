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
    websiteUrl: null,
    openingHours: null,
    mapsUrl: null,
    description: null,
    instagramUrl: null,
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

  it('returns a validated website, or null when it is not https (directory spec, "Website validity")', async () => {
    const rows = [
      row({ id: 'a', name: 'A', websiteUrl: 'https://example.com/panaderia' }),
      row({ id: 'b', name: 'B', websiteUrl: 'http://example.com/panaderia' }),
      row({ id: 'c', name: 'C', websiteUrl: null }),
    ];

    const result = await listActiveBusinesses(findRowsReturning(rows));

    expect(result.map((business) => business.websiteUrl)).toEqual(['https://example.com/panaderia', null, null]);
  });

  it('returns sorted opening hours, or [] when they are invalid or missing (directory spec, "Opening hours validity")', async () => {
    const rows = [
      row({
        id: 'a',
        name: 'A',
        openingHours: '[{"dayOfWeek": 2, "opens": "09:00", "closes": "17:00"}, {"dayOfWeek": 1, "opens": "08:00", "closes": "12:00"}]',
      }),
      row({ id: 'b', name: 'B', openingHours: '[{"dayOfWeek": 1, "opens": "18:00", "closes": "09:00"}]' }),
      row({ id: 'c', name: 'C', openingHours: null }),
    ];

    const result = await listActiveBusinesses(findRowsReturning(rows));

    expect(result.map((business) => business.openingHours)).toEqual([
      [
        { dayOfWeek: 1, opens: '08:00', closes: '12:00' },
        { dayOfWeek: 2, opens: '09:00', closes: '17:00' },
      ],
      [],
      [],
    ]);
  });

  it('returns a validated Maps link, or null when it is invalid or missing (directory spec, "Maps link validity")', async () => {
    const rows = [
      row({ id: 'a', name: 'A', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=A&query_place_id=EXAMPLE_PLACE_ID' }),
      row({ id: 'b', name: 'B', mapsUrl: 'http://www.google.com/maps/' }),
      row({ id: 'c', name: 'C', mapsUrl: 'https://example.com/maps/' }),
      row({ id: 'd', name: 'D', mapsUrl: 'https://www.google.com/search?q=panaderia' }),
      row({ id: 'e', name: 'E', mapsUrl: null }),
    ];

    const result = await listActiveBusinesses(findRowsReturning(rows));

    expect(result.map((business) => business.mapsUrl)).toEqual([
      'https://www.google.com/maps/search/?api=1&query=A&query_place_id=EXAMPLE_PLACE_ID',
      null,
      null,
      null,
      null,
    ]);
  });

  it('returns a validated Instagram link, or null when it is invalid or missing (directory spec, "Instagram link validity")', async () => {
    const rows = [
      row({ id: 'a', name: 'A', instagramUrl: 'https://www.instagram.com/example.panaderia/' }),
      row({ id: 'b', name: 'B', instagramUrl: 'http://www.instagram.com/example/' }),
      row({ id: 'c', name: 'C', instagramUrl: 'https://www.instagram.com/p/abc123/' }),
      row({ id: 'd', name: 'D', instagramUrl: `https://www.instagram.com/${'a'.repeat(31)}/` }),
      row({ id: 'e', name: 'E', instagramUrl: null }),
    ];

    const result = await listActiveBusinesses(findRowsReturning(rows));

    expect(result.map((business) => business.instagramUrl)).toEqual([
      'https://www.instagram.com/example.panaderia/',
      null,
      null,
      null,
      null,
    ]);
  });

  it('returns a trimmed description, or null when it is empty, too long, or missing (directory spec, "Description validity")', async () => {
    const rows = [
      row({ id: 'a', name: 'A', description: '  Pan artesanal y tortas por encargo. ' }),
      row({ id: 'b', name: 'B', description: '   ' }),
      row({ id: 'c', name: 'C', description: 'a'.repeat(301) }),
      row({ id: 'd', name: 'D', description: null }),
    ];

    const result = await listActiveBusinesses(findRowsReturning(rows));

    expect(result.map((business) => business.description)).toEqual(['Pan artesanal y tortas por encargo.', null, null, null]);
  });

  it('returns exactly the eleven API fields (AC-2.4)', async () => {
    const result = await listActiveBusinesses(findRowsReturning([row({ id: 'a' })]));

    expect(result).toEqual([
      {
        id: 'a',
        name: 'Business',
        category: 'Bakery',
        locationSummary: 'Centro Comercial Plaza',
        hasPhysicalStore: true,
        whatsappNumber: '573001234567',
        websiteUrl: null,
        openingHours: [],
        mapsUrl: null,
        description: null,
        instagramUrl: null,
      },
    ]);
    expect(Object.keys(result[0] ?? {}).sort()).toEqual([
      'category',
      'description',
      'hasPhysicalStore',
      'id',
      'instagramUrl',
      'locationSummary',
      'mapsUrl',
      'name',
      'openingHours',
      'websiteUrl',
      'whatsappNumber',
    ]);
  });

  it('does not modify the rows it receives', async () => {
    const rows = [row({ id: 'b', name: 'B' }), row({ id: 'a', name: 'A' })];

    await listActiveBusinesses(findRowsReturning(rows));

    expect(rows.map((businessRow) => businessRow.id)).toEqual(['b', 'a']);
  });
});
