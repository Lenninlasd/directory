# Proposal: Import the Google Maps businesses

> **Status: waiting for the owner's approval of the whole change.** The owner settled the direction (Owner decisions A to C) in chat on 2026-11-21, and the spec deltas and `tasks.md` follow it. Nothing is approved until the owner says so in chat and it is recorded in `.openspec.yaml`.

## Why

The directory still lists only the invented `dev` rows. The Google Maps pipeline (`business-pipeline`, step 4, "Handoff" in its `src/outscraper_extract/SPEC.md`) now produces reviewed businesses in the directory's own format: 52 today. They come with three public fields the directory lacks and twelve private fields it must store but never publish. The only way to load businesses today is a data migration committed to this public repository, which would publish those private values.

## What Changes

- **Three new public API fields** on `GET /businesses`: `mapsUrl`, `description`, and `instagramUrl`. Each has a validity rule and is `null` when missing or invalid, like `websiteUrl`. Adding fields does not break the current frontend, which ignores fields it does not know.
- **Detail dialog** (Owner decision B): a "Ver en Google Maps" link in the "Ubicación" row, an "Instagram" row after "Página web", and the description below the rows. The tile does not change.
- **Twelve private fields** are stored as columns (`googlePlaceId`, `latitude`, `longitude`, `coordinatesSource`, `sourceType`, `sourceCategory`, `activityScore`, `activityAsOf`, `lastVerifiedAt`, `consentedAt`, `consentChannel`, `adminNotes`). They are never returned by the API, and a contract test checks the exact field list.
- **A new way to load businesses**, which replaces committed data migrations: a local import command, run like `backend/scripts/migrate.ts`, reads `businesses.json` from outside the repository and writes it through the RDS Data API with the developer's credentials. No business values are ever committed. See conflict 1.
- **Import rules:**
  - The whole file is validated before anything is written, and one invalid record refuses the whole file.
  - Writes are upserts keyed by `googlePlaceId`, in one transaction.
  - A business missing from a newer file is deactivated, never deleted.
  - Rows without a place id, such as the `dev` seed, are never touched.
  - Opening hours changed in admin mode are kept, not overwritten.
- **Publication rules become binding.** The consent and private-field rules the import depends on are written as requirements in the new `business-import` spec. The import enforces the consent rule a second time, after the pipeline: a WhatsApp number only with recorded consent.
- **Deliberate exclusions (directory spec):**
  - The "Extended business attributes" row is narrowed: description and Instagram leave it. Exact address, coordinates, logo, images, and the rest stay excluded.
  - The "Maps, directions" row is clarified: a link to the business's own Google Maps listing is allowed, while embedded maps and directions stay excluded.

## Conflicts and how this change resolves them

### 1. "Business data loading" requires committed data migrations

The infrastructure spec says every business row is loaded through a data migration reviewed in a pull request, containing only public contact information. The repository is public, so private values cannot go there, and the owner does not want the real data there either.

| Option | Verdict |
|---|---|
| **A. Local import command, with the data review done in `dev`** | **Chosen (Owner decision A).** Nothing is committed. The pull request reviews the code and the rules. The owner reviews the data where it will be seen, in the `dev` directory. `prod` accepts only the exact file last imported into `dev` (design D-2). |
| B. SQL migrations generated from the file and kept out of git | `schema_migrations` would record files the repository does not have, and recreating an environment would depend on files kept somewhere else. A new pipeline snapshot would also need code that turns it into `UPDATE` migrations, which is the import command of A plus SQL files with private values on disk. |
| C. Public columns by committed migration, private columns by script | Two paths for one record, and it commits the real data. |
| D. A bulk import route on the API, protected by the admin key | A public write surface for a job one person runs a few times. |
| E. An S3 upload that triggers an import Lambda | New AWS resources and permissions to load about 50 rows. |
| F. Encrypted data files committed (for example with sops) | A new tool and key management, and encrypted personal data kept forever in a public repository. |

With A, the requirement becomes: business rows are added, changed, or deactivated only by the import command (or, for opening hours, by the editing routes). The data is reviewed in `dev` before `prod`. Data migrations no longer carry business rows, and the `dev` seed stays as it is.

