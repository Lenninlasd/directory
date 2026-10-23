# Plan 001: Business Directory Listing

- **Status:** Draft
- **Spec:** [spec.md](./spec.md) (Approved)
- **Created:** 2026-10-23

Scope: application code only (frontend, backend, one migration). Hosting, deployment, and infrastructure-as-code are not covered by spec 001 and need their own spec.

## 1. Technical Approach

One read-only endpoint, `GET /businesses`, returns all active businesses as JSON. A single React page renders them as cards. No pagination, search, or filters (spec section 8).

```
Browser (React + TanStack Query)
  -> GET /businesses  (API Gateway)
    -> Lambda handler (Express app via adapter)   parse input, call service, respond
      -> businessService.listActiveBusinesses     validate WhatsApp number, sort, map to API shape
        -> businessRepository                     raw SQL, active rows only
          -> Aurora DSQL (businesses table)
```

Key decisions:

- Sorting and WhatsApp validation are pure functions in the service layer, so they are tested without a database (AGENTS.md testing standard).
- The repository only filters (`is_active = true`). Sorting is done in the service (see D-2).
- The API returns `whatsappNumber: string | null`. The frontend builds the `wa.me` link and owns all Spanish text.

## 2. Data Model

Table `businesses` (covers FR-1, FR-2, FR-3, FR-5):

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` primary key | Random UUID default (function name to confirm, see Risks R-2) |
| `name` | `TEXT NOT NULL` | |
| `category` | `TEXT NOT NULL` | Free text. No categories table, since filters are out of scope. |
| `location_summary` | `TEXT NOT NULL` | Short, display-only |
| `has_physical_store` | `BOOLEAN NOT NULL` | `true` = "En tienda", `false` = "Solo domicilios" |
| `whatsapp_number` | `TEXT NULL` | Raw value as entered by the team; validated at read time |
| `is_active` | `BOOLEAN NOT NULL DEFAULT TRUE` | Inactive rows are never returned |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | Drives ordering |

No foreign keys and no secondary index: the query reads all active rows, and the table has hundreds of rows, not millions. An index (`CREATE INDEX ASYNC`) is added together with pagination in a future spec.

Migration `backend/migrations/001_create_businesses.sql` holds a single `CREATE TABLE` statement. Verified against the Aurora DSQL documentation: a transaction can contain only one DDL statement, and DDL and DML need separate transactions.

## 3. API Contract (FR-1, FR-2, FR-5, FR-6)

`GET /businesses`, no parameters, no authentication.

**200 OK**

```json
{
  "businesses": [
    {
      "id": "0b9f6c1e-6d0a-4c43-9f43-3a6c1d2e8a10",
      "name": "Panadería La Esquina",
      "category": "Bakery",
      "locationSummary": "Centro Comercial Plaza, local 12",
      "hasPhysicalStore": true,
      "whatsappNumber": "573001234567"
    },
    {
      "id": "7c1d0f35-2b8e-4e57-a1a4-5f0e3b9c6d22",
      "name": "Dulces de Ana",
      "category": "Desserts",
      "locationSummary": "Alameda del Río, home delivery",
      "hasPhysicalStore": false,
      "whatsappNumber": null
    }
  ]
}
```

- An empty list is `200` with `"businesses": []` (FR-7 is rendered by the frontend).
- `whatsappNumber` is `null` when the stored value is missing or invalid (AC-2.3).
- Order is already final: newest first, then name, then id (FR-5). The client never re-sorts.
- Not returned: `isActive`, `createdAt`, or any other attribute (AC-2.4, NFR-7).

**500** `{ "error": "internal_error" }`, with no stack trace or database message (AC-6.4). Details go to the logs only.

## 4. Backend Modules (`backend/`)

| File | Responsibility | Imports allowed |
|---|---|---|
| `src/domain/business.ts` | Types: `BusinessRow` (DB shape), `Business` (API shape) | none |
| `src/domain/whatsappNumber.ts` | `normalizeWhatsappNumber(raw): string \| null` | none |
| `src/services/businessService.ts` | `listActiveBusinesses(findRows)`: normalize numbers, sort, map to `Business[]` | domain only |
| `src/repositories/businessRepository.ts` | `findActiveBusinessRows(client)`: parameterized raw SQL | `pg` types |
| `src/db/connect.ts` | Generates the IAM token, opens one connection, returns a client | `pg`, DSQL signer |
| `src/app.ts` | `createApp(deps)`: Express app, `GET /businesses`, error middleware | `express` |
| `src/handlers/lambda.ts` | Lambda entry: wires the real dependencies and adapts the Express app | adapter |
| `src/local.ts` | Local dev server on a fixed port, same app | `express` |
| `scripts/migrate.ts` | Applies `migrations/*.sql` in order, one statement per transaction, records applied files in `schema_migrations` | `pg` |
| `migrations/001_create_businesses.sql` | Section 2 table | n/a |

The service receives the repository function as an argument (plain function passing, no DI framework). The handler contains no business rules.

### Business rules

**WhatsApp number (AC-2.2, AC-2.3, EC-5).** Proposed rule, which the spec does not define (see Open Questions Q-1): strip spaces, dashes, parentheses, and a leading `+`; the result is valid when it is 8 to 15 digits and does not start with `0`. Return the digits, or `null`. The team stores numbers with country code (for example `573001234567`).

**Ordering (AC-5.1, AC-5.2, EC-6).**

```
sort businesses by:
  1. createdAt descending
  2. name ascending, using Intl.Collator("es")
  3. id ascending (plain string compare)
```

## 5. Frontend Modules (`frontend/`)

| File | Responsibility |
|---|---|
| `src/main.tsx` | Creates the single `QueryClient` from `createQueryClient()` and renders `<App />` |
| `src/queryClient.ts` | `createQueryClient()`: the only default options are `retry: 2` and `retryDelay: 1000` (AC-6.1). Tests use the same factory. |
| `src/api/businesses.ts` | `fetchBusinesses()`: plain `fetch` to `${VITE_API_BASE_URL}/businesses`; throws on a non-OK response |
| `src/features/businesses/queryKeys.ts` | `BUSINESSES_QUERY_KEY = ['businesses'] as const` |
| `src/features/businesses/useBusinesses.ts` | `useQuery` wrapper, the only place that calls the API function |
| `src/features/businesses/whatsapp.ts` | `buildWhatsappUrl(number)`: `https://wa.me/<number>?text=<encoded greeting>` (AC-4.1, AC-4.2) |
| `src/strings.ts` | All Spanish UI text as constants (single place, no i18n library) |
| `src/features/businesses/BusinessList.tsx` | Chooses between loading, error, empty, and list using `isPending`, `isError`, and `data.length` |
| `src/features/businesses/BusinessCard.tsx` | Name, category, location summary, store type label, optional WhatsApp button |
| `src/features/businesses/WhatsAppButton.tsx` | Anchor styled as a button, `target="_blank"` and `rel="noopener noreferrer"` |
| `src/index.css` | `@import "tailwindcss";` plus an `@theme` block with design tokens |

Notes:

- Tailwind v4 is configured CSS-first: the Vite plugin `@tailwindcss/vite` and tokens in `@theme`, as the Tailwind docs state. There is no `tailwind.config.js`.
- The button is a link so the browser opens WhatsApp in a new tab. The directory page therefore stays where the user left it, which is why AC-4.3 was dropped from the spec. `wa.me` opens the app when installed and WhatsApp Web otherwise (AC-4.2).
- Accessible names: the WhatsApp button reads "Contactar a {name} por WhatsApp". The list is a `ul`. Loading uses `role="status"` and the error uses `role="alert"`. The "Reintentar" button is a real `button`.
- Layout: one column at 320 px, more columns from `md`. Long text wraps (`break-words`) so cards never overflow (EC-4).
- The "Reintentar" button calls `refetch()`. Automatic retries are handled by the query defaults, and the error screen only appears after they fail.

## 6. Technical Decisions

| # | Decision | Alternatives discarded and why |
|---|---|---|
| D-1 | Return all active rows in one query; no pagination | Offset or cursor pagination: excluded by the spec, and adds cursor logic and an index |
| D-2 | Sort in the service with a pure comparator | `ORDER BY name` in SQL: DSQL supports only the `C` collation, so "alphabetical" would be byte order (uppercase first, accents last). Sorting in the service also keeps the rule testable without a database. |
| D-3 | Open one connection per invocation and close it at the end | Module-level pool: IAM tokens expire, and AGENTS.md forbids long-lived state between invocations. The extra connect time must fit in NFR-1 (see R-1). |
| D-4 | Frontend builds the WhatsApp link; backend sends a normalized number or `null` | Backend returns a ready URL: it would put Spanish text and presentation concerns in the API |
| D-5 | Spanish strings in one `strings.ts` | An i18n library: translation is out of scope, and a new dependency would need approval |
| D-6 | Retry via TanStack Query defaults (`retry: 2`, `retryDelay: 1000`) | Hand-written retry loop: duplicates what the library already does |
| D-7 | Apply migrations with a small in-repo script | `node-pg-migrate` or similar: a new dependency. Running SQL by hand: forbidden ("never edit the schema manually"). |
| D-8 | Test the endpoint by calling the Lambda handler with an API Gateway event and a fake repository | `supertest`: another dependency, and it tests Express instead of the handler contract |

## 7. Dependencies Requiring Approval

The constitution says any dependency beyond the fixed stack needs an approved spec that justifies it, and spec 001 does not list any. These are the minimum needed to build and test the feature. They must be approved (in chat, or by adding a short section to the spec) before the tasks are written.

| Package | Where | Why |
|---|---|---|
| `express`, a Lambda adapter (for example `serverless-http`) | backend | Constitution names Express on Lambda; the adapter converts API Gateway events |
| `pg`, `@aws-sdk/dsql-signer` | backend | PostgreSQL driver and IAM token generation. Exact packages to confirm (see R-2). |
| `typescript`, `eslint` with `typescript-eslint`, `vitest` | root / both | Strict typing, the `lint` script, and the test runner. A single runner is shared by both packages. |
| `vite`, `@vitejs/plugin-react` | frontend | Build and dev server for React + TypeScript |
| `tailwindcss`, `@tailwindcss/vite` | frontend | Allowed by AGENTS.md; v4 setup verified in the docs |
| `@tanstack/react-query` | frontend | Allowed by AGENTS.md |
| `jsdom`, `@testing-library/react` | frontend (dev) | Component and hook tests without a real browser |

## 8. Testing Strategy

Tests are written before code, per task (AGENTS.md workflow).

| Layer | What is tested | Tool | Covers |
|---|---|---|---|
| `whatsappNumber` | Valid forms, separators, leading `+`, too short, too long, letters, empty, `null` | vitest | AC-2.2, AC-2.3, EC-5 |
| `businessService` | Order by date, tie by name (accents and case), tie by id, empty list, number mapped to `null`, output has no extra fields | vitest, fake rows | AC-5.1, AC-5.2, AC-2.4, EC-1, EC-6 |
| `businessRepository` | The SQL string selects the expected columns and contains `is_active = true`; uses no string concatenation | vitest, fake client | AC-1.2 (query level) |
| Endpoint | Handler returns `200` with the contract in section 3, `200` with an empty list, and `500` with only `internal_error` when the repository throws | vitest, handler + fake repository | FR-1, FR-7, AC-6.4 |
| `whatsapp.ts` | URL has the number and the encoded greeting from `strings.ts` | vitest | AC-4.1 |
| `useBusinesses` | Success, failure retried exactly 2 times about 1 s apart (fake timers), then error state, `refetch` retries | vitest, fresh `QueryClient`, mocked API | AC-6.1, AC-6.3 |
| Components | Loading text, list of cards, labels "En tienda" and "Solo domicilios", no button when number is `null`, error text plus "Reintentar", empty message, no technical details shown | vitest + Testing Library, mocked API | AC-1.3, AC-2.x, AC-3.x, AC-6.2, AC-6.4, AC-7.1 |

Documented manual checks (cannot be automated without extra tooling):

1. **Inactive rows (AC-1.2, end to end):** insert one inactive and one active business in a dev DSQL cluster, open the directory, and confirm only the active one shows.
2. **WhatsApp (AC-4.1, AC-4.2):** tap the button on a phone with WhatsApp and on a desktop without it; the greeting is prefilled, and the page is still open in the original tab.
3. **Layout (NFR-2, EC-4):** check at 320 px and on desktop with a very long name and location.
4. **Accessibility (NFR-3):** keyboard-only pass, screen reader names for buttons, and contrast of the design tokens against WCAG AA.
5. **Performance (NFR-1):** measure first load on a throttled mobile connection, including a cold Lambda start.
6. **Freshness (NFR-5):** change a row in the database and confirm it appears on the next page load.

## 9. Traceability

| Requirement | Covered by |
|---|---|
| FR-1 (AC-1.1 to 1.3) | Sections 2, 3, 4 (repository, service), 5 (`BusinessList`, loading state) |
| FR-2 (AC-2.1 to 2.4) | Section 3 (response fields), section 4 (`whatsappNumber`), section 5 (`BusinessCard`) |
| FR-3 (AC-3.1, 3.2) | Section 2 (`has_physical_store`), section 5 (`strings.ts`, `BusinessCard`) |
| FR-4 (AC-4.1, 4.2) | Section 5 (`whatsapp.ts`, `WhatsAppButton`), D-4 |
| FR-5 (AC-5.1, 5.2) | Section 4 (ordering rule), D-2 |
| FR-6 (AC-6.1 to 6.4) | Section 3 (500 body), section 5 (`queryClient.ts`, error state), D-6 |
| FR-7 (AC-7.1) | Section 3 (empty array), section 5 (`BusinessList`) |
| NFR-1 | D-3, R-1, manual check 5 |
| NFR-2 | Section 5 (layout), manual check 3 |
| NFR-3 | Section 5 (accessibility notes), manual check 4 |
| NFR-4 | Section 5 (all four states always rendered by `BusinessList`) |
| NFR-5 | D-3 (no caching layer), manual check 6 |
| EC-1 to EC-6 | Tests in section 8, rows for service, components, and hook |

## 10. Risks

| # | Risk | Mitigation |
|---|---|---|
| R-1 | Cold start plus a new DSQL connection and token on every invocation may exceed the 3 s target (NFR-1) | Measure in manual check 5. If it fails, propose a spec change to allow connection reuse rather than doing it silently. |
| R-2 | The official Node.js connection page for DSQL could not be read while writing this plan, and the docs pages read do not name the UUID function. Package names and `gen_random_uuid()` are therefore unconfirmed. | Verify both against the AWS documentation in the first backend and migration tasks, before writing code or SQL |
| R-3 | DSQL uses optimistic concurrency, which can cause serialization errors on writes | Not relevant to this read-only endpoint; becomes relevant when write features appear |
| R-4 | Returning every row grows the response and query time as businesses are added | Acceptable for hundreds of rows. Pagination is the planned future spec. |
| R-5 | Cross-origin requests from the frontend host to API Gateway need CORS | Configured with the infrastructure (separate spec); `VITE_API_BASE_URL` keeps the API origin out of the code |
| R-6 | JavaScript dates have millisecond precision while `TIMESTAMPTZ` has microseconds, so near-equal times may tie | The name and id tie-breaks keep the order deterministic |

## 11. Open Questions

- **Q-1.** The spec says "valid WhatsApp number" but does not define it. The proposed rule is in section 4 (8 to 15 digits after stripping separators and `+`, not starting with `0`, stored with country code). Needs confirmation, and ideally a one-line addition to the spec.
- **Q-2.** Dependencies in section 7 need approval.
- **Q-3.** Hosting, deployment, and infrastructure (Lambda, API Gateway, DSQL cluster, frontend hosting, CORS) need their own spec before the feature can be reached by real users.

## 12. Constitution Check

1. **Stack Simplicity:** Complies. Only the fixed stack is used (React + TypeScript, Express on Lambda behind API Gateway, Aurora DSQL, Tailwind, TanStack Query). The extra packages are listed in section 7 and wait for approval.
2. **Spec-Code Alignment:** Complies. The spec is Approved, every part of the plan traces to an FR or NFR (section 9), and nothing outside spec 001 is planned. Items the spec does not cover are raised as open questions instead of assumed.
3. **Separation of Concerns:** Complies. Domain and service modules have no Express, Lambda, or React imports. The handler only parses input, calls the service, and responds. React components only render, and data comes through `fetchBusinesses` and `useBusinesses`.
4. **Testing Standard:** Complies. Business rules and the endpoint have automated tests, written first, and run in CI through `pnpm -r test` (section 8). Behavior that cannot be automated has documented manual checks.
5. **Data Persistence:** Complies. One versioned SQL migration, one DDL statement per file, raw parameterized SQL, no ORM, and no manual schema edits (applied by `scripts/migrate.ts`). Checked against the DSQL documentation; the UUID function is flagged in R-2.
6. **Language Standard:** Complies. Code, comments, identifiers, API field names, the migration, and this plan are in English. Spanish appears only as UI text, defined in `frontend/src/strings.ts`.
