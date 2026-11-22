# Design: Import the pipeline's businesses

> **Status: approved by the owner in chat on 2026-11-22**, together with `proposal.md`, the spec deltas, and `tasks.md`.

## Context

- **The handoff file.** The pipeline's step 4 writes `output/outscraper/businesses.json`, which git ignores in `business-pipeline`. Its shape is `{ "generatedAt", "source": "google_maps", "count", "businesses" }` (pipeline `SPEC.md`, "Step 4: Publish", "Output").
  - Each business has the public fields `name`, `category`, `locationSummary`, `hasPhysicalStore`, `whatsappNumber`, `websiteUrl`, `openingHours`, `mapsUrl`, `description`, and `instagramUrl`, plus a `private` object with twelve fields.
  - Only `ready` places are included, sorted by name. Every run is a full snapshot.
- **The current file** (checked on 2026-11-21, counts only): 52 businesses, all with a unique `googlePlaceId`.
  - None has a WhatsApp number or consent.
  - 14 have a website and 11 an Instagram link. 5 have no hours.
  - Every `mapsUrl` uses Google's `https://www.google.com/maps/search/?api=1&query=…&query_place_id=…` form.
  - 3 businesses use a category outside the supported table.
- **The table.** `businesses` has `id`, `name`, `category`, `location_summary`, `has_physical_store`, `whatsapp_number`, `is_active`, `created_at`, `website_url`, and `opening_hours` (migrations `001` and `002`).
  - The repository reads an explicit column list, and the service validates every stored URL, number, and week when it reads them.
- **The tooling.** `backend/scripts/migrate.ts` already runs from the developer's machine against `dev` or `prod` through the RDS Data API, reading the stack outputs with the AWS CLI. `runMigrations` allows one statement per file (archived plan 002, P-11).
- **The Data API limits** (AWS API reference, checked 2026-11-21):
  - A transaction runs for at most 1 hour, and is rolled back if no call uses it for 3 minutes (`BeginTransaction`).
  - `sql` is at most 65,536 characters, and a response at most 1 MB (`ExecuteStatement`).
  - AWS warns that retrying a call after an SDK timeout can insert twice.
  - The engine is Aurora PostgreSQL `17.11` (`infra/template.yaml`). The design relies on `INSERT … ON CONFLICT` and on a `UNIQUE` nullable column, where several `NULL`s do not conflict. Both are standard PostgreSQL. They are checked against the Aurora PostgreSQL 17 documentation when the migrations are written (AGENTS.md, "Architecture rules"), not yet.

## Goals / Non-Goals

**Goals:**

- One command loads a reviewed snapshot into an environment, and running it again with the same file changes nothing.
- No business value and no private value is ever committed.
- `prod` receives exactly what the owner reviewed in `dev`.

**Non-Goals:**

- Real-time sync, and the items of "Deliberate exclusions" in the business-import spec, such as scheduled imports, other sources, and an undo command.

## Decisions