### 2. Relation to `finish-mvp-rollout`

Its task 2.1 plans "one data migration" with the real businesses, which conflicts with option A.

**Decided (Owner decision C, 2026-11-21): amend `finish-mvp-rollout` and make it depend on this change**, following the precedent of its design D-3:

- Rewrite task 2.1: import the file reviewed in `dev` into `prod` with this change's command, after the owner's review in `dev`.
- Tasks 1.1 and 2.1 start only after this change is merged and archived. That way the single `prod` deploy already has the new columns, and `skip_specs: true` stays valid, because the infrastructure spec will then describe the import.
- The amendment is made with `/opsx:update` on `finish-mvp-rollout` once this change is approved, and is recorded there as a new `x-revision-approved`.

Discarded:

- Moving task 2.1 into this change: this change's pull request would stay open until `prod` exists, the reason D-3 gave for moving the `prod` step out of `edit-opening-hours-with-natural-language`.
- Depending on this change without amending task 2.1: the task would contradict the modified spec.

## Owner decisions

- **A. Loading path.** Decided 2026-11-21: option A of conflict 1, the local import command, with the data reviewed in `dev` before `prod`.
- **B. Interface scope.** Decided 2026-11-21: the three new fields are shown in the detail dialog in this change.
- **C. `finish-mvp-rollout`.** Decided 2026-11-21: amend it and make it depend on this change (conflict 2).

## Out of scope

- Products and prices, delivery, payment methods, ratings and reviews, and images (owner's decision). Photos are never stored or linked.
- Showing coordinates or a map, or using coordinates for anything. They are only stored.
- Searching the description. Search stays on name and category.
- The Google rating, which comes later, fetched live from the Places API with the place id and never stored.
- Requiring `lastVerifiedAt`. It is only recorded, and the owner decides what reaches `prod` by reviewing `dev`.
- New category icons and colors. The categories that keep Google's name use the existing fallback (tag, teal).
- Editing the new fields in admin mode, and deleting businesses.
- Running the pipeline from this repository, or sharing code with it.
- The data processing policy page and the "¿Es tu negocio?" removal link. They are recommended as their own change before `prod` publishes any personal data (design, "Risks").

## Capabilities

### New Capabilities

- `business-import`: loading businesses from the pipeline's handoff file. Covers the file contract, the validation and publication rules applied at import (consent, private fields), the upsert key, deactivation, the dry run, the `dev` before `prod` review, and keeping hours edited in admin mode.

### Modified Capabilities

- `directory`:
  - "Business list API": eleven fields.
  - New validity requirements for the Maps link, the Instagram link, and the description.
  - "Business detail dialog" and "Detail dialog hours and website rows": the new rows (Owner decision B).
  - "Interface text": the new Spanish texts.
  - "Public access without an account": "contact information" becomes "public information", since a description is not contact data.
  - "Deliberate exclusions": the two rows above.
- `infrastructure`: "Business data loading" is rewritten for the import command and the `dev` review. Data migrations no longer carry business rows.

`business-editing` does not change: the import detects edited hours by itself (design D-8).

## Impact

- **Database:** new nullable columns in `businesses` through versioned schema migrations, compatible with the deployed backend, plus a small `business_imports` table that records each import's file hash and counts, never business values.
- **Backend:**
  - Pure validators for the new fields and the import file.
  - A pure import planner that compares the stored rows with the file and decides what to insert, update, deactivate, and keep.
  - Repository SQL.
  - `backend/scripts/import-businesses.ts`.
  - The public `SELECT` adds only the three public columns.
- **Frontend:** the `Business` type, the dialog rows, and `strings.ts`.
- **Documentation:** the import procedure in `infra/README.md`, covering the dry run, the `dev` review, and the `prod` promotion.
- **Other changes:** `finish-mvp-rollout` is amended (conflict 2).
- **No new packages and no AWS changes.** Hashing and file reading use `node:crypto` and `node:fs`, and the Lambda role does not change.
- **Data:** none committed. Tests use invented records in the handoff shape, never a copy of `businesses.json`.
