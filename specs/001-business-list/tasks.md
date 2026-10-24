# Tasks 001: Business Directory Listing

- **Status:** Approved (approved by the project owner in chat on 2026-10-24)
- **Spec:** [spec.md](./spec.md) (Approved)
- **Plan:** [plan.md](./plan.md) (Approved)
- **Related:** [Tasks 002](../002-infrastructure/tasks.md) (infrastructure; milestones are shared)
- **Created:** 2026-10-23

## How to work a task

1. Read the task, its acceptance criteria, and the plan section it cites.
2. Write the tests listed under **Tests first**. Run them and confirm they fail for the expected reason.
3. Write the minimum code to make them pass.
4. Run `pnpm -r lint`, `pnpm -r typecheck`, and `pnpm -r test`. All must pass.
5. Tick the checkbox and commit with the task id, for example `Add WhatsApp number rule (001-T3)`.

Work happens on one branch per milestone (for example `m1-backend`), with one commit per task and one pull request per milestone. The pull request title follows AGENTS.md, links the specs, lists the acceptance criteria covered, and must pass CI (002-T0).

A task is not done if a test was skipped, deleted, or weakened (AGENTS.md).

## Execution order across specs

| Milestone | Goal | Tasks |
|---|---|---|
| **M1** | Backend with tests, CI on pull requests | 001-T1, 002-T0, then 001-T2 to 001-T8 |
| **M2** | API live in `dev` | 002-T1 to 002-T6 |
| **M3** | Frontend works locally against the `dev` API | 001-T9 to 001-T14 |
| **M4** | Frontend hosted in `dev`, end-to-end checks | 002-T7 to 002-T9, then 001-T15 |
| **M5** | `prod`, only at launch | 002-T10, 002-T11 |

## M1: Backend

- [x] **001-T1 Workspace and backend scaffolding**
  - **Covers:** enabler for all ACs (constitution 1, 4, 6; AGENTS.md commands)
  - **Do:** root `package.json`, `pnpm-workspace.yaml`, shared strict `tsconfig.base.json`, ESLint flat config with `typescript-eslint`, Vitest. `backend/package.json` with `lint`, `typecheck`, `test`, `build` scripts. Pin the Node.js version to 24 (matches Lambda `nodejs24.x`, plan 002 P-3). Install only packages from spec section 8a (and `esbuild` from spec 002 section 9), and check each package name and current setup against its official documentation first.
  - **Tests first:** one placeholder test in `backend/` that fails until Vitest is wired, then passes.
  - **Done when:** `pnpm install`, `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test` succeed. `pnpm-lock.yaml` is committed. No `package-lock.json` or `yarn.lock`.

- [ ] **001-T2 Domain types**
  - **Covers:** AC-2.1, AC-2.4 (shape of the data)
  - **Do:** `backend/src/domain/business.ts` with `BusinessRow` (database shape, plan section 2) and `Business` (API shape, plan section 3). No imports.
  - **Tests first:** none (types only). Type checking in later tasks covers them.
  - **Done when:** `pnpm -r typecheck` passes.

- [ ] **001-T3 WhatsApp number rule**
  - **Covers:** AC-2.5, AC-2.2, AC-2.3, EC-5
  - **Do:** `backend/src/domain/whatsappNumber.ts`, `normalizeWhatsappNumber(raw: string | null): string | null` (plan section 4, business rules).
  - **Tests first:** valid number with country code; spaces, dashes, parentheses, and a leading `+` removed; exactly 8 and exactly 15 digits valid; 7 and 16 digits invalid; leading `0` invalid; letters invalid; empty string invalid; `null` returns `null`.
  - **Done when:** all cases pass. The module has no imports.

- [ ] **001-T4 Business service: map and sort**
  - **Covers:** AC-5.1, AC-5.2, AC-2.3, AC-2.4, EC-1, EC-6
  - **Do:** `backend/src/services/businessService.ts`, `listActiveBusinesses(findRows)`. Normalizes numbers (001-T3), sorts by `createdAt` desc, then name with `Intl.Collator("es")`, then id (plan section 4), maps to `Business`.
  - **Tests first (fake `findRows`):** newest first; equal times ordered by name with accents and mixed case (for example "Árbol", "abeja", "Zapatería"); equal time and name ordered by id; empty list returns `[]`; invalid number becomes `null`; output objects have exactly the six API fields.
  - **Done when:** tests pass. The module imports only from `domain/`.

