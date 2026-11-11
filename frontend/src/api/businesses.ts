/** A weekly opening range (directory spec, "Opening hours validity"). */
export interface OpeningHoursRange {
  /** 1 is Monday, 7 is Sunday. */
  dayOfWeek: number;
  /** `HH:MM`, 24-hour. */
  opens: string;
  /** `HH:MM`, 24-hour; `24:00` is midnight. */
  closes: string;
}

/** A business as returned by `GET /businesses` (directory spec, "Business list API"). */
export interface Business {
  id: string;
  name: string;
  category: string;
  locationSummary: string;
  hasPhysicalStore: boolean;
  /** Normalized digits with country code, or `null` when missing or invalid. */
  whatsappNumber: string | null;
  /** An `https` URL, or `null` when missing or invalid. */
  websiteUrl: string | null;
  /** Ranges sorted by day and opening time, or `[]` when missing or invalid. */
  openingHours: OpeningHoursRange[];
}

interface BusinessesResponse {
  businesses: Business[];
}

// VITE_API_BASE_URL is empty in local development, where the Vite dev server proxies `/businesses`.
export async function fetchBusinesses(): Promise<Business[]> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/businesses`);
  if (!response.ok) {
    throw new Error(`GET /businesses failed with status ${response.status}`);
  }
  const body = (await response.json()) as BusinessesResponse;
  return body.businesses;
}
