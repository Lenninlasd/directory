import { describe, expect, it } from 'vitest';
import type { Execute } from '../../src/db/dataApi.ts';
import type { HandoffBusiness } from '../../src/import/handoffFile.ts';
import {
  deactivateImportedBusiness,
  findImportedBusinesses,
  findLastImport,
  recordImport,
  upsertImportedBusiness,
} from '../../src/repositories/importRepository.ts';

// import-businesses design D-3, D-4, D-7, D-8. Invented businesses only.
interface RecordedCall {
  sql: string;
  parameters: Record<string, string> | undefined;
}

function fakeExecute(records: Record<string, unknown>[] = []): { execute: Execute; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const execute: Execute = async (sql, parameters) => {
    calls.push({ sql, parameters });
    return records;
  };
  return { execute, calls };
}

const business: HandoffBusiness = {
  name: 'Panadería Ejemplo',
  category: 'Panadería',
  locationSummary: 'Local 1',
  hasPhysicalStore: true,
  whatsappNumber: '573001234567',
  websiteUrl: 'https://example.com/panaderia',
  openingHours: [{ dayOfWeek: 1, opens: '08:00', closes: '18:00' }],
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ejemplo&query_place_id=EXAMPLE_PLACE_ID_1',
  description: null,
  instagramUrl: null,
  private: {
    googlePlaceId: 'EXAMPLE_PLACE_ID_1',
    latitude: 10.987654,
    longitude: -74.123456,
    coordinatesSource: 'maps_listing',
    sourceType: 'storefront',
    sourceCategory: null,
    activityScore: 73,
    activityAsOf: '2026-11-01',
    lastVerifiedAt: null,
    consentedAt: '2026-11-10',
    consentChannel: 'in_person',
    adminNotes: 'Nota inventada',
  },
};

// A record as the RDS Data API returns it with `formatRecordsAs: JSON`.
const storedRecord = {
  id: '00000000-0000-4000-8000-0000000000aa',
  is_active: true,
  name: 'Panadería Ejemplo',
  category: 'Panadería',
  location_summary: 'Local 1',
  has_physical_store: true,
  whatsapp_number: '573001234567',
  website_url: 'https://example.com/panaderia',
  opening_hours: '[{"dayOfWeek": 1, "opens": "08:00", "closes": "18:00"}]',
  maps_url: null,
  description: null,
  instagram_url: null,
  google_place_id: 'EXAMPLE_PLACE_ID_1',
  latitude: 10.987654,
  longitude: -74.123456,
  coordinates_source: 'maps_listing',
  source_type: 'storefront',
  source_category: null,
  activity_score: 73,
  activity_as_of: '2026-11-01',
  last_verified_at: null,
  consented_at: '2026-11-10',
  consent_channel: 'in_person',
  admin_notes: 'Nota inventada',
  imported_opening_hours: '[{"dayOfWeek": 1, "opens": "08:00", "closes": "18:00"}]',
};

/** The part of an upsert after `DO UPDATE SET`. */
function updatePart(sql: string): string {
  return sql.slice(sql.indexOf('DO UPDATE SET'));
}

