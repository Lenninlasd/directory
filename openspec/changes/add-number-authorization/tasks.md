# Tasks: Add WhatsApp number authorization

Each task writes its tests first and confirms they fail for the right reason before the code is written. Each task that adds or changes behavior ends with `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, and `pnpm spec:validate` passing. Then the agent stops and reports, and the human commits. No test hits the network, and every test that needs the owner contact values sets made-up ones with `vi.stubEnv`.

## 1. Owner contact module

- [ ] 1.1 Add the owner contact strings, the number validator, and the owner URL builder (owner-contact spec, "Owner contact values", "Business owner message", "Owner contact text"; design D-3).
  - Add the owner link and back link texts, and the owner message as a function of the business name and id, to `frontend/src/strings.ts`.
  - Create `frontend/src/features/ownerContact/ownerContact.ts` with `readAdminWhatsappNumber` and `buildBusinessOwnerUrl`.
  - Tests first:
    - In `frontend/test/strings.test.ts`: the exact texts of the "Owner contact text" table and the owner message of the spec example, written literally.
    - In `frontend/test/features/ownerContact/ownerContact.test.ts`: a valid number is returned; `null` for `undefined`, `''`, letters, a leading `+` or `0`, 7 digits, and 16 digits. The owner URL starts with `https://wa.me/<number>?text=` and decodes back to the exact message of the spec example.
  - Verify: the tests pass, and `ownerContact.ts` imports nothing from React.
- [ ] 1.2 Add the build values reader (design D-4).
  - Declare `VITE_ADMIN_WHATSAPP_NUMBER`, `VITE_DATA_CONTROLLER_NAME`, and `VITE_DATA_CONTROLLER_EMAIL` as optional in `frontend/src/vite-env.d.ts`.
  - Create `frontend/src/features/ownerContact/config.ts`, which reads them when called and returns `{ adminWhatsappNumber, controllerName, controllerEmail }`, each `null` when missing, empty, or invalid.
  - Tests first, in `frontend/test/features/ownerContact/config.test.ts`, with `vi.stubEnv`: all three values set; each one missing; an invalid number becomes `null`; a value changed between two calls is read again.
  - Verify: the tests pass.

## 2. Business owner link

- [ ] 2.1 Add the "¿Es tu negocio?" link to `BusinessDetailDialog` (owner-contact spec, "Business owner link"; directory spec, "Business detail dialog"; design D-5).
  - Tests first, in `frontend/test/features/businesses/BusinessDetailDialog.test.tsx`:
    - With a valid number, the link is shown below "Escribir por WhatsApp" for a business with WhatsApp, and below "Este negocio no tiene WhatsApp registrado" for one without.
    - Its address is the owner URL of that business, addressed to the administrator and not to the business, and it opens in a new tab.
    - Its accessible name equals its visible text.
    - Without a valid number, it is not shown. The existing dialog tests, including admin mode, stay unchanged.
  - Verify: the tests pass. In the dev server at 320 px wide, the location row and the WhatsApp button are still visible without scrolling, and the link has a 44 px touch target.

## 3. Data policy page

- [ ] 3.1 Add the policy page as a second Vite entry (owner-contact spec, "Data policy page"; design D-6).
  - Before writing the text, ask the owner to approve the policy text and the invitation message of the spec, and the effective date. Record the date as a constant in `strings.ts`.
  - Add the policy strings to `strings.ts`, `frontend/src/policy/DataPolicyPage.tsx`, `frontend/src/policy/main.tsx`, and `frontend/politica-de-datos.html` with `lang="es"`. Add both HTML files to `build.rolldownOptions.input` in `frontend/vite.config.ts`.
  - Tests first:
    - In `frontend/test/policy/DataPolicyPage.test.tsx`: every heading and text of the spec table, in order, with the made-up name, email, and `+` number filled in; one first-level heading and second-level section headings; "Volver al directorio" links to `/`. Without each build value, the "Responsable" text omits that part and its label.
    - In `frontend/test/strings.test.ts`: the policy texts, written literally.
  - Verify: the tests pass. `pnpm --filter frontend build` writes `dist/index.html` and `dist/politica-de-datos.html`, and the policy page opens at `/politica-de-datos.html` in `pnpm --filter frontend exec vite preview` with the app's styles.

## 4. Deploy and the administrator guide

- [ ] 4.1 Read the owner contact values in `infra/deploy.sh` and document them (infrastructure spec, "Owner contact values at build time"; design D-7).
  - After the environment and `prod` checks and before `sam build`, read `/alameda/<env>/admin-whatsapp-number`, `/alameda/<env>/data-controller-name`, and `/alameda/<env>/data-controller-email` from one list of names. Stop with a message naming any parameter that is missing or empty.
  - Pass them only to the frontend build, as `VITE_ADMIN_WHATSAPP_NUMBER`, `VITE_DATA_CONTROLLER_NAME`, and `VITE_DATA_CONTROLLER_EMAIL`, together with `VITE_API_BASE_URL`.
  - In `infra/README.md`, next to the secret parameters: the three `aws ssm put-parameter --type String` commands; that the number has the country code and digits only; that these values are public on the site; that they must exist before the first `prod` deploy; and that in local development the policy page is at `/politica-de-datos.html`.
  - Verify: `bash -n infra/deploy.sh` passes. `git diff` shows no change to `infra/template.yaml` or `infra/samconfig.toml`, and `git grep` finds no real number, name, or email in the repository.
- [ ] 4.2 Write `docs/number-authorization.md` (owner-contact spec, "Number authorization", "Invitation message", "Correction and removal requests"; design D-1, D-2, D-8).
  - The invitation message with its placeholders, copied from the spec; when a number needs an authorization and when it does not (company with NIT); the checks before a data migration; how to export the chat and where to keep it; the 7 days and the single reminder; how to handle corrections, removals, and a request from another number; and the 15 business days.
  - Verify: every rule and text in the guide matches the spec, and the guide contains no real name, number, or email.

## 5. Check in dev

- [ ] 5.1 Deploy `dev` and check the whole flow (integration of tasks 1 to 4).
  - Before creating the parameters, run `infra/deploy.sh dev` and confirm it stops naming the first missing parameter, before `sam build`.
  - Create the three `dev` parameters (owner's values), deploy `dev`, and on a phone check that:
    - "¿Es tu negocio?" opens WhatsApp to the administrator with the business name and id, for a business with WhatsApp and one without.
    - `/politica-de-datos` shows the policy with the owner's values, and "Volver al directorio" returns to the list.
    - An invitation sent to a test number following `docs/number-authorization.md`, with the `dev` policy address, arrives with a working policy link, and the "Sí, autorizo" reply can be exported as the guide says.
  - Record the results and the date in this task.

## Workflow follow-up

- The owner may have the policy and invitation texts reviewed by a lawyer before the first `prod` deploy. A wording change is a text-only update of this change, or a new change after the archive.
- Create the three `prod` parameters before the `prod` deploy of `finish-mvp-rollout`.
- When every task is done and the owner says so, archive with `pnpm exec openspec archive add-number-authorization --yes`, then run `pnpm spec:validate`, as the last commit of the pull request. `add-business-request-form` is applied after this archive.
