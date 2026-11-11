# Tasks: Add business opening hours and website

Each task writes its tests first and confirms they fail for the right reason before the code is written. Each task ends with `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, and `pnpm spec:validate` passing. Then the agent stops and reports, and the human commits.

## 1. Database

- [ ] 1.1 Add `backend/migrations/002_add_business_hours_and_website.sql` (design D-2).
  - Test first: a new `backend/test/migrations/migrationFiles.test.ts` reads every file in `backend/migrations/` and `backend/seeds/` and asserts that `countStatements` returns 1 for each, and that a migration adds `website_url` and `opening_hours`. It fails because the file does not exist yet.
  - Verify: the test passes.
- [ ] 1.2 Add the two columns and the example values to `backend/seeds/dev_businesses.sql` (design D-8).
  - Test first: in `migrationFiles.test.ts`, assert that every `https` URL in the seed is on `example.com`, and that the seed has one `http://` website to check the `null` path.
  - Verify: the tests pass, and the seed is still one statement.

## 2. Backend

- [ ] 2.1 Add the two validators in `backend/src/domain/` (design D-4, D-5).
  - Tests first:
    - `backend/test/domain/websiteUrl.test.ts`: the scenarios of "Website validity", plus surrounding spaces, an empty string, and `null`.
    - `backend/test/domain/openingHours.test.ts`: the scenarios of "Opening hours validity". Cover sorting, `"24:00"` as a closing time, `null`, text that is not JSON, JSON that is not a list, and one case per invalid range (day `0` and `8`, `7:00`, `25:00`, and `closes` equal to or before `opens`).
  - Verify: the tests pass, and the modules import nothing from Express or Lambda.
- [ ] 2.2 Return the two fields from `GET /businesses` (design D-3).
  - Add `websiteUrl` and `openingHours` to `BusinessRow` (raw strings) and `Business` in `domain/business.ts`.
  - Select `website_url` and `opening_hours::text` in `businessRepository.ts`.
  - Apply the two validators in `toBusiness` in `businessService.ts`.
  - Tests first:
    - `businessRepository.test.ts`: the query selects both columns, and maps a value and `null` for each.
    - `businessService.test.ts`: an invalid website becomes `null`, and invalid hours become `[]`.
    - `lambda.test.ts`: each business has exactly the eight fields of "Business list API".
  - Verify: the tests pass.

## 3. Frontend

- [ ] 3.1 Add the types, the texts, and the two pure functions (design D-6).
  - Add `websiteUrl` and `openingHours` to `Business` in `frontend/src/api/businesses.ts`.
  - Add the new rows of "Interface text" to `frontend/src/strings.ts`.
  - Add `formatOpeningHours` in `features/businesses/openingHours.ts` and `websiteLinkText` in `features/businesses/website.ts`.
  - Tests first:
    - `frontend/test/features/businesses/openingHours.test.ts`: the three scenarios of "Opening hours display", plus a single-day group, seven equal days ("Lunes a domingo"), and `[]`.
    - `frontend/test/features/businesses/website.test.ts`: the "Link text" scenario, plus an address without a trailing slash.
    - `frontend/test/strings.test.ts`: the new texts.
  - Update the `Business` fixtures in the other frontend tests to the new type, without changing any assertion.
  - Verify: the tests pass, and the two modules import nothing from React.
- [ ] 3.2 Add the "Horario" and "Página web" rows to `BusinessDetailDialog.tsx`, and `ExternalLinkIcon` to `icons.tsx` (design D-7).
  - Tests first, in `frontend/test/features/businesses/BusinessDetailDialog.test.tsx`:
    - Both rows show after "Ubicación", in the order of the spec, with the formatted lines and the link text.
    - Neither row shows for `[]` and `null`.
    - The link has the website as `href`, `target="_blank"`, and `rel="noopener noreferrer"`, and the icon is `aria-hidden`.
  - Verify: the new tests and the existing dialog tests pass.

## 4. Final check

- [ ] 4.1 The owner deploys `dev` with the seed and looks at the dialog.
  - On a 320 px wide screen, "Ubicación" and the WhatsApp button are visible without scrolling for the business with the most hours lines.
  - The website link opens in a new tab, and the dialog is still open on return.
  - The businesses seeded with invalid hours or an invalid website show no row for them.
  - Verify: note the result in this task. If a check fails, stop and propose the fix through `/opsx:update` before changing code.

## Workflow follow-up

- After the owner approves the change, record `x-approved` in `.openspec.yaml`.
- When every task is done and the owner says so, run `pnpm exec openspec archive add-business-hours-and-website --yes` and then `pnpm spec:validate`, as the last commit of the pull request. This needs the `adopt-openspec` archive merged into the branch first.