describe('findImportedBusinesses', () => {
  it('reads only businesses that have a place id (scenario "Businesses without a place id")', async () => {
    const { execute, calls } = fakeExecute();

    await findImportedBusinesses(execute);

    expect(calls[0]?.sql).toMatch(/WHERE google_place_id IS NOT NULL/);
  });

  it('reads the hours and dates as text', async () => {
    const { execute, calls } = fakeExecute();

    await findImportedBusinesses(execute);

    for (const column of ['opening_hours', 'imported_opening_hours', 'activity_as_of', 'last_verified_at', 'consented_at']) {
      expect(calls[0]?.sql).toContain(`${column}::text AS ${column}`);
    }
  });

  it('converts a record into a stored business with every field', async () => {
    const { execute } = fakeExecute([storedRecord]);

    expect(await findImportedBusinesses(execute)).toEqual([
      {
        id: '00000000-0000-4000-8000-0000000000aa',
        isActive: true,
        name: 'Panadería Ejemplo',
        category: 'Panadería',
        locationSummary: 'Local 1',
        hasPhysicalStore: true,
        whatsappNumber: '573001234567',
        websiteUrl: 'https://example.com/panaderia',
        openingHours: '[{"dayOfWeek": 1, "opens": "08:00", "closes": "18:00"}]',
        mapsUrl: null,
        description: null,
        instagramUrl: null,
        importedOpeningHours: '[{"dayOfWeek": 1, "opens": "08:00", "closes": "18:00"}]',
        private: {
          googlePlaceId: 'EXAMPLE_PLACE_ID_1',
          latitude: 10.987654,
          longitude: -74.123456,
          coordinatesSource: 'maps_listing',
          sourceType: 'storefront',
          sourceCategory: null,
          activityScore: 73,
          activityAsOf: '2026-11-01',
          lastVerifiedAt: null,
          consentedAt: '2026-11-10',
          consentChannel: 'in_person',
          adminNotes: 'Nota inventada',
        },
      },
    ]);
  });

  it('fails clearly when a record has an unexpected shape, without its value', async () => {
    const { execute } = fakeExecute([{ ...storedRecord, latitude: 'Nota secreta' }]);

    await expect(findImportedBusinesses(execute)).rejects.toThrow(/^Unexpected value for column latitude/);
    await expect(findImportedBusinesses(execute)).rejects.not.toThrow(/Nota secreta/);
  });
});

describe('upsertImportedBusiness', () => {
  it('upserts on the place id (design D-3)', async () => {
    const { execute, calls } = fakeExecute();

    await upsertImportedBusiness(execute, business, { writeHours: true });

    expect(calls[0]?.sql).toMatch(/ON CONFLICT \(google_place_id\) DO UPDATE SET/);
  });

  it('sends the business as one JSON string parameter, with nulls kept as null', async () => {
    const { execute, calls } = fakeExecute();

    await upsertImportedBusiness(execute, business, { writeHours: true });

    expect(Object.keys(calls[0]?.parameters ?? {})).toEqual(['business']);
    expect(JSON.parse(calls[0]?.parameters?.business ?? '')).toEqual({
      name: 'Panadería Ejemplo',
      category: 'Panadería',
      locationSummary: 'Local 1',
      hasPhysicalStore: true,
      whatsappNumber: '573001234567',
      websiteUrl: 'https://example.com/panaderia',
      openingHours: [{ dayOfWeek: 1, opens: '08:00', closes: '18:00' }],
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ejemplo&query_place_id=EXAMPLE_PLACE_ID_1',
      description: null,
      instagramUrl: null,
      googlePlaceId: 'EXAMPLE_PLACE_ID_1',
      latitude: 10.987654,
      longitude: -74.123456,
      coordinatesSource: 'maps_listing',
      sourceType: 'storefront',
      sourceCategory: null,
      activityScore: 73,
      activityAsOf: '2026-11-01',
      lastVerifiedAt: null,
      consentedAt: '2026-11-10',
      consentChannel: 'in_person',
      adminNotes: 'Nota inventada',
    });
  });

  it('casts each value in SQL to its column type', async () => {
    const { execute, calls } = fakeExecute();

    await upsertImportedBusiness(execute, business, { writeHours: true });

    const sql = calls[0]?.sql ?? '';
    expect(sql).toContain('CAST(:business AS jsonb)');
    expect(sql).toContain("(b ->> 'hasPhysicalStore')::boolean");
    expect(sql).toContain("(b ->> 'latitude')::double precision");
    expect(sql).toContain("(b ->> 'longitude')::double precision");
    expect(sql).toContain("(b ->> 'activityScore')::integer");
    for (const date of ['activityAsOf', 'lastVerifiedAt', 'consentedAt']) {
      expect(sql).toContain(`(b ->> '${date}')::date`);
    }
  });

  it('sets the creation time only on insert, through the column default (scenario "A new business")', async () => {
    const { execute, calls } = fakeExecute();

    await upsertImportedBusiness(execute, business, { writeHours: true });
    await upsertImportedBusiness(execute, business, { writeHours: false });

    for (const call of calls) {
      expect(call.sql).not.toContain('created_at');
    }
  });

  it('makes the business active again on update (scenario "A business that comes back")', async () => {
    const { execute, calls } = fakeExecute();

    await upsertImportedBusiness(execute, business, { writeHours: true });

    expect(updatePart(calls[0]?.sql ?? '')).toContain('is_active = true');
  });

  it('writes the shown and the imported hours together, from the same value', async () => {
    const { execute, calls } = fakeExecute();

    await upsertImportedBusiness(execute, business, { writeHours: true });

    const sql = calls[0]?.sql ?? '';
    expect(sql.match(/b -> 'openingHours'/g)).toHaveLength(2);
    expect(updatePart(sql)).toContain('opening_hours = EXCLUDED.opening_hours');
    expect(updatePart(sql)).toContain('imported_opening_hours = EXCLUDED.imported_opening_hours');
  });

  it('keeps both hours when the plan keeps the edited hours (design D-8)', async () => {
    const { execute, calls } = fakeExecute();

    await upsertImportedBusiness(execute, business, { writeHours: false });

    expect(updatePart(calls[0]?.sql ?? '')).not.toMatch(/opening_hours/);
    expect(updatePart(calls[0]?.sql ?? '')).toContain('name = EXCLUDED.name');
  });
});

