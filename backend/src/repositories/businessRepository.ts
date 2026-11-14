import type { Execute } from '../db/dataApi.ts';
import type { BusinessRow } from '../domain/business.ts';

/** Runs a SQL statement and returns its records as plain objects (RDS Data API, JSON format). */
export type QueryRecords = (sql: string) => Promise<Record<string, unknown>[]>;

// `created_at` is formatted in SQL as ISO 8601 UTC with milliseconds, so the result
// does not depend on how the Data API serializes timestamps (plan 001, R-2 and R-6).
// `opening_hours` is cast to text for the same reason: the Data API documents text, not JSONB (design D-3).
const FIND_ACTIVE_BUSINESSES_SQL = `
SELECT
  id::text AS id,
  name AS name,
  category AS category,
  location_summary AS location_summary,
  has_physical_store AS has_physical_store,
  whatsapp_number AS whatsapp_number,
  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
  website_url AS website_url,
  opening_hours::text AS opening_hours
FROM businesses
WHERE is_active = true
`;

function readString(record: Record<string, unknown>, column: string): string {
  const value = record[column];
  if (typeof value !== 'string') {
    throw new Error(`Unexpected value for column ${column} in businesses record`);
  }
  return value;
}

function readNullableString(record: Record<string, unknown>, column: string): string | null {
  return record[column] === null ? null : readString(record, column);
}

function readBoolean(record: Record<string, unknown>, column: string): boolean {
  const value = record[column];
  if (typeof value !== 'boolean') {
    throw new Error(`Unexpected value for column ${column} in businesses record`);
  }
  return value;
}

function readDate(record: Record<string, unknown>, column: string): Date {
  const date = new Date(readString(record, column));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Unexpected value for column ${column} in businesses record`);
  }
  return date;
}

function toBusinessRow(record: Record<string, unknown>): BusinessRow {
  return {
    id: readString(record, 'id'),
    name: readString(record, 'name'),
    category: readString(record, 'category'),
    locationSummary: readString(record, 'location_summary'),
    hasPhysicalStore: readBoolean(record, 'has_physical_store'),
    whatsappNumber: readNullableString(record, 'whatsapp_number'),
    createdAt: readDate(record, 'created_at'),
    websiteUrl: readNullableString(record, 'website_url'),
    openingHours: readNullableString(record, 'opening_hours'),
  };
}

export async function findActiveBusinessRows(query: QueryRecords): Promise<BusinessRow[]> {
  const records = await query(FIND_ACTIVE_BUSINESSES_SQL);
  return records.map(toBusinessRow);
}

// Design D-10: the id comes from the URL, so it is always a named parameter, cast in SQL.
// The service checks the UUID format first, so a malformed id never reaches the cast.
const FIND_ACTIVE_BUSINESS_OPENING_HOURS_SQL = `
SELECT opening_hours::text AS opening_hours
FROM businesses
WHERE id = CAST(:id AS uuid) AND is_active = true
`;

// `is_active` in the UPDATE too, so a business deactivated after it was read is never written.
const UPDATE_ACTIVE_BUSINESS_OPENING_HOURS_SQL = `
UPDATE businesses SET opening_hours = CAST(:openingHours AS jsonb)
WHERE id = CAST(:id AS uuid) AND is_active = true
RETURNING id::text AS id
`;

/**
 * The stored hours of one active business, as raw JSON text (business-editing spec, "Opening hours
 * interpretation"). Returns `null` when no active business has that id, and `{ openingHours: null }`
 * when the business exists but has no hours.
 */
export async function findActiveBusinessOpeningHours(
  execute: Execute,
  id: string,
): Promise<{ openingHours: string | null } | null> {
  const [record] = await execute(FIND_ACTIVE_BUSINESS_OPENING_HOURS_SQL, { id });
  return record === undefined ? null : { openingHours: readNullableString(record, 'opening_hours') };
}

/**
 * Stores the hours of one active business (business-editing spec, "Opening hours update"). The caller
 * passes a week already checked by `validateOpeningHoursForWriting`, as JSON text. Returns `false`
 * when no active business has that id, so nothing was written.
 */
export async function updateActiveBusinessOpeningHours(
  execute: Execute,
  id: string,
  openingHoursJson: string,
): Promise<boolean> {
  const records = await execute(UPDATE_ACTIVE_BUSINESS_OPENING_HOURS_SQL, { id, openingHours: openingHoursJson });
  return records.length > 0;
}