| # | Decision | Alternatives discarded and why |
|---|---|---|
| D-1 | **Local import command.** `node backend/scripts/import-businesses.ts <dev\|prod> <file> [--apply]` reads the handoff file from any path outside the repository and writes through the Data API with the developer's credentials, like `migrate.ts`. Without `--apply` it is a dry run: it validates and prints the plan: the counts, and the names of the businesses added, changed, deactivated, or reactivated, or whose edited hours are kept. It never prints a private value. (Owner decision A.) | Committed data migrations, generated migrations kept out of git, split public and private paths, an admin bulk route, an S3-triggered Lambda, encrypted committed files: see proposal, conflict 1. |
| D-2 | **`dev` review before `prod`.** Each environment gets a `business_imports` table with `file_sha256`, `generated_at`, the counts, and `applied_at`. A `prod` import refuses a file whose SHA-256 differs from the last import recorded in `dev`, which the command reads from the `dev` stack. Then it asks the person to type `prod`, as `infra/deploy.sh` does. The owner decides what reaches `prod` by changing the decisions file in the pipeline, importing into `dev` again, and reviewing. | (a) The typed confirmation alone: it does not prove `prod` gets the file that was reviewed. (b) Typing the hash by hand: the same check, with more room for error. (c) Copying `dev` rows to `prod`: it would carry the seed rows and test edits, and couple two environments that share nothing (infrastructure spec, "Environments"). |
| D-3 | **Upsert key `google_place_id`**, a `TEXT NULL UNIQUE` column. `INSERT … ON CONFLICT (google_place_id) DO UPDATE` makes a repeated call harmless, which also covers the Data API retry warning. Rows without a place id are never read or written by the import. | (a) Matching by name: names change and repeat. (b) An id made up by the pipeline: it has none, and the place id is already stable and the only Google id that may be kept indefinitely (pipeline `SPEC.md`). |
| D-4 | **Deactivate, never delete.** A row with a place id that is missing from the new file gets `is_active = false`, and a row that comes back is reactivated. `created_at` is set once on insert, so "Business order" stays stable across imports. | (a) Deleting: it loses the consent date and channel, which are the evidence the authorization existed. (b) Leaving the row active: a business excluded in the pipeline would stay public. |
| D-5 | **All or nothing.** The command validates every record before it begins a transaction, then writes everything in one transaction, with one statement per business. Any error refuses the file and lists the problems with the record position and place id. The rules are those of "Handoff file" and "Consent rules" in the business-import spec (D-6, D-9). The `prod` confirmation happens before the transaction begins, so the 3-minute idle limit is never reached. | (a) Skipping invalid records: the result would differ from what the pipeline's report showed the owner. (b) Trusting the pipeline: this repository is the one that publishes, and the consent rule is a legal one, so it is checked twice. |
| D-6 | **Rules for the new public fields**, checked strictly when imported and again when read, like `websiteUrl` (directory spec, "Website validity"). The API returns `null` for a missing or invalid value. `mapsUrl`: `https`, host `www.google.com`, path starting with `/maps/`. `instagramUrl`: exactly `https://www.instagram.com/<handle>/`, with a handle of 1 to 30 letters, digits, `.` or `_`. `description`: plain text, trimmed, 1 to 300 characters (the longest today has 148). | (a) Any `https` URL for the Maps link: a link labeled "Ver en Google Maps" must open Google Maps. (b) Also accepting `maps.app.goo.gl` short links: the pipeline never produces them, and a short link hides where it goes. (c) No length limit: the dialog must stay usable at 320 px (directory spec, "Business detail dialog"). |
| D-7 | **Private fields as columns of `businesses`.** `google_place_id`, `latitude` and `longitude` (`DOUBLE PRECISION`), `coordinates_source`, `source_type`, `source_category`, `activity_score` (`INTEGER`), `activity_as_of`, `last_verified_at` and `consented_at` (`DATE`), `consent_channel`, `admin_notes`, and `imported_opening_hours` (D-8). Enumerated values get `CHECK` constraints. The public query keeps its explicit column list and adds only `maps_url`, `description`, and `instagram_url`. The API contract test checks that the response has exactly the eleven fields. | (a) A separate `business_private` table: a second statement or a join for one-to-one data, while the explicit column list and the contract test already keep private columns out of the response. (b) A database `CHECK` that a WhatsApp number needs consent: the `dev` seed rows have numbers without consent and are re-applied by `--seed`, so the rule lives in the import (D-9). |
| D-8 | **Hours edited in admin mode win.** The import stores the hours it wrote in `imported_opening_hours`. On a later import it replaces `opening_hours` only while the stored hours still equal `imported_opening_hours` (`JSONB` equality). Otherwise an admin edited them: the import keeps them and lists the business in its output. `business-editing` does not change. | (a) Always overwriting: it would silently undo the owner's corrections, since the pipeline's decisions file cannot edit hours. (b) An `opening_hours_edited_at` column set by the `PUT` route: it changes a tested route and its spec for something the import can find out by itself. (c) Never updating hours after the first import: later updates from the pipeline would never arrive. |
| D-9 | **Consent.** A non-null `whatsappNumber`, and a `sourceType` of `private_group`, need `consentedAt` and a `consentChannel` from `whatsapp`, `in_person`, `phone_call`, or `email`, as in the pipeline. Otherwise the file is refused. The existing "WhatsApp number validity" rule still applies when the number is read. | Enforcing it only in the pipeline: see D-5 (b). |
| D-10 | **Dialog rows** (Owner decision B): <ul><li>The description is a paragraph below the rows. The "Ubicación" row is inside the scrolling area, so 300 characters above it would push it out of view on a 320 px screen (directory spec, "Business detail dialog", AC-8.5). The WhatsApp button stays in the fixed footer.</li><li>A "Ver en Google Maps" link, with the external-link icon of "Website link", goes under the location text in the "Ubicación" row.</li><li>An "Instagram" row after "Página web" shows `@handle` as its link text.</li></ul> Each one is hidden when its value is `null`, like the existing rows. The tile does not change. The exact Spanish texts go into the "Interface text" delta. | (a) A separate "Google Maps" row: the link belongs to the location it shows. (b) Showing the description on the tile: the tile shows only name, category, and location (directory spec, "Business tile"). (c) The description under the badge: see above. |
| D-11 | **The `dev` seed stays.** It covers the edge cases its comments list, and the import never touches rows without a place id. During the review, the 9 invented businesses appear next to the real ones. They are easy to tell apart: their websites use `example.com`. | Deactivating seed rows on import: it would break the checks of `infra/README.md` that depend on them. |
| D-12 | **No new packages.** The command uses `node:fs`, `node:crypto` (SHA-256), `JSON.parse`, the existing `createDataApi`, and the existing validators. Every rule lives in pure functions under `backend/src/` and is tested with invented records. The script only wires them to the file system, the AWS CLI, and the Data API, like `migrate.ts`. | A JSON schema library: the rules are a few explicit checks, and AGENTS.md hard boundary 5 asks for the few lines of code. |

