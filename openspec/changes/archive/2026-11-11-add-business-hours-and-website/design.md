# Design: Add business opening hours and website

## Context

See `proposal.md` for the motivation and `specs/directory/spec.md` for the required behavior. What shapes the approach:

- **Database.** One table, `businesses`, on Aurora PostgreSQL 17.11, reached only through the RDS Data API with `formatRecordsAs: 'JSON'`. The migration runner requires exactly one SQL statement per file, and so does the `dev` seed.
- **Backend.** The repository runs one SQL string and maps each record with strict readers. The service turns rows into API businesses, and validates the WhatsApp number with a pure function in `domain/`: the raw value is stored, and an invalid one becomes `null` when it is read.
- **Frontend.** The dialog renders a `<dl>` with the location. All text lives in `strings.ts`.
- **Playground.** `playground/src/BusinessDetailDialog.tsx` is the reference for the look of the two rows. Its mock data shape and its leave-site dialog are not used.

## Goals / Non-Goals

**Goals:**

- The same pattern as the WhatsApp number at every layer: store the raw value, validate it in a pure function, and hide what is invalid.
- One migration, one query, and no new packages.

**Non-Goals:**

- Nothing reads the current time, so there is no time zone handling.
- No tools to edit hours. They arrive through data migrations, like every business field.

## Decisions

| # | Decision | Alternatives discarded | Why |
|---|---|---|---|
| D-1 | Hours are stored in a `JSONB` column, `businesses.opening_hours`, as the same list of ranges the API returns: `[{ "dayOfWeek": 1, "opens": "07:00", "closes": "19:00" }]`. | (a) A separate `business_opening_hours` table with `CHECK` constraints. (b) Plain text lines. | The API always reads a business's whole week and never filters by it, so a table adds a second migration, a second query, and a harder seed for no benefit today. Plain text is simpler still, but the owner wants structured hours, which keep "open now" possible later. `JSONB` also rejects malformed JSON when it is written. |
| D-2 | One migration, `002_add_business_hours_and_website.sql`: `ALTER TABLE businesses ADD COLUMN website_url TEXT NULL, ADD COLUMN opening_hours JSONB NULL`. If the `finish-mvp-rollout` data migration merges first, it takes the next free number. | One migration per column. | `ALTER TABLE` accepts several actions in one statement, which meets the runner's one-statement rule. It only adds nullable columns, so the deployed backend keeps working (infrastructure spec, "Compatibility with both backend versions"). |
| D-3 | The repository selects `website_url` and `opening_hours::text` in the existing query, and reads both with the existing nullable-string reader. `BusinessRow` carries them as raw strings. | Reading the `JSONB` value as the Data API returns it. | The Data API documents that text comes back as a string, but not the shape of a JSON column. The cast makes it a documented case, as the query already does for `created_at`. |
| D-4 | A pure function `normalizeOpeningHours(raw: string \| null)` in `backend/src/domain/openingHours.ts` parses the JSON, checks every range against the spec, and returns the ranges sorted by day and opening time. If the JSON does not parse, or any range is invalid, it returns `[]`. Times are checked with a pattern and compared as strings, which works because they are zero-padded. | Dropping only the invalid ranges. Validation with `CHECK` constraints on the JSON. | Showing a week with one range missing would mislead residents, so all or nothing is safer (spec, "Invalid hours"). A constraint over JSON is long SQL that is hard to review, and the project already validates on read. |
| D-5 | A pure function `normalizeWebsiteUrl(raw: string \| null)` in `backend/src/domain/websiteUrl.ts` trims the value, parses it with the built-in `URL` class, and returns `url.href` when the protocol is `https:`. Otherwise it returns `null`. | Accepting `http:` too. A hand-written regex. A validation package. | The owner wants only secure links: an `http` page can be altered on the way, and browsers flag it as not secure. `URL` is part of Node 24, so no package is added. It rejects `javascript:` links and values without a scheme. `href` is the standard form, with the scheme and host in lowercase, so `HTTPS://Example.com/x` comes back as `https://example.com/x` and the frontend can remove the `https://` prefix safely. |
| D-6 | The frontend gets a pure module `features/businesses/openingHours.ts` with `formatOpeningHours(ranges): string[]`. It builds the hours text of each day from Monday to Sunday, merges consecutive days with equal text, and labels each group. Times are formatted by hand. A one-line `websiteLinkText(url)` lives in `features/businesses/website.ts`. | `Intl.DateTimeFormat('es-CO')` for times. Formatting inside the component. | The output of `Intl` differs between browsers ("a. m." or "a.m.", different spaces), so the exact texts of the spec could not be tested. Components only render (architecture rules). |
| D-7 | The dialog adds a `<dt>`/`<dd>` pair per row to the existing `<dl>`. The website is an `<a>` with `target="_blank"` and `rel="noopener noreferrer"`, the same as the WhatsApp button, followed by a new inline SVG `ExternalLinkIcon` with `aria-hidden="true"`. | Row icons and a list of rows, as in the playground. | It is the smallest change to the current markup, and the spec does not ask for row icons. |
| D-8 | `backend/seeds/dev_businesses.sql` adds the two columns to its `INSERT ... ON CONFLICT`: `example.com` websites on some rows, one `http://` website that must come back as `null`, a few example weeks (one with two ranges on a day and one closing at `24:00`), one invalid hours value, and rows with `NULL`. | A separate seed file. | The seed stays one statement. It already carries invalid WhatsApp numbers on purpose, to check the same kind of path. |

Documentation checked on 2026-11-11:

- PostgreSQL 17 manual: `ALTER TABLE` with several actions, and JSON types (section 8.14). Aurora PostgreSQL 17.11 is PostgreSQL 17.
- Amazon Aurora User Guide, "Data API" JSON result format: types other than numbers, booleans, and arrays are returned as strings.
- WHATWG URL Standard, the `URL` class in Node 24.
- No Tailwind feature beyond the utilities already in use.

## Risks / Trade-offs

- [A typo in a data migration stores invalid hours, and the row is silently hidden] → Data migrations are reviewed in a pull request, and the seed keeps one invalid example so the behavior is visible in `dev`. The person who loads data checks the dialog after the deploy.
- [The migration number collides with the pending `finish-mvp-rollout` data migration] → Whichever merges second takes the next number (D-2).
- [The dialog grows taller] → The WhatsApp button is in the fixed footer and "Ubicación" stays first, so the 320 px scenario still holds. Task 4.1 checks it.

## Migration Plan

1. Deploy `dev` with the seed, and check the two rows in the dialog.
2. Deploy `prod` with the documented command. Both fields are empty there, so the dialog looks as before until a data migration adds values.
3. Rollback: redeploy the previous backend and frontend. The two columns can stay, since the old backend ignores them.
