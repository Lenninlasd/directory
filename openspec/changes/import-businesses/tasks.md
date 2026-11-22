# Tasks: Import the pipeline's businesses

These tasks start only after the owner approves the whole change in chat and the approval is recorded in `.openspec.yaml`.

**How to work each task:**

- Write the tests first, and confirm they fail for the right reason before writing the code.
- A task that adds or changes behavior ends with `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, and `pnpm spec:validate` passing. Then the agent stops and reports, and the human commits.
- No test calls AWS or reads the pipeline's `businesses.json`. Tests use invented businesses only: `example.com` websites, Instagram handles such as `example.panaderia`, place ids such as `EXAMPLE_PLACE_ID_1`, and made-up coordinates.
- No real business value is written to any file of this repository, including `infra/README.md` and test output (infrastructure spec, "Business data loading").

## 1. Database

- [x] 1.1 Add `backend/migrations/003_add_business_public_fields.sql`: one `ALTER TABLE businesses` that adds `maps_url`, `description`, and `instagram_url` as nullable `TEXT` (design D-6).
  - Check `ALTER TABLE … ADD COLUMN` against the Aurora PostgreSQL 17 documentation first, and record the version checked in design.md.
  - Tests first, in `backend/test/migrations/runMigrations.test.ts`: the file adds exactly those three nullable columns. The existing test that every file holds one statement covers it too.
  - Verify: the tests pass. The previous backend ignores the columns (infrastructure spec, "Database migrations").
- [x] 1.2 Add `backend/migrations/004_add_business_private_fields.sql`: one `ALTER TABLE businesses` that adds the private columns of design D-7, all nullable.
  - The columns: `google_place_id` (`TEXT UNIQUE`), `latitude`, `longitude`, `coordinates_source`, `source_type`, `source_category`, `activity_score`, `activity_as_of`, `last_verified_at`, `consented_at`, `consent_channel`, `admin_notes`, and `imported_opening_hours` (`JSONB`).
  - `CHECK` constraints for the `source_type` and `consent_channel` values, the `activity_score` range, and the coordinate ranges.
  - Check `UNIQUE` with several `NULL`s and `INSERT … ON CONFLICT (column)` against the Aurora PostgreSQL 17 documentation, and record it in design.md.
  - Tests first, in the same test file: every column is there and nullable, `google_place_id` is unique, and each `CHECK` is present.
  - Verify: the tests pass.
- [x] 1.3 Add `backend/migrations/005_create_business_imports.sql`: one `CREATE TABLE business_imports` (business-import spec, "Import record"; design D-2).
  - The columns: an id, `file_sha256`, `generated_at` (`DATE`), one count column per plan group, and `applied_at`, which defaults to the current time.
  - Tests first, in the same test file: the table and its columns. No column can hold a business value.
  - Verify: the tests pass.

## 2. Public fields in the API

- [x] 2.1 Add the validators for the three new fields in `backend/src/domain/`: `mapsUrl.ts`, `instagramUrl.ts`, and `description.ts`. Each returns the valid value, or `null`.
  - Tests first, in `backend/test/domain/`: every scenario of "Maps link validity", "Instagram link validity", and "Description validity" in the directory spec.
  - Also test the edges: a 30-character handle and a 31-character one, 300 and 301 characters, a description that is only line breaks, and `null`.
  - Verify: the tests pass, and the modules import nothing from Express or Lambda.
- [x] 2.2 Return the three fields from `GET /businesses`.
  - `businessRepository.ts` selects `maps_url`, `description`, and `instagram_url`, and still lists its columns explicitly. `BusinessRow` and `Business` in `domain/business.ts` get the fields, and `businessService.ts` applies the validators of 2.1.
  - Tests first:
    - The repository test checks that the query selects the three columns and no private column (`google_place_id`, `latitude`, `consented_at`, `admin_notes`, and the rest of design D-7).
    - The service tests cover each validity case.
    - The test "returns exactly the eight API fields (AC-2.4)" now expects the eleven fields of "Business list API". The spec changed, and the test stays as strict as before.
  - Verify: the tests pass, including the `GET /businesses` tests in `backend/test/handlers/`.
- [x] 2.3 Add invented cases for the three fields to `backend/seeds/dev_businesses.sql`, which stays one statement with fixed ids.
  - Every link stays on `example.com`, so `dev` never links to a real site and the seed test of `runMigrations.test.ts` stays unchanged.
  - The cases: a Maps link and an Instagram link on another host (for example `https://example.com/maps/panaderia`), both returned as `null`, a description with surrounding spaces, one with exactly 300 characters, one with markup, and missing values. List the cases in the file's comment, as the earlier changes did.
  - Valid Maps and Instagram links are covered by the tests of 2.1 and 3.1 to 3.2, and checked in `dev` with the imported businesses (tasks 5.2 and 5.3).
  - Verify: `pnpm -r test` passes, including "dev seed in backend/seeds" in `backend/test/migrations/runMigrations.test.ts`. Apply it in `dev` in task 5.1.

