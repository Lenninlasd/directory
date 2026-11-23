import type { Execute } from '../db/dataApi.ts';
import type { ConsentChannel, HandoffBusiness, SourceType } from '../import/handoffFile.ts';
import type { StoredBusiness } from '../import/importPlan.ts';

/**
 * SQL of the import command (import-businesses design D-3, D-4, D-7, D-8). Separate from `businessRepository.ts`,
 * whose public query never reads a private column.
 */

// Hours and dates are cast to text: the Data API documents text, not the form of JSONB or DATE values.
const FIND_IMPORTED_BUSINESSES_SQL = `
SELECT
  id::text AS id,
  is_active AS is_active,
  name AS name,
  category AS category,
  location_summary AS location_summary,
  has_physical_store AS has_physical_store,
  whatsapp_number AS whatsapp_number,
  website_url AS website_url,
  opening_hours::text AS opening_hours,
  maps_url AS maps_url,
  description AS description,
  instagram_url AS instagram_url,
  google_place_id AS google_place_id,
  latitude AS latitude,
  longitude AS longitude,
  coordinates_source AS coordinates_source,
  source_type AS source_type,
  source_category AS source_category,
  activity_score AS activity_score,
  activity_as_of::text AS activity_as_of,
  last_verified_at::text AS last_verified_at,
  consented_at::text AS consented_at,
  consent_channel AS consent_channel,
  admin_notes AS admin_notes,
  imported_opening_hours::text AS imported_opening_hours
FROM businesses
WHERE google_place_id IS NOT NULL
`;

// `dataApi.ts` sends only strings, and many values are null, so the business travels as one JSON string.
// `->>` gives SQL NULL for a JSON null, and each value is cast to its column type.
// `created_at` and `is_active` are left to their defaults on insert: one transaction gives every new business
// the same creation time (business-import spec, "Order after the first import").
const UPSERT_INSERT_PART = `
INSERT INTO businesses (
  name, category, location_summary, has_physical_store, whatsapp_number, website_url, opening_hours,
  maps_url, description, instagram_url,
  google_place_id, latitude, longitude, coordinates_source, source_type, source_category,
  activity_score, activity_as_of, last_verified_at, consented_at, consent_channel, admin_notes,
  imported_opening_hours
)
SELECT
  b ->> 'name', b ->> 'category', b ->> 'locationSummary', (b ->> 'hasPhysicalStore')::boolean,
  b ->> 'whatsappNumber', b ->> 'websiteUrl', b -> 'openingHours',
  b ->> 'mapsUrl', b ->> 'description', b ->> 'instagramUrl',
  b ->> 'googlePlaceId', (b ->> 'latitude')::double precision, (b ->> 'longitude')::double precision,
  b ->> 'coordinatesSource', b ->> 'sourceType', b ->> 'sourceCategory',
  (b ->> 'activityScore')::integer, (b ->> 'activityAsOf')::date, (b ->> 'lastVerifiedAt')::date,
  (b ->> 'consentedAt')::date, b ->> 'consentChannel', b ->> 'adminNotes',
  b -> 'openingHours'
FROM (SELECT CAST(:business AS jsonb) AS b) AS input
ON CONFLICT (google_place_id) DO UPDATE SET
  is_active = true,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  location_summary = EXCLUDED.location_summary,
  has_physical_store = EXCLUDED.has_physical_store,
  whatsapp_number = EXCLUDED.whatsapp_number,
  website_url = EXCLUDED.website_url,
  maps_url = EXCLUDED.maps_url,
  description = EXCLUDED.description,
  instagram_url = EXCLUDED.instagram_url,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  coordinates_source = EXCLUDED.coordinates_source,
  source_type = EXCLUDED.source_type,
  source_category = EXCLUDED.source_category,
  activity_score = EXCLUDED.activity_score,
  activity_as_of = EXCLUDED.activity_as_of,
  last_verified_at = EXCLUDED.last_verified_at,
  consented_at = EXCLUDED.consented_at,
  consent_channel = EXCLUDED.consent_channel,
  admin_notes = EXCLUDED.admin_notes`;

// Design D-8: both hours columns change together, or neither does when an admin edited the hours.
const UPSERT_WRITING_HOURS_SQL = `${UPSERT_INSERT_PART},
  opening_hours = EXCLUDED.opening_hours,
  imported_opening_hours = EXCLUDED.imported_opening_hours
`;
const UPSERT_KEEPING_HOURS_SQL = `${UPSERT_INSERT_PART}
`;

// Design D-4: deactivated, never deleted, so the consent record stays as evidence.
const DEACTIVATE_IMPORTED_BUSINESS_SQL = `
UPDATE businesses SET is_active = false
WHERE google_place_id = :googlePlaceId AND is_active = true
`;

const RECORD_IMPORT_SQL = `
INSERT INTO business_imports (
  file_sha256, generated_at, added_count, changed_count, deactivated_count, reactivated_count, unchanged_count
)
VALUES (
  :fileSha256, CAST(:generatedAt AS date), CAST(:addedCount AS integer), CAST(:changedCount AS integer),
  CAST(:deactivatedCount AS integer), CAST(:reactivatedCount AS integer), CAST(:unchangedCount AS integer)
)
`;

