# Proposal: Add business opening hours and website

## Why

Residents open a business's details to decide whether to contact it, and today the dialog only says where the business is. They cannot tell when it is open, or find its website, without asking over WhatsApp. The playground's `DeliveryView` explored both fields in the detail dialog with mock data. The owner now wants them in the product.

## What Changes

- **Database:** two nullable columns on `businesses`, added by one migration: `website_url` (text) and `opening_hours` (JSON).
- **API:** `GET /businesses` adds two fields to each business:
  - `websiteUrl`: the website, or `null` when it is missing or not an `https` URL.
  - `openingHours`: the weekly hours as a list of ranges (day, opening time, closing time), or `[]` when they are missing or invalid.
- **Detail dialog:** two rows under "Ubicación", each hidden when the business has no data for it:
  - "Horario" lists the hours, grouping consecutive days with the same hours, for example "Lunes a viernes · 8:00 a. m. – 6:00 p. m.".
  - "Página web" shows the address as a link with an external-link icon. It opens in a new tab.
- **Interface text:** the two row labels, the day names, and "Cerrado".
- **Deliberate exclusions:** "website" and "opening hours" leave the "Extended business attributes" row.
- **`dev` seed:** example hours and `example.com` websites on some sample businesses.

The API change only adds fields, so nothing that reads the current response breaks.

## Out of scope

- "Open now" status and anything else that depends on the current time.
- Hours that cross midnight in one range, and holiday or special-date hours.
- Hours or website on the tile. The tile does not change.
- The other attributes the playground explored (description, photos, gallery), and its confirmation dialog before leaving the site.
- Loading the real hours and websites of the real businesses. That is a data migration (`finish-mvp-rollout` task 2.1 or a later one).
- Any change to `playground/`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `directory`:
  - MODIFIED "Business list API", "Business detail dialog", "Interface text", and "Deliberate exclusions".
  - ADDED "Detail dialog hours and website rows", "Website validity", "Opening hours validity", "Opening hours display", and "Website link".

`infrastructure` does not change. The new migration follows its "Database migrations" requirement: it only adds columns, so it works with both the previous and the new backend.

## Impact

- `backend/migrations/`: one new migration. `backend/seeds/dev_businesses.sql`: example values.
- `backend/src/`: the `Business` types, two small validators in `domain/`, two more columns in the repository query, and the mapping in the service.
- `frontend/src/`: the `Business` type, a pure function that formats the hours, two rows in `BusinessDetailDialog.tsx`, new texts in `strings.ts`, and one icon.
- Tests for each of the above.
- No new packages and no infrastructure changes.