## 3. Detail dialog

- [x] 3.1 Add the Maps link to the "Ubicación" row of `BusinessDetailDialog.tsx` (directory spec, "Maps link").
  - `Business` in `frontend/src/api/businesses.ts` gets `mapsUrl`, `description`, and `instagramUrl`, and every test fixture gets `null` for them.
  - Add `mapsLinkText: 'Ver en Google Maps'` to `strings.ts`.
  - Tests first, in `frontend/test/features/businesses/BusinessDetailDialog.test.tsx` and `frontend/test/strings.test.ts`:
    - The link text and the `href`.
    - `target="_blank"` with `rel="noopener noreferrer"`.
    - The icon is hidden from assistive technology.
    - There is no link and no text when `mapsUrl` is `null`.
    - The exact wording.
  - Verify: the tests pass, and the existing dialog tests pass unchanged.
- [x] 3.2 Add the "Instagram" row after "Página web" (directory spec, "Detail dialog hours and website rows" and "Instagram link").
  - A pure helper turns the link into `@handle`, and `strings.ts` gets `instagramLabel: 'Instagram'`.
  - Tests first:
    - The link text "@example.panaderia".
    - The row comes after "Página web", and after "Ubicación" when the business has neither hours nor a website.
    - A new tab with `rel="noopener noreferrer"`, and the icon hidden from assistive technology.
    - No row when `instagramUrl` is `null`.
  - Verify: the tests pass.
- [x] 3.3 Add the description below the rows box (directory spec, "Business description"; design D-10).
  - Tests first:
    - A description is shown in full below the rows.
    - There is no paragraph when the description is `null`.
    - `<b>Pan</b>` is shown as text, with no `b` element in the dialog.
  - Verify: the tests pass. The 320 px check is manual, in task 5.3.

## 4. Import command

- [x] 4.1 Add the handoff file check in `backend/src/import/handoffFile.ts`, as a pure function that takes the file's text (business-import spec, "Handoff file", "Consent rules", and "All or nothing").
  - It returns the typed businesses, or every problem as position, place id, field, and rule, never the value.
  - It reuses the existing validators (`whatsappNumber.ts`, `websiteUrl.ts`, `validateOpeningHoursForWriting`) and those of 2.1, in their strict form: an invalid value is a problem, not `null`.
  - Tests first, in `backend/test/import/handoffFile.test.ts`, with invented files:
    - A valid file.
    - Every scenario of the three requirements: unknown and missing fields at each level, a wrong date, source, or count, a repeated place id, a number or `private_group` without consent, and one invalid business among valid ones.
    - Text that is not JSON.
    - That no problem message contains the invalid value.
  - Verify: the tests pass, and the module imports nothing from AWS, Express, or Lambda.
- [x] 4.2 Add the import planner in `backend/src/import/importPlan.ts`, a pure function from the stored businesses that have a place id and the checked file to the plan (design D-3, D-4, D-8).
  - The plan has the groups added, changed, deactivated, reactivated, and unchanged, plus the businesses whose hours were edited.
  - Tests first, in `backend/test/import/importPlan.test.ts`:
    - Every scenario of "Matching stored businesses", apart from the creation time, which is tested in 4.3.
    - Every scenario of "Opening hours edited in admin mode".
    - The same file planned twice gives only unchanged businesses.
    - Hours are compared as weeks, not as text.
  - Verify: the tests pass.
