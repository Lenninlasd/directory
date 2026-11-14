import type { OpeningHoursRange } from './businesses.ts';

/** The answer of the interpretation route (business-editing spec, "Opening hours interpretation"). */
export type Interpretation = { understood: true; openingHours: OpeningHoursRange[] } | { understood: false };

/** The route answered `401`: the admin key is missing or wrong (business-editing spec, "Wrong key"). */
export class UnauthorizedError extends Error {
  constructor() {
    super('The admin key was rejected');
    this.name = 'UnauthorizedError';
  }
}

function openingHoursUrl(businessId: string): string {
  return `${import.meta.env.VITE_API_BASE_URL ?? ''}/businesses/${encodeURIComponent(businessId)}/opening-hours`;
}

/** Sends a JSON body with the admin key, and returns the JSON answer of a `2xx` response. */
async function sendWithAdminKey(url: string, method: 'POST' | 'PUT', adminKey: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${adminKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (response.status === 401) {
    throw new UnauthorizedError();
  }
  if (!response.ok) {
    // The UI shows one friendly message; the status is only for debugging.
    throw new Error(`${method} ${url} failed with status ${response.status}`);
  }
  return response.json();
}

/** `POST /businesses/{id}/opening-hours/interpretation`. Interprets, never stores (design D-1). */
export async function interpretOpeningHours(input: {
  businessId: string;
  request: string;
  adminKey: string;
}): Promise<Interpretation> {
  const url = `${openingHoursUrl(input.businessId)}/interpretation`;
  return (await sendWithAdminKey(url, 'POST', input.adminKey, { request: input.request })) as Interpretation;
}

/** `PUT /businesses/{id}/opening-hours`. Stores the week the admin saw; returns it sorted (design D-1). */
export async function saveOpeningHours(input: {
  businessId: string;
  openingHours: OpeningHoursRange[];
  adminKey: string;
}): Promise<OpeningHoursRange[]> {
  const body = (await sendWithAdminKey(openingHoursUrl(input.businessId), 'PUT', input.adminKey, {
    openingHours: input.openingHours,
  })) as { openingHours: OpeningHoursRange[] };
  return body.openingHours;
}
