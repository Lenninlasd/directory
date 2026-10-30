# Plan 001: Business Directory Listing

- **Status:** Approved
- **Spec:** [spec.md](./spec.md) (Approved)
- **Created:** 2026-10-23

Scope: application code only (frontend, backend, one migration). Hosting, deployment, and infrastructure are in spec 002.

## 1. Technical Approach

One read-only endpoint, `GET /businesses`, returns all active businesses as JSON. A single React page renders them as cards. No pagination, search, or filters (spec section 8).

```
Browser (React + TanStack Query)
  -> GET /businesses  (API Gateway)
    -> Lambda handler (Express app via adapter)   parse input, call service, respond
      -> businessService.listActiveBusinesses     validate WhatsApp number, sort, map to API shape
        -> businessRepository                     raw SQL, active rows only
          -> RDS Data API (HTTPS) -> Aurora PostgreSQL (businesses table)
```

## 2. Data Model

Table `businesses` (covers FR-1, FR-2, FR-3, FR-5):

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` primary key | Random UUID default (`gen_random_uuid()`, part of PostgreSQL core, plan 002 V-3) |
| `name` | `TEXT NOT NULL` | |
| `category` | `TEXT NOT NULL` | Free text. No categories table, since filters are out of scope. |
| `location_summary` | `TEXT NOT NULL` | Short, display-only |
| `has_physical_store` | `BOOLEAN NOT NULL` | `true` = "En tienda", `false` = "Solo domicilios" |
| `whatsapp_number` | `TEXT NULL` | Raw value as entered by the team; validated at read time |
| `is_active` | `BOOLEAN NOT NULL DEFAULT TRUE` | Inactive rows are never returned |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | Drives ordering |

No foreign keys and no secondary index: the query reads all active rows, and the table has hundreds of rows, not millions. An index is added together with pagination in a future spec.

Migration `backend/migrations/001_create_businesses.sql` holds a single `CREATE TABLE` statement. Every migration file holds exactly one statement and runs in its own transaction (plan 002, P-11).

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
- Not returned: `isActive`, `createdAt`, or any other attribute (AC-2.4).

**500** `{ "error": "internal_error" }`, with no stack trace or database message (AC-6.4). Details go to the logs only. Logs never include request headers or client IP addresses (spec section 3: no visitor personal data).

## 4. Backend Modules (`backend/`)

| File | Responsibility | Imports allowed |
|---|---|---|
| `src/domain/business.ts` | Types: `BusinessRow` (DB shape), `Business` (API shape) | none |
| `src/domain/whatsappNumber.ts` | `normalizeWhatsappNumber(raw): string \| null` | none |
| `src/services/businessService.ts` | `listActiveBusinesses(findRows)`: normalize numbers, sort, map to `Business[]` | domain only |
| `src/repositories/businessRepository.ts` | `findActiveBusinessRows(execute)`: one constant SQL statement, maps Data API records to `BusinessRow` | none (receives the wrapper function) |
| `src/db/dataApi.ts` | Small wrapper over `ExecuteStatement` (and transactions for migrations): cluster ARN, secret ARN, and database from environment variables; named parameters; no retries (plan 002, P-12) | `@aws-sdk/client-rds-data` |
| `src/app.ts` | `createApp(deps)`: Express app, `GET /businesses`, error middleware | `express` |
| `src/handlers/lambda.ts` | Lambda entry: wires the real dependencies and adapts the Express app | `serverless-http` |
| `src/migrations/runMigrations.ts` | Applies `migrations/*.sql` in order, one statement and one transaction per file, recording each file in `schema_migrations` in the same transaction | none (receives the wrapper) |
| `scripts/migrate.ts` | Command line run by the deploy script from the developer's machine (plan 002, P-10) | `src/db/dataApi.ts` |
| `migrations/001_create_businesses.sql` | Section 2 table | n/a |

The service receives the repository function as an argument (plain function passing, no DI framework). The handler contains no business rules.

### Business rules

**WhatsApp number (AC-2.2, AC-2.3, EC-5).** Apply the rule of spec AC-2.5 and return the normalized digits, or `null`.

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
| `src/api/businesses.ts` | `fetchBusinesses()`: plain `fetch` to `${VITE_API_BASE_URL}/businesses`; throws on a non-OK response. In local development `VITE_API_BASE_URL` is empty and the Vite dev server proxies `/businesses` to the `dev` API, so CORS stays limited to the CloudFront origin. There is no local backend server; the endpoint is covered by tests. |
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
- The button is a link so the browser opens WhatsApp in a new tab. The directory page therefore stays where the user left it. `wa.me` opens the app when installed and WhatsApp Web otherwise (AC-4.2).
- Accessible names: the WhatsApp button reads "Contactar a {name} por WhatsApp". Its visible text is "WhatsApp", which the accessible name contains (WCAG 2.5.3; decided by the project owner in chat on 2026-10-30, 001-T13). The list is a `ul`. Loading uses `role="status"` and the error uses `role="alert"`. The "Reintentar" button is a real `button`.
- Layout: one column at 320 px, more columns from `md`. Long text wraps (`break-words`) so cards never overflow (EC-4).
- The "Reintentar" button calls `refetch()`. Automatic retries are handled by the query defaults, and the error screen only appears after they fail.

## 6. Technical Decisions

| # | Decision | Alternatives discarded and why |
|---|---|---|
| D-1 | Return all active rows in one query; no pagination | Offset or cursor pagination: excluded by the spec, and adds cursor logic and an index |
| D-2 | Sort in the service with a pure comparator | `ORDER BY name` in SQL: the result depends on the database collation, so "alphabetical" may not follow Spanish rules (accents, case). Sorting in the service keeps the rule explicit and testable without a database. |
| D-3 | Query through the RDS Data API (HTTPS); no database connection in the Lambda | Native driver with one connection per invocation: needs the Lambda in a VPC, IAM tokens, and connection handling (spec 002, I-4). |
| D-4 | Frontend builds the WhatsApp link; backend sends a normalized number or `null` | Backend returns a ready URL: it would put Spanish text and presentation concerns in the API |
| D-5 | Spanish strings in one `strings.ts` | An i18n library: translation is out of scope, and a new dependency would need approval |
| D-6 | Retry via TanStack Query defaults (`retry: 2`, `retryDelay: 1000`) | Hand-written retry loop: duplicates what the library already does |
| D-7 | Apply migrations with small in-repo logic run by `scripts/migrate.ts` through the Data API (spec 002) | `node-pg-migrate` or similar: a new dependency. Running SQL by hand: forbidden ("never edit the schema manually"). |
| D-8 | Test the endpoint by calling the Lambda handler with an API Gateway event and a fake repository | `supertest`: another dependency, and it tests Express instead of the handler contract |

## 7. Dependencies

Every package is listed and approved in spec section 8a; `esbuild` in spec 002 section 9.

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

1. **Inactive rows (AC-1.2, end to end):** with the `dev` seed (which contains inactive and active businesses), open the directory and confirm only the active ones show.
2. **WhatsApp (AC-4.1, AC-4.2):** tap the button on a phone with WhatsApp and on a desktop without it; the greeting is prefilled, and the page is still open in the original tab.
3. **Layout (NFR-2, EC-4):** check at 320 px and on desktop with a very long name and location.
4. **Accessibility (NFR-3):** keyboard-only pass, screen reader names for buttons, and contrast of the design tokens against WCAG AA.
5. **Performance (NFR-1):** measure first load on a throttled mobile connection, including a cold Lambda start.
6. **Freshness (NFR-5):** change a row in the `dev` seed, run the seed again, and confirm the change appears on the next page load.

## 9. Risks

| # | Risk | Mitigation |
|---|---|---|
| R-1 | Lambda cold start plus a Data API call may exceed the 3 s target (NFR-1) | Measure in manual check 5. If it fails, propose a spec change rather than working around it silently. |
| R-2 | Data API result formats (timestamps, UUIDs) differ from a native driver | The repository converts explicitly and is tested with sample Data API responses (plan 002, R-1). |
| R-4 | Returning every row grows the response and query time as businesses are added | Acceptable for hundreds of rows. Pagination is the planned future spec. |
| R-5 | Cross-origin requests from the frontend host to API Gateway need CORS | Configured in spec 002 (AC-2.4); `VITE_API_BASE_URL` keeps the API origin out of the code |
| R-6 | JavaScript dates have millisecond precision while `TIMESTAMPTZ` has microseconds, so near-equal times may tie | The name and id tie-breaks keep the order deterministic |

## 10. Constitution Check

All six principles are met:

1. **Stack Simplicity:** fixed stack only; extra packages approved in spec section 8a.
2. **Spec-Code Alignment:** every part traces to an FR or NFR (see each task's **Covers** line); nothing outside spec 001.
3. **Separation of Concerns:** domain and service modules import no framework; handlers and components hold no business rules (sections 4, 5).
4. **Testing Standard:** tests first for business rules and the endpoint, run in CI (spec 002 FR-8); manual checks for the rest (section 8).
5. **Data Persistence:** versioned one-statement SQL migrations, raw parameterized SQL, no ORM (section 2, D-7).
6. **Language Standard:** English everywhere; Spanish only as UI text in `frontend/src/strings.ts`.
