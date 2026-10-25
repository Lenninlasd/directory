import type { Business, BusinessRow } from '../domain/business.ts';
import { normalizeWhatsappNumber } from '../domain/whatsappNumber.ts';

export type FindActiveBusinessRows = () => Promise<BusinessRow[]>;

const spanishCollator = new Intl.Collator('es');

/** Newest first, then name with Spanish rules, then id (spec 001 FR-5, plan 001 section 4). */
function compareRows(left: BusinessRow, right: BusinessRow): number {
  const byCreation = right.createdAt.getTime() - left.createdAt.getTime();
  if (byCreation !== 0) {
    return byCreation;
  }
  const byName = spanishCollator.compare(left.name, right.name);
  if (byName !== 0) {
    return byName;
  }
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function toBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    locationSummary: row.locationSummary,
    hasPhysicalStore: row.hasPhysicalStore,
    whatsappNumber: normalizeWhatsappNumber(row.whatsappNumber),
  };
}

export async function listActiveBusinesses(findRows: FindActiveBusinessRows): Promise<Business[]> {
  const rows = await findRows();
  return [...rows].sort(compareRows).map(toBusiness);
}