const FIND_LAST_IMPORT_SQL = `
SELECT file_sha256 AS file_sha256, generated_at::text AS generated_at
FROM business_imports
ORDER BY applied_at DESC
LIMIT 1
`;

// The error names the column, never the value: a value may be private.
function unexpected(column: string): Error {
  return new Error(`Unexpected value for column ${column} in an imported businesses record`);
}

function readString(record: Record<string, unknown>, column: string): string {
  const value = record[column];
  if (typeof value !== 'string') {
    throw unexpected(column);
  }
  return value;
}

function readNullableString(record: Record<string, unknown>, column: string): string | null {
  return record[column] === null ? null : readString(record, column);
}

function readNullableNumber(record: Record<string, unknown>, column: string): number | null {
  const value = record[column];
  if (value === null) {
    return null;
  }
  if (typeof value !== 'number') {
    throw unexpected(column);
  }
  return value;
}

function readBoolean(record: Record<string, unknown>, column: string): boolean {
  const value = record[column];
  if (typeof value !== 'boolean') {
    throw unexpected(column);
  }
  return value;
}

function toStoredBusiness(record: Record<string, unknown>): StoredBusiness {
  return {
    id: readString(record, 'id'),
    isActive: readBoolean(record, 'is_active'),
    name: readString(record, 'name'),
    category: readString(record, 'category'),
    locationSummary: readString(record, 'location_summary'),
    hasPhysicalStore: readBoolean(record, 'has_physical_store'),
    whatsappNumber: readNullableString(record, 'whatsapp_number'),
    websiteUrl: readNullableString(record, 'website_url'),
    openingHours: readNullableString(record, 'opening_hours'),
    mapsUrl: readNullableString(record, 'maps_url'),
    description: readNullableString(record, 'description'),
    instagramUrl: readNullableString(record, 'instagram_url'),
    importedOpeningHours: readNullableString(record, 'imported_opening_hours'),
    private: {
      googlePlaceId: readString(record, 'google_place_id'),
      latitude: readNullableNumber(record, 'latitude'),
      longitude: readNullableNumber(record, 'longitude'),
      coordinatesSource: readNullableString(record, 'coordinates_source'),
      // The CHECK constraints of migration 004 allow only the known values.
      sourceType: readNullableString(record, 'source_type') as SourceType | null,
      sourceCategory: readNullableString(record, 'source_category'),
      activityScore: readNullableNumber(record, 'activity_score'),
      activityAsOf: readNullableString(record, 'activity_as_of'),
      lastVerifiedAt: readNullableString(record, 'last_verified_at'),
      consentedAt: readNullableString(record, 'consented_at'),
      consentChannel: readNullableString(record, 'consent_channel') as ConsentChannel | null,
      adminNotes: readNullableString(record, 'admin_notes'),
    },
  };
}

/** Every stored business that has a place id, active or not, with all its fields. The seed rows have none. */
export async function findImportedBusinesses(execute: Execute): Promise<StoredBusiness[]> {
  const records = await execute(FIND_IMPORTED_BUSINESSES_SQL);
  return records.map(toStoredBusiness);
}

/** Adds the business, or updates the one with its place id and makes it active (design D-3). */
export async function upsertImportedBusiness(
  execute: Execute,
  business: HandoffBusiness,
  options: { writeHours: boolean },
): Promise<void> {
  const { private: privateFields, ...publicFields } = business;
  const parameter = JSON.stringify({ ...publicFields, ...privateFields });
  await execute(options.writeHours ? UPSERT_WRITING_HOURS_SQL : UPSERT_KEEPING_HOURS_SQL, { business: parameter });
}

export async function deactivateImportedBusiness(execute: Execute, googlePlaceId: string): Promise<void> {
  await execute(DEACTIVATE_IMPORTED_BUSINESS_SQL, { googlePlaceId });
}

export interface ImportCounts {
  added: number;
  changed: number;
  deactivated: number;
  reactivated: number;
  unchanged: number;
}

/** Records an applied import: the file's hash, its date, and the counts, never a business value. */
export async function recordImport(
  execute: Execute,
  record: { fileSha256: string; generatedAt: string; counts: ImportCounts },
): Promise<void> {
  const { counts } = record;
  await execute(RECORD_IMPORT_SQL, {
    fileSha256: record.fileSha256,
    generatedAt: record.generatedAt,
    addedCount: String(counts.added),
    changedCount: String(counts.changed),
    deactivatedCount: String(counts.deactivated),
    reactivatedCount: String(counts.reactivated),
    unchangedCount: String(counts.unchanged),
  });
}

/** The last import applied to the environment, or `null` when it has none (business-import spec, "Review in dev before prod"). */
export async function findLastImport(execute: Execute): Promise<{ fileSha256: string; generatedAt: string } | null> {
  const [record] = await execute(FIND_LAST_IMPORT_SQL);
  if (record === undefined) {
    return null;
  }
  return { fileSha256: readString(record, 'file_sha256'), generatedAt: readString(record, 'generated_at') };
}
