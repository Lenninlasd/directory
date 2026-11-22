import { normalizeOpeningHours, type OpeningHoursRange } from '../domain/openingHours.ts';
import type { HandoffBusiness, HandoffFile, HandoffPrivateFields } from './handoffFile.ts';

/**
 * The import planner (business-import spec, "Matching stored businesses" and "Opening hours edited in admin mode";
 * import-businesses design D-3, D-4, D-8). Pure: it compares the stored businesses that have a place id with the
 * checked file and decides what to write. Businesses without a place id never reach it.
 */

/** A stored business with a place id, as the import repository reads it. */
export interface StoredBusiness extends Omit<HandoffBusiness, 'openingHours' | 'private'> {
  id: string;
  isActive: boolean;
  /** Raw JSON text of `opening_hours`: what the directory shows, possibly edited in admin mode. */
  openingHours: string | null;
  /** Raw JSON text of `imported_opening_hours`: what the previous import wrote. */
  importedOpeningHours: string | null;
  private: { [Field in keyof HandoffPrivateFields]: Field extends 'googlePlaceId' ? string : HandoffPrivateFields[Field] | null };
}

/** A business to upsert. `writeHours` is `false` when its hours were edited in admin mode and must be kept. */
export interface PlannedWrite {
  business: HandoffBusiness;
  writeHours: boolean;
}

/** Names a business in the command's output. The place id is public: it is part of the Maps link. */
export interface PlannedName {
  googlePlaceId: string;
  name: string;
}

export interface ImportPlan {
  added: PlannedWrite[];
  changed: PlannedWrite[];
  reactivated: PlannedWrite[];
  /** In the file and already stored as it is: nothing is written. */
  unchanged: HandoffBusiness[];
  /** Active, stored, and missing from the file: made inactive, never deleted (design D-4). */
  deactivated: PlannedName[];
  /** Hours kept because they were edited in admin mode after the previous import (design D-8). */
  editedHours: PlannedName[];
}

const PUBLIC_FIELDS = [
  'name',
  'category',
  'locationSummary',
  'hasPhysicalStore',
  'whatsappNumber',
  'websiteUrl',
  'mapsUrl',
  'description',
  'instagramUrl',
] as const;

const PRIVATE_FIELDS = [
  'googlePlaceId',
  'latitude',
  'longitude',
  'coordinatesSource',
  'sourceType',
  'sourceCategory',
  'activityScore',
  'activityAsOf',
  'lastVerifiedAt',
  'consentedAt',
  'consentChannel',
  'adminNotes',
] as const;

/** Weeks are compared after sorting, so key order, spacing, and range order in the stored text do not matter. */
function sameWeek(left: OpeningHoursRange[], right: OpeningHoursRange[]): boolean {
  const key = (week: OpeningHoursRange[]) => week.map((range) => `${range.dayOfWeek} ${range.opens} ${range.closes}`).join('|');
  return key(left) === key(right);
}

function sameFieldsApartFromHours(stored: StoredBusiness, business: HandoffBusiness): boolean {
  return (
    PUBLIC_FIELDS.every((field) => stored[field] === business[field]) &&
    PRIVATE_FIELDS.every((field) => stored.private[field] === business.private[field])
  );
}

/** Whether to write the file's hours, and whether the business must be listed as having edited hours. */
function planHours(stored: StoredBusiness, fileWeek: OpeningHoursRange[]) {
  const shownWeek = normalizeOpeningHours(stored.openingHours);
  const importedWeek = normalizeOpeningHours(stored.importedOpeningHours);
  const editedSinceImport = !sameWeek(shownWeek, importedWeek);

  if (editedSinceImport && !sameWeek(shownWeek, fileWeek)) {
    return { writeHours: false, listAsEdited: true, hoursChange: false };
  }
  // Not edited, or edited to what the file says: both columns take the file's hours.
  return { writeHours: true, listAsEdited: false, hoursChange: !sameWeek(shownWeek, fileWeek) || !sameWeek(importedWeek, fileWeek) };
}

function nameOf(business: { name: string; private: { googlePlaceId: string } }): PlannedName {
  return { googlePlaceId: business.private.googlePlaceId, name: business.name };
}

export function planImport(storedBusinesses: StoredBusiness[], file: HandoffFile): ImportPlan {
  const plan: ImportPlan = { added: [], changed: [], reactivated: [], unchanged: [], deactivated: [], editedHours: [] };
  const storedByPlaceId = new Map(storedBusinesses.map((stored) => [stored.private.googlePlaceId, stored]));
  const placeIdsInFile = new Set<string>();

  for (const business of file.businesses) {
    placeIdsInFile.add(business.private.googlePlaceId);
    const stored = storedByPlaceId.get(business.private.googlePlaceId);
    if (stored === undefined) {
      plan.added.push({ business, writeHours: true });
      continue;
    }

    const { writeHours, listAsEdited, hoursChange } = planHours(stored, business.openingHours);
    if (listAsEdited) {
      plan.editedHours.push(nameOf(business));
    }
    if (!stored.isActive) {
      plan.reactivated.push({ business, writeHours });
    } else if (hoursChange || !sameFieldsApartFromHours(stored, business)) {
      plan.changed.push({ business, writeHours });
    } else {
      plan.unchanged.push(business);
    }
  }

  for (const stored of storedBusinesses) {
    if (stored.isActive && !placeIdsInFile.has(stored.private.googlePlaceId)) {
      plan.deactivated.push(nameOf(stored));
    }
  }
  return plan;
}

/** The counts recorded with each applied import (business-import spec, "Import record"). */
export function countPlan(plan: ImportPlan) {
  return {
    added: plan.added.length,
    changed: plan.changed.length,
    deactivated: plan.deactivated.length,
    reactivated: plan.reactivated.length,
    unchanged: plan.unchanged.length,
  };
}
