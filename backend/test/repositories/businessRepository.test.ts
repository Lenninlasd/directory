import { describe, expect, it } from 'vitest';
import type { Execute } from '../../src/db/dataApi.ts';
import {
  findActiveBusinessOpeningHours,
  findActiveBusinessRows,
  updateActiveBusinessOpeningHours,
  type QueryRecords,
} from '../../src/repositories/businessRepository.ts';

interface RecordedCall {
  sql: string;
}

function fakeQuery(records: Record<string, unknown>[]): { query: QueryRecords; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const query: QueryRecords = async (sql) => {
    calls.push({ sql });
    return records;
  };
  return { query, calls };
}

// A record as the RDS Data API returns it with `formatRecordsAs: JSON` (plan 002, V-5).
const sampleRecord = {
  id: '0b9f6c1e-6d0a-4c43-9f43-3a6c1d2e8a10',
  name: 'Panadería La Esquina',
  category: 'Bakery',
  location_summary: 'Centro Comercial Plaza, local 12',
  has_physical_store: true,
  whatsapp_number: '573001234567',
  created_at: '2026-10-01T12:30:45.123Z',
  website_url: 'https://example.com/panaderia',
  opening_hours: '[{"dayOfWeek": 1, "opens": "07:00", "closes": "19:00"}]',
};

describe('findActiveBusinessRows', () => {
  it('filters on active businesses only (AC-1.2)', async () => {
    const { query, calls } = fakeQuery([]);

    await findActiveBusinessRows(query);

    expect(calls[0]?.sql).toMatch(/WHERE\s+is_active\s*=\s*true/i);
  });

  it('selects exactly the columns the API needs', async () => {
    const { query, calls } = fakeQuery([]);

    await findActiveBusinessRows(query);

    const aliases = [...(calls[0]?.sql ?? '').matchAll(/\bAS\s+(\w+)/gi)].map((match) => match[1]);
    expect(aliases.sort()).toEqual([
      'category',
      'created_at',
      'has_physical_store',
      'id',
      'location_summary',
      'name',
      'opening_hours',
      'website_url',
      'whatsapp_number',
    ]);
  });

  it('sends the same constant SQL on every call', async () => {
    const { query, calls } = fakeQuery([]);

    await findActiveBusinessRows(query);
    await findActiveBusinessRows(query);

    expect(calls).toHaveLength(2);
    expect(calls[0]?.sql).toBe(calls[1]?.sql);
  });

  it('converts a Data API record to a BusinessRow with correct types', async () => {
    const { query } = fakeQuery([sampleRecord]);

    const rows = await findActiveBusinessRows(query);

    expect(rows).toEqual([
      {
        id: '0b9f6c1e-6d0a-4c43-9f43-3a6c1d2e8a10',
        name: 'Panadería La Esquina',
        category: 'Bakery',
        locationSummary: 'Centro Comercial Plaza, local 12',
        hasPhysicalStore: true,
        whatsappNumber: '573001234567',
        createdAt: new Date('2026-10-01T12:30:45.123Z'),
        websiteUrl: 'https://example.com/panaderia',
        openingHours: '[{"dayOfWeek": 1, "opens": "07:00", "closes": "19:00"}]',
      },
    ]);
  });

  it('keeps a NULL WhatsApp number as null', async () => {
    const { query } = fakeQuery([{ ...sampleRecord, whatsapp_number: null }]);

    const rows = await findActiveBusinessRows(query);

    expect(rows[0]?.whatsappNumber).toBeNull();
  });

  // Design D-3: the Data API documents text as a string, but not the shape of a JSONB value.
  it('reads the opening hours as text', async () => {
    const { query, calls } = fakeQuery([]);

    await findActiveBusinessRows(query);

    expect(calls[0]?.sql).toMatch(/opening_hours::text AS opening_hours/);
  });

  it('keeps a NULL website and NULL opening hours as null', async () => {
    const { query } = fakeQuery([{ ...sampleRecord, website_url: null, opening_hours: null }]);

    const rows = await findActiveBusinessRows(query);

    expect(rows[0]?.websiteUrl).toBeNull();
    expect(rows[0]?.openingHours).toBeNull();
  });

  it('fails clearly when the opening hours are not text', async () => {
    const { query } = fakeQuery([{ ...sampleRecord, opening_hours: [{ dayOfWeek: 1 }] }]);

    await expect(findActiveBusinessRows(query)).rejects.toThrow(/opening_hours/);
  });

  it('fails clearly when a record has an unexpected shape', async () => {
    const { query } = fakeQuery([{ ...sampleRecord, has_physical_store: 'yes' }]);

    await expect(findActiveBusinessRows(query)).rejects.toThrow(/has_physical_store/);
  });

  it('fails clearly when the creation time is not a valid date', async () => {
    const { query } = fakeQuery([{ ...sampleRecord, created_at: 'not a date' }]);

    await expect(findActiveBusinessRows(query)).rejects.toThrow(/created_at/);
  });
});

