/** A business as returned by `GET /businesses` (plan 001 section 3). */
export interface Business {
  id: string;
  name: string;
  category: string;
  locationSummary: string;
  hasPhysicalStore: boolean;
  /** Normalized digits with country code, or `null` when missing or invalid. */
  whatsappNumber: string | null;
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
