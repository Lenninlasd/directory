import type { OpeningHoursRange } from './openingHours.ts';

/** A row of the `businesses` table, as read by the repository (plan 001 section 2). */
export interface BusinessRow {
  id: string;
  name: string;
  category: string;
  locationSummary: string;
  hasPhysicalStore: boolean;
  /** Raw value as entered by the team; validated by the service. */
  whatsappNumber: string | null;
  createdAt: Date;
  /** Raw value as entered by the team; validated by the service. */
  websiteUrl: string | null;
  /** Raw JSON text of the `opening_hours` column; validated by the service (design D-3). */
  openingHours: string | null;
}

/** A business as returned by `GET /businesses` (plan 001 section 3). */
export interface Business {
  id: string;
  name: string;
  category: string;
  locationSummary: string;
  hasPhysicalStore: boolean;
  /** Normalized digits with country code, or `null` when missing or invalid. */
  whatsappNumber: string | null;
  /** An `https` URL in standard form, or `null` when missing or invalid. */
  websiteUrl: string | null;
  /** Ranges sorted by day and opening time, or `[]` when missing or invalid. */
  openingHours: OpeningHoursRange[];
}