## Risks / Trade-offs

- **The place id is not secret.** It is inside every public `mapsUrl` (`query_place_id`). For place ids, "private" means "not an API field". That is acceptable, because a place id is Google's public identifier.
- **Hours edited in `dev` do not travel to `prod`.** D-2 imports the file, not the `dev` rows.
  → The `prod` dry run lists the businesses whose hours were edited in `dev`, and the owner repeats those edits in `prod` admin mode. A later pipeline change could make hours editable in the decisions file.
- **Personal data brings duties.** Once the directory stores consent records and publishes personal data, such as a WhatsApp number with consent, it acts as the *responsable* of that data. Decree 1377 asks a responsable for a data processing policy (art. 13), and owners need a way to ask for correction or removal.
  → A separate change for the policy page and the "¿Es tu negocio?" link, before the `prod` import publishes any personal data. Today's file has no WhatsApp number, so the policy page does not block the first `prod` import.
- **Admin notes may name people.** → The command never prints or logs a private value. Its output shows names and public fields only.
- **The `dev` cluster may be paused.** The first call fails with `DatabaseResumingException`, as `migrate.ts` documents. → The command makes no change before its transaction begins, so running it again is safe.
- **The file may outgrow one transaction.** At 52 businesses, one statement each, the import is far from the 1-hour and 3-minute limits. → The dry run reports the count. A batch insert is only worth adding if the file reaches thousands of rows.

## Migration Plan

1. Merge this change. The schema migrations only add nullable columns and a new table, so the deployed backend keeps working (infrastructure spec, "Database migrations").
2. Deploy `dev`, run the dry run, run the import with `--apply`, and let the owner review the `dev` directory. Repeat after each change to the decisions file.
3. Run `finish-mvp-rollout`, as amended (proposal, conflict 2):
   - Task 1.1 deploys `prod`, which then has the new columns.
   - Task 2.1 imports the file reviewed in `dev`.

**Rollback:**

- Code: as in `infra/README.md`. The new columns are ignored by the previous backend.
- Data: import the previous file, or a corrected one, into `dev` and then `prod`. Keeping a dated copy of each imported file in the private folder next to the decisions file makes this possible, since the pipeline overwrites `businesses.json`.

## Open Questions

- None. New category icons are out of scope (proposal).