describe('deactivateImportedBusiness', () => {
  it('makes the business inactive with an UPDATE, never a DELETE (design D-4)', async () => {
    const { execute, calls } = fakeExecute();

    await deactivateImportedBusiness(execute, 'EXAMPLE_PLACE_ID_2');

    expect(calls[0]?.sql).toMatch(/^\s*UPDATE businesses SET is_active = false\s+WHERE google_place_id = :googlePlaceId/);
    expect(calls[0]?.sql).not.toMatch(/DELETE/i);
    expect(calls[0]?.parameters).toEqual({ googlePlaceId: 'EXAMPLE_PLACE_ID_2' });
  });
});

describe('recordImport and findLastImport', () => {
  it('records the hash, the date, and the counts as string parameters cast in SQL', async () => {
    const { execute, calls } = fakeExecute();

    await recordImport(execute, {
      fileSha256: 'a'.repeat(64),
      generatedAt: '2026-11-21',
      counts: { added: 3, changed: 2, deactivated: 1, reactivated: 0, unchanged: 46 },
    });

    expect(calls[0]?.sql).toMatch(/^\s*INSERT INTO business_imports/);
    expect(calls[0]?.sql).toContain('CAST(:generatedAt AS date)');
    expect(calls[0]?.sql).toContain('CAST(:addedCount AS integer)');
    expect(calls[0]?.parameters).toEqual({
      fileSha256: 'a'.repeat(64),
      generatedAt: '2026-11-21',
      addedCount: '3',
      changedCount: '2',
      deactivatedCount: '1',
      reactivatedCount: '0',
      unchangedCount: '46',
    });
  });

  it('reads the most recent import record', async () => {
    const { execute, calls } = fakeExecute([{ file_sha256: 'b'.repeat(64), generated_at: '2026-11-21' }]);

    expect(await findLastImport(execute)).toEqual({ fileSha256: 'b'.repeat(64), generatedAt: '2026-11-21' });
    expect(calls[0]?.sql).toMatch(/ORDER BY applied_at DESC\s+LIMIT 1/);
  });

  it('returns null when the environment has no import yet', async () => {
    const { execute } = fakeExecute([]);

    expect(await findLastImport(execute)).toBeNull();
  });
});
