import { describe, expect, it } from 'vitest';
import { findActiveBusinessRows, type QueryRecords } from '../../src/repositories/businessRepository.ts';

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
      },
    ]);
  });

  it('keeps a NULL WhatsApp number as null', async () => {
    const { query } = fakeQuery([{ ...sampleRecord, whatsapp_number: null }]);

    const rows = await findActiveBusinessRows(query);

    expect(rows[0]?.whatsappNumber).toBeNull();
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