interface RecordedExecution {
  sql: string;
  parameters: Record<string, string> | undefined;
}

function fakeExecute(records: Record<string, unknown>[]): { execute: Execute; calls: RecordedExecution[] } {
  const calls: RecordedExecution[] = [];
  const execute: Execute = async (sql, parameters) => {
    calls.push({ sql, parameters });
    return records;
  };
  return { execute, calls };
}

const BUSINESS_ID = '0b9f6c1e-6d0a-4c43-9f43-3a6c1d2e8a10';
const WEEK_JSON = '[{"dayOfWeek":1,"opens":"08:00","closes":"18:00"}]';

// Design D-10: the stored hours of one active business, read as text for the interpretation.
describe('findActiveBusinessOpeningHours', () => {
  it('reads one active business by id, casting the id to uuid and the hours to text', async () => {
    const { execute, calls } = fakeExecute([]);

    await findActiveBusinessOpeningHours(execute, BUSINESS_ID);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.sql).toMatch(/opening_hours::text AS opening_hours/);
    expect(calls[0]?.sql).toMatch(/WHERE\s+id\s*=\s*CAST\(:id AS uuid\)/i);
    expect(calls[0]?.sql).toMatch(/AND\s+is_active\s*=\s*true/i);
    expect(calls[0]?.parameters).toEqual({ id: BUSINESS_ID });
  });

  it('never puts the id into the SQL text', async () => {
    const { execute, calls } = fakeExecute([]);

    await findActiveBusinessOpeningHours(execute, BUSINESS_ID);

    expect(calls[0]?.sql).not.toContain(BUSINESS_ID);
  });

  it('returns the stored hours as text when the business is found', async () => {
    const { execute } = fakeExecute([{ opening_hours: WEEK_JSON }]);

    expect(await findActiveBusinessOpeningHours(execute, BUSINESS_ID)).toEqual({ openingHours: WEEK_JSON });
  });

  it('returns null hours for a found business with no stored hours', async () => {
    const { execute } = fakeExecute([{ opening_hours: null }]);

    expect(await findActiveBusinessOpeningHours(execute, BUSINESS_ID)).toEqual({ openingHours: null });
  });

  it('returns null when no active business has that id', async () => {
    const { execute } = fakeExecute([]);

    expect(await findActiveBusinessOpeningHours(execute, BUSINESS_ID)).toBeNull();
  });

  it('fails clearly when the hours are not text', async () => {
    const { execute } = fakeExecute([{ opening_hours: [{ dayOfWeek: 1 }] }]);

    await expect(findActiveBusinessOpeningHours(execute, BUSINESS_ID)).rejects.toThrow(/opening_hours/);
  });
});

// Design D-10: one UPDATE that only touches an active business and reports whether it did.
describe('updateActiveBusinessOpeningHours', () => {
  it('updates the hours of one active business with named parameters cast to uuid and jsonb', async () => {
    const { execute, calls } = fakeExecute([{ id: BUSINESS_ID }]);

    await updateActiveBusinessOpeningHours(execute, BUSINESS_ID, WEEK_JSON);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.sql).toMatch(/^\s*UPDATE businesses\s+SET opening_hours = CAST\(:openingHours AS jsonb\)/i);
    expect(calls[0]?.sql).toMatch(/WHERE\s+id\s*=\s*CAST\(:id AS uuid\)\s+AND\s+is_active\s*=\s*true/i);
    expect(calls[0]?.sql).toMatch(/RETURNING id::text AS id/i);
    expect(calls[0]?.parameters).toEqual({ id: BUSINESS_ID, openingHours: WEEK_JSON });
  });

  it('never puts the id or the hours into the SQL text', async () => {
    const { execute, calls } = fakeExecute([{ id: BUSINESS_ID }]);

    await updateActiveBusinessOpeningHours(execute, BUSINESS_ID, WEEK_JSON);

    expect(calls[0]?.sql).not.toContain(BUSINESS_ID);
    expect(calls[0]?.sql).not.toContain('dayOfWeek');
  });

  it('returns true when the business was updated', async () => {
    const { execute } = fakeExecute([{ id: BUSINESS_ID }]);

    expect(await updateActiveBusinessOpeningHours(execute, BUSINESS_ID, WEEK_JSON)).toBe(true);
  });

  it('returns false when no active business has that id, so nothing was written', async () => {
    const { execute } = fakeExecute([]);

    expect(await updateActiveBusinessOpeningHours(execute, BUSINESS_ID, WEEK_JSON)).toBe(false);
  });
});
