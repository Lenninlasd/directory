import type { BusinessRow } from '../domain/business.ts';

/** Runs a SQL statement and returns its records as plain objects (RDS Data API, JSON format). */
export type QueryRecords = (sql: string) => Promise<Record<string, unknown>[]>;

// `created_at` is formatted in SQL as ISO 8601 UTC with milliseconds, so the result
// does not depend on how the Data API serializes timestamps (plan 001, R-2 and R-6).
const FIND_ACTIVE_BUSINESSES_SQL = `
SELECT
  id::text AS id,
  name AS name,
  category AS category,
  location_summary AS location_summary,
  has_physical_store AS has_physical_store,
  whatsapp_number AS whatsapp_number,
  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at
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
  };
}

export async function findActiveBusinessRows(query: QueryRecords): Promise<BusinessRow[]> {
  const records = await query(FIND_ACTIVE_BUSINESSES_SQL);
  return records.map(toBusinessRow);
}