- [ ] **001-T5 Business repository**
  - **Covers:** AC-1.2 (query level); plan R-2
  - **Do:** `backend/src/repositories/businessRepository.ts`, `findActiveBusinessRows(execute)` with one constant SQL statement that selects the columns of plan section 2 and filters `is_active = true`. Check the Data API documentation for how `UUID`, `TIMESTAMPTZ`, `BOOLEAN`, and `NULL` values are returned, and convert them explicitly to `BusinessRow` (for example `created_at` to a `Date`).
  - **Tests first (fake `execute` that records the SQL and returns a sample Data API response):** the SQL contains `is_active = true`; selects exactly the needed columns; the SQL is a constant (no concatenation or interpolation); records are converted to `BusinessRow` with correct types, including a `NULL` WhatsApp number.
  - **Done when:** tests pass.

- [ ] **001-T6 Migration runner and migration 001**
  - **Covers:** spec section 9 completion criterion 1 for data; plan D-7; constitution 5; spec 002 EC-4
  - **Do:** `backend/src/migrations/runMigrations.ts`: reads the ordered migration files, creates `schema_migrations` if missing, skips applied files, and runs each file (exactly one statement) plus its `schema_migrations` record in one Data API transaction; stops on the first failure (plan 002, P-11). Migration `backend/migrations/001_create_businesses.sql` (plan section 2; `gen_random_uuid()` confirmed in plan 002 V-3). The command line that calls it is 002-T3.
  - **Tests first (fake wrapper):** files applied in name order; already-applied files skipped; a failing file is rolled back, not recorded, and later files do not run; a second run is a no-op; a file with more than one statement is rejected before anything runs.
  - **Done when:** tests pass. The SQL file holds only the `CREATE TABLE` statement.

- [ ] **001-T7 Express app and Lambda handler (endpoint)**
  - **Covers:** AC-1.1, AC-6.4, AC-7.1 (API side), FR-1, FR-7; plan section 3, D-8
  - **Do:** `backend/src/app.ts` `createApp(deps)` with `GET /businesses` and an error middleware. `backend/src/handlers/lambda.ts` adapts the app with `serverless-http` and wires real dependencies. Logs never include request headers or client IP addresses.
  - **Tests first (handler called with an API Gateway HTTP API event, fake repository):** `200` with the exact contract of plan section 3; `200` with `{"businesses": []}`; when the repository throws, `500` with body exactly `{"error":"internal_error"}` and no stack or database text; the error is logged without request headers or client IP; the response `Content-Type` is JSON.
  - **Done when:** tests pass. The handler contains no business rules.

- [ ] **001-T8 Data API wrapper**
  - **Covers:** plan D-3; spec 002 I-4, I-5; plan 002 P-12
  - **Do:** `backend/src/db/dataApi.ts`: reads cluster ARN, secret ARN, database, and retry budget from environment variables; exposes `execute(sql, parameters)` and transaction helpers for `runMigrations`; passes named parameters; retries `DatabaseResumingException` with a short backoff within the retry budget; never retries other errors. The Lambda handler wires it into the repository.
  - **Tests first (mocked `RDSDataClient`):** the configured ARNs and database are sent; parameters are passed as named parameters; one `DatabaseResumingException` followed by success returns the result; retries stop when the budget is spent; other errors are not retried; a missing environment variable fails with a clear message (in English, logged, not returned to the client).
  - **Done when:** tests pass. No credentials in code or tests.

## M3: Frontend

- [ ] **001-T9 Frontend scaffolding**
  - **Covers:** enabler; plan section 5 notes (Tailwind v4)
  - **Do:** `frontend/` with Vite, React, TypeScript strict, `@tailwindcss/vite`, `src/index.css` with `@import "tailwindcss";` and an `@theme` block of design tokens (colors, spacing, fonts) that meet WCAG AA contrast. Vitest with `jsdom` and Testing Library. Scripts `dev`, `lint`, `typecheck`, `test`, `build`. Verify the current Tailwind v4 and Vite setup in their official documentation first.
  - **Tests first:** one placeholder component test that fails until the setup works.
  - **Done when:** `pnpm --filter frontend dev` serves a page, and lint, typecheck, test, and build pass.