- [x] 4.3 Add `backend/src/repositories/importRepository.ts` (design D-3, D-4, D-7, D-8).
  - Functions to read the stored businesses that have a place id with all their fields, to upsert one business, to deactivate businesses by place id, to record an import, and to read the last import record.
  - Values go as named string parameters cast in SQL (`::jsonb`, `::date`, `::double precision`), as `dataApi.ts` sends only strings.
  - Tests first, in `backend/test/repositories/importRepository.test.ts`, with a fake `execute`:
    - The SQL and its parameters, including the `ON CONFLICT (google_place_id)` target.
    - `created_at` is set only on insert and never in the `UPDATE` part.
    - `opening_hours` and `imported_opening_hours` are written together, or both kept when the plan keeps the hours.
    - Deactivation is an `UPDATE`, never a `DELETE`.
    - The read query has `WHERE google_place_id IS NOT NULL`.
  - Verify: the tests pass, and `businessRepository.ts` is unchanged by this task.
- [x] 4.4 Add the command `backend/scripts/import-businesses.ts`, with injected dependencies like `backend/scripts/migrate.ts` (business-import spec, "Import command", "Review in dev before prod", "Import record", and "Private fields stay private"; design D-1, D-2, D-5).
  - Usage: `node backend/scripts/import-businesses.ts <dev|prod> <file> [--apply]`.
  - It reads the file and hashes it with `node:crypto`, checks it (4.1), reads the stored businesses, and plans (4.2).
  - It prints the plan. With `--apply` it writes everything in one `inTransaction`: the upserts, the deactivations, and the import record.
  - For `prod`, it compares the hash with the last import record of the `dev` stack and asks for `prod`, both before the transaction begins.
  - Tests first, in `backend/test/scripts/importBusinesses.test.ts`, with fake dependencies:
    - Every scenario of the four requirements: wrong arguments read nothing, a dry run writes nothing and records nothing, the `prod` hash check and the confirmation, a write failure exits non-zero.
    - The output of a dry run and of an apply contains none of the invented private values (coordinates, dates, score, consent channel, notes).
  - Verify: the tests pass, and the command needs no new package.
- [x] 4.5 Document the import in `infra/README.md`.
  - Cover where the file comes from, the dry run, applying to `dev`, the owner's review, and applying to `prod` with the hash check and the confirmation.
  - Cover what a refusal looks like, `DatabaseResumingException` on a paused `dev` cluster, and keeping a dated copy of each imported file in the private folder next to the decisions file (design, "Migration Plan").
  - Verify: the commands run as written in task 5.2.

## 5. Rollout in `dev`

- [x] 5.1 Deploy `dev` with `infra/deploy.sh dev`, then `node backend/scripts/migrate.ts dev --seed`.
  - Verify:
    - Migrations `003` to `005` are applied.
    - `curl "$API_URL/businesses"` returns the eleven fields for every business, and each seed case of task 2.3 returns its value or `null` as the directory spec says.
    - No private field is in the response.
  - Record the results in the checks table of `infra/README.md`.
- [ ] 5.2 Import the pipeline's file into `dev`: first the dry run, then `--apply`.
  - Verify:
    - The counts printed match the file.
    - `GET /businesses` returns the imported businesses plus the active seed rows.
    - A second `--apply` reports every business as unchanged.
    - After one business's hours are edited in admin mode, a dry run lists that business as having edited hours.
  - Record the results with counts only, never names or values.
- [ ] 5.3 Check the dialog in `dev` on a 320 px wide screen and on desktop.
  - Verify:
    - The Maps link opens the listing in a new tab.
    - The Instagram row and the description appear where the spec says.
    - The 300-character seed description leaves "Ubicación" and the WhatsApp area visible without scrolling (AC-8.5).
    - Every new link can be reached with the keyboard, and the text contrast meets AA.
  - Then the owner reviews the imported businesses in `dev` and says in chat whether they can go to `prod`.
  - Record the results.

## Workflow follow-up

- Right after the owner approves this change, amend `finish-mvp-rollout` with `/opsx:update` as proposal conflict 2 describes, with a new design decision there (D-4) that explains why.
- The import into `prod` is done in `finish-mvp-rollout`, task 2.1, not here.
- Archive this change when the owner says so, as the last commit of the same pull request (`[import-businesses] Archive change`), then run `pnpm spec:validate`.
