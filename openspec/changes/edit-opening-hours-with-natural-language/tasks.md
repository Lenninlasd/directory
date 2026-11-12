# Tasks: Edit opening hours with natural language

Each task writes its tests first and confirms they fail for the right reason before the code is written. Each task that adds or changes behavior ends with `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, and `pnpm spec:validate` passing. Then the agent stops and reports, and the human commits. No test calls the Anthropic API, SSM, or the database: they are replaced by fakes.

## 1. Dependencies

- [x] 1.1 Install `@anthropic-ai/sdk` and `@aws-sdk/client-ssm` in `backend` (design D-17), only after the owner approves both in chat.
  - Run `pnpm --filter backend add @anthropic-ai/sdk @aws-sdk/client-ssm`.
  - Add both packages to the npm table of `docs/dependencies.md`, and the Anthropic API to the services table, with the approval date.
  - Verify: `pnpm install --frozen-lockfile` succeeds, `pnpm-lock.yaml` changed, and the existing checks pass.
  - Done 2026-11-11: `@aws-sdk/client-ssm` is on 3.1156.0, not the latest 3.1167.0. The latest was published the same day, and pnpm only installed it by adding `minimumReleaseAgeExclude` entries to `pnpm-workspace.yaml`. The owner chose the version of `@aws-sdk/client-rds-data` instead, which needs no exception (design D-17 updated).

## 2. Backend

- [x] 2.1 Add `validateOpeningHoursForWriting` to `backend/src/domain/openingHours.ts` (design D-6).
  - Tests first, in `backend/test/domain/openingHours.test.ts`: every scenario of "Opening hours for writing" (overlapping, touching, invalid ranges, `[]`), sorting of a valid week, values that are not a list, and one problem message per invalid case. Keep every existing `normalizeOpeningHours` test unchanged.
  - Verify: the tests pass, and the module still imports nothing from Express or Lambda.
- [x] 2.2 Add the admin key check in `backend/src/auth/adminKey.ts` (design D-7).
  - A pure `isAdminKey(authorizationHeader, expectedKey)` and the `requireAdminKey(readAdminKey)` middleware.
  - Tests first, in `backend/test/auth/adminKey.test.ts`: a correct `Bearer` key, a missing header, a wrong key, a key of a different length, another scheme (`Basic`), and that the middleware answers `401` with `{ "error": "unauthorized" }` without calling the next handler.
  - Verify: the tests pass, and the module uses only `node:crypto`.
- [x] 2.3 Add the prompt and `interpretOpeningHours` in `backend/src/interpretation/` (design D-3, D-4, D-5).
  - Tests first, in `backend/test/interpretation/openingHoursInterpretation.test.ts`, with a fake `callModel`:
    - The request it builds: model `claude-haiku-5-5`, effort `low`, the JSON schema, no `temperature` or `thinking`, the stored week in `<stored_hours>` and the request in `<request>`.
    - An `end_turn` proposal is returned sorted. `understood: false` is passed through. A proposal that fails the write rules becomes `understood: false`.
    - `refusal` becomes `understood: false`. `max_tokens`, a missing text block, and text that is not JSON throw `InterpretationUnavailable`.
  - Verify: the tests pass, and the module imports nothing from the SDK at run time (types only).
- [x] 2.4 Add `findActiveBusinessOpeningHours` and `updateActiveBusinessOpeningHours` to `businessRepository.ts` (design D-10).
  - Tests first, in `backend/test/repositories/businessRepository.test.ts`, with a fake `execute`: the SQL and the named parameters `id` and `openingHours`, the casts to `uuid` and `jsonb`, the `is_active` condition in both, and how a found row, no row, and a `NULL` value are returned.
  - Verify: the tests pass, and the existing repository tests are unchanged.
- [x] 2.5 Add the two services in `backend/src/services/openingHoursService.ts`.
  - `interpretBusinessOpeningHours`: checks the request text (1 to 300 characters after trimming), checks the id format, reads the stored hours, reads the Anthropic key only then, and calls `interpretOpeningHours`.
  - `saveBusinessOpeningHours`: checks the id format, validates the week, and writes it.
  - Tests first, in `backend/test/services/openingHoursService.test.ts`: each outcome of "Opening hours interpretation" and "Opening hours update", including that a bad id, an unknown business, or invalid text never reads the Anthropic key or calls the model, and that stored invalid hours are sent to the model as `[]`.
  - Verify: the tests pass, with no database or HTTP layer.
- [ ] 2.6 Add the two routes to `backend/src/app.ts` (design D-1, D-7, D-12).
  - The JSON body parser with a 4 KB limit and `requireAdminKey` on the two routes only, and the status codes and bodies of the business-editing spec.
  - Tests first, in a new `backend/test/app.openingHours.test.ts` that calls the Express app with fake dependencies: every scenario with a status code in "Admin key", "Editing an inactive or unknown business", "Opening hours interpretation", and "Opening hours update", plus that each request logs one line with the fields of D-12 and never the header, the key, or the request text.
    - When the outcome is `unavailable`, the `cause` of `InterpretationUnavailable` also goes to `logError`, so a wrong Anthropic key or a rejected request (`401`, `400`) can be told apart from a timeout or a `5xx`. Test it with a fake cause of each kind, and check that the logged line still holds no header, key, or request text.
  - Verify: the new tests pass, and the `GET /businesses` tests in `lambda.test.ts` pass unchanged.
- [ ] 2.7 Wire the real clients in `backend/src/handlers/lambda.ts` (design D-8, D-11).
  - A `readSecureParameter(name)` over `SSMClient` with `WithDecryption: true`, the parameter names from `ADMIN_KEY_PARAMETER` and `ANTHROPIC_API_KEY_PARAMETER`, and an Anthropic client per request with `timeout: 7000` and `maxRetries: 0`.
  - Tests first, in `backend/test/handlers/lambda.test.ts`: a missing parameter name answers `500` with `internal_error`, the SSM command asks for decryption, and the handler passes the routes through to the app.
  - Verify: the tests pass, and `sam build --config-env dev` bundles the function.

## 3. Infrastructure

- [ ] 3.1 Update `infra/template.yaml` (design D-9, D-15).
  - The two `HttpApi` events, CORS methods `GET`, `POST`, `PUT` and headers `authorization`, `content-type`, the two environment variables with parameter names, and the `ssm:GetParameter` and conditional `kms:Decrypt` statements.
  - Verify: `sam validate --lint` passes, and a review of the template shows no secret value and no permission beyond those of the infrastructure spec.
- [ ] 3.2 Document the secrets in `infra/README.md`.
  - A "Secret parameters" section under one-time manual setup: how to generate a key, the `aws ssm put-parameter --type SecureString --overwrite` commands for both parameters per environment (with placeholder values only), how to rotate, and the recommended monthly spend limit in the Anthropic Console.
  - A note under migrations: a data migration that sets `opening_hours` reads the current `prod` value first.
  - Verification steps for tasks 6.1 and 6.2: how to call each route with `curl`, and how to check the role's permissions.
  - Verify: the commands use only placeholders, and `pnpm spec:validate` passes.

## 4. Frontend

- [ ] 4.1 Add the texts and the pure modules (design D-13, D-14).
  - The texts of "Editing interface text" in `frontend/src/strings.ts`.
  - `features/businesses/adminMode.ts` with `isAdminMode(search)`, `features/businesses/adminKey.ts` with get, set, and clear over `sessionStorage`, and `changedDays` and `formatDayList` in `features/businesses/openingHours.ts`.
  - Tests first: `strings.test.ts` for the new texts, `adminMode.test.ts` (`?admin`, `?admin=1`, other parameters, none), `adminKey.test.ts` (round trip, clear, and a storage that throws), and `openingHours.test.ts` for one changed day, several days, no change, a day that gains or loses a range, and the three list forms.
  - Verify: the tests pass, and the modules import nothing from React.
- [ ] 4.2 Add the API functions and mutation hooks.
  - `frontend/src/api/openingHours.ts` with `interpretOpeningHours` and `saveOpeningHours`, and `UnauthorizedError` for `401`. Hooks `useInterpretOpeningHours` and `useSaveOpeningHours`, the second invalidating `BUSINESSES_QUERY_KEY` on success.
  - Tests first: `frontend/test/api/openingHours.test.ts` with a mocked `fetch`, for the URL, method, `Authorization` header, body, each response shape, and `UnauthorizedError`. Hook tests with a fresh `QueryClient` and a mocked API layer, for the invalidation after a save and no retry after a failure.
  - Verify: the tests pass.
- [ ] 4.3 Add `OpeningHoursEditor.tsx` and admin mode to the dialog (design D-13, D-14, D-18).
  - The AI border tokens, the `@property` rule, and the animation in `frontend/src/index.css`, and the sparkle icon in `icons.tsx`.
  - `Directory` reads `isAdminMode(window.location.search)` once and passes it to `BusinessDetailDialog`. In admin mode, the "Horario" row always shows, with "Sin horario registrado" when empty, and the "Editar horario" button opens the editor.
  - Tests first, in `frontend/test/features/businesses/OpeningHoursEditor.test.tsx` and `BusinessDetailDialog.test.tsx`, with a mocked API layer:
    - No editing control without admin mode, and the existing dialog tests unchanged.
    - Every scenario of "Admin mode" and "Opening hours edit flow": the key step, the wrong key keeping the text, the disabled buttons, the loading, proposal, no-change, not-understood, saved, canceled, and failure states, and the `role="status"` region.
    - The text box has `maxLength` 300 and the placeholder of the wording table, the border wrapper has `data-interpreting` only while interpreting, and the sparkle icon is `aria-hidden`. The motion itself cannot be tested in jsdom, so task 6.1 checks it.
  - Verify: the tests pass, and the whole flow works with the keyboard alone in `pnpm --filter frontend dev` against fakes.

## 5. Eval

- [ ] 5.1 Add the golden set and the eval script (design D-16).
  - `backend/eval/openingHours/cases.json` with about 20 cases covering the kinds listed in D-16, and `backend/scripts/evalOpeningHours.ts`.
  - Include two cases the prompt does not cover by name: a change to one day when no hours are stored ("el sábado cerramos a las 2" with `[]`, expected not understood) and "abiertos 24 horas" (expected every day from `00:00` to `24:00`). If the eval shows the model gets them wrong, add a rule and move the prompt to `opening-hours-v2`, instead of changing the prompt before measuring.
  - Tests first: `backend/test/eval/scoreCase.test.ts` for `scoreCase`: an exact match, the same week in another order, a different range, and `understood` that differs. A test that every case in `cases.json` has a valid stored week and, when understood, a valid expected week. A test that no case `request` appears in `SYSTEM_PROMPT`, so the prompt's own examples never inflate the score.
  - Document how to run it in `infra/README.md` or a short comment at the top of the script, with the cost estimate.
  - Verify: the tests pass, and `pnpm -r test` does not run the script.

## 6. Final check in `dev`

- [ ] 6.1 The owner creates the `dev` parameters, deploys `dev`, and checks the flow in the browser.
  - Without `?admin`, nothing changes. With `?admin`, editing one day, a whole week, a request that is not understood, a wrong key, and canceling all behave as the spec says, and a saved week appears after the reload.
  - `curl` without a key and with a wrong key gets `401`.
  - The text box stops at 300 characters and grows up to about six lines. The border moves only during "Interpretando…", never with reduced motion on, and the focus outline is visible with the keyboard.
  - Verify: note the results in this task. If a check fails, stop and propose the fix through `/opsx:update` before changing code.
- [ ] 6.2 Check least privilege in `dev` (design D-9).
  - The Lambda reads both parameters. With the role's credentials simulated in the IAM policy simulator, `ssm:GetParameter` on another parameter and `kms:Decrypt` outside SSM are denied.
  - Verify: note the results in this task.
- [ ] 6.3 Measure times in `dev` (design D-11).
  - Interpretation latency on a cold and a warm Lambda, and `GET /businesses` on a cold Lambda, compared with the performance check of the infrastructure spec.
  - Verify: note the numbers in this task. If an interpretation comes close to 10 seconds, stop and propose a change through `/opsx:update`.
- [ ] 6.4 Run the eval with the owner's approval of its cost.
  - Verify: note the accuracy, tokens, and cost in this task. The owner decides if it is good enough for `prod`.
- [ ] 6.5 The owner creates the `prod` parameters with new values and deploys `prod`.
  - Verify: `?admin` and a save work in `prod`, and the `prod` key is rejected by `dev`.

## Workflow follow-up

- When every task is done and the owner says so, run `pnpm exec openspec archive edit-opening-hours-with-natural-language --yes` and then `pnpm spec:validate`, as the last commit of the pull request.