- [ ] **001-T10 UI strings and WhatsApp link**
  - **Covers:** AC-4.1, AC-4.2, AC-1.3, AC-3.1, AC-3.2, AC-6.2, AC-7.1 (texts)
  - **Do:** `frontend/src/strings.ts` with every Spanish text from the spec (exact wording and characters, for example the single ellipsis character `…` in "Cargando…"). `frontend/src/features/businesses/whatsapp.ts` `buildWhatsappUrl(number)`.
  - **Tests first:** URL is `https://wa.me/<number>?text=<encoded greeting>`; the decoded `text` equals the exact greeting of AC-4.1; the greeting does not contain the business name.
  - **Done when:** tests pass.

- [ ] **001-T11 API function**
  - **Covers:** AC-1.1, AC-6.1 (error detection)
  - **Do:** `frontend/src/api/businesses.ts` `fetchBusinesses()`: one `fetch` to `${VITE_API_BASE_URL}/businesses`, returns `Business[]`, throws on a non-OK status or a network error. Vite dev server proxy: `/businesses` goes to the `dev` API URL read from a local, uncommitted environment file; `VITE_API_BASE_URL` is empty locally (Q-3).
  - **Tests first (mocked `fetch`, never the network):** calls the right URL once; returns the list; throws on `500`; throws on network failure.
  - **Done when:** tests pass.

- [ ] **001-T12 Query client, query key, and hook**
  - **Covers:** AC-6.1, AC-6.3, NFR-4
  - **Do:** `frontend/src/queryClient.ts` `createQueryClient()` with only `retry: 2` and `retryDelay: 1000`. `frontend/src/features/businesses/queryKeys.ts`. `frontend/src/features/businesses/useBusinesses.ts`.
  - **Tests first (fresh `QueryClient` from the factory per test, mocked API, fake timers):** success returns data; a failing API is called 3 times in total, about 1 s apart, then the hook is in error; `refetch` calls the API again.
  - **Done when:** tests pass.

- [ ] **001-T13 Business card and WhatsApp button**
  - **Covers:** AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-3.1, AC-3.2, AC-4.1, EC-4, EC-5, NFR-3
  - **Do:** `WhatsAppButton.tsx` (anchor, `target="_blank"`, `rel="noopener noreferrer"`, accessible name "Contactar a {name} por WhatsApp") and `BusinessCard.tsx` (plan section 5). Long text wraps.
  - **Tests first:** card shows name, category, and location summary; "En tienda" when `hasPhysicalStore` is true and "Solo domicilios" when false; button present with the right `href` and accessible name when a number exists; no button when the number is `null`, and the rest of the card still renders; no other business fields are rendered.
  - **Done when:** tests pass.

- [ ] **001-T14 Business list, App, and entry point**
  - **Covers:** AC-1.1, AC-1.3, AC-6.2, AC-6.3, AC-6.4, AC-7.1, NFR-2, NFR-4, EC-1, EC-2, EC-3
  - **Do:** `BusinessList.tsx` (loading with `role="status"`, error with `role="alert"` and a "Reintentar" `button` that calls `refetch`, empty message, list as `ul` with one column at 320 px and more from `md`), `App.tsx`, `main.tsx` with the single `QueryClient`.
  - **Tests first (mocked API, fresh `QueryClient`):** "Cargando…" while pending; one card per business in API order; empty message for `[]`; after retries fail, the exact error message and "Reintentar"; clicking "Reintentar" loads again and shows the list; the error view shows no technical details (no status code, no exception text).
  - **Done when:** tests pass and the page works in the browser against the `dev` API through the Vite proxy.

## M4: End-to-end verification

- [ ] **001-T15 Manual checks in `dev`**
  - **Covers:** plan section 8 manual checks 1 to 6; spec 001 completion criteria; spec 002 completion criterion 3
  - **Do:** after 002-T8, run the six manual checks of plan section 8 against the CloudFront URL of `dev`. Record date, device, and result of each check in a "Verification log" section at the end of this file.
  - **Done when:** all six pass, or each failure has an issue or a spec change proposal.

## Open Questions

All resolved by the project owner on 2026-10-23 and 2026-10-24:

- **Q-1.** No local backend server (removed 2026-10-24); the endpoint is covered by tests, and the first real request is in M2.
- **Q-2.** No database users migration anymore (RDS Data API); `001_create_businesses.sql` is the first migration.
- **Q-3.** Local frontend reaches the `dev` API through a Vite dev server proxy. CORS stays limited to the CloudFront origin.
- **Q-4.** Migrations run through `backend/scripts/migrate.ts` and the RDS Data API (2026-10-24; this replaced the migration Lambda).
- **Q-5.** One branch and pull request per milestone, one commit per task.

## Verification log

(Filled in by 001-T15.)
