# Tasks: Add a business request form

Each task writes its tests first and confirms they fail for the right reason before the code is written. Each task that adds or changes behavior ends with `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, and `pnpm spec:validate` passing. Then the agent stops and reports, and the human commits. No test hits the network, and every test that needs the form address sets a made-up one with `vi.stubEnv`.

## 1. Form address

- [ ] 1.1 Add the form address validator and read it with the other build values (owner-contact spec, "Add business form address"; design D-5).
  - First check that `add-number-authorization` is archived: `openspec/specs/owner-contact/spec.md` exists. If not, stop and tell the owner.
  - Add `readAddBusinessFormUrl` to `frontend/src/features/ownerContact/ownerContact.ts`, `VITE_ADD_BUSINESS_FORM_URL` to `frontend/src/vite-env.d.ts`, and `addBusinessFormUrl` to `config.ts`.
  - Tests first:
    - In `frontend/test/features/ownerContact/ownerContact.test.ts`: `https://forms.gle/…` and `https://docs.google.com/forms/d/…` are returned; `null` for `undefined`, `''`, `http://forms.gle/…`, `https://docs.google.com/document/…`, `https://forms.gle.example.com/…`, and text that is not a URL.
    - In `frontend/test/features/ownerContact/config.test.ts`: the address is read when set, `null` when missing or invalid, and the existing values are unchanged.
  - Verify: the tests pass, and the existing owner contact tests are unchanged.

## 2. Floating button

- [ ] 2.1 Add `AddBusinessButton` and render it from `Directory` after `<main>` (owner-contact spec, "Add a business button"; directory spec, "Screen layout"; design D-6).
  - Add the button text to `strings.ts`.
  - Tests first:
    - In `frontend/test/strings.test.ts`: "¿Tienes un negocio en Alameda del Río?", written literally.
    - In `frontend/test/features/ownerContact/AddBusinessButton.test.tsx`: with a valid form address, a link with that name points to the address with `target="_blank"` and `rel="noopener noreferrer"`. Without a valid address, nothing is rendered.
    - In `frontend/test/features/businesses/Directory.test.tsx`: the button is shown while loading, after a failure, with no businesses, and with businesses; it is outside the `main` landmark; and opening a business dialog leaves the button outside the dialog. The existing tests stay unchanged.
  - Verify: the tests pass. In the dev server at 320 px and on a desktop width: the button fits, stays below the header when both overlap, the last tile is fully visible above it at the end of the page, and it cannot be focused with Tab while the dialog is open.

## 3. Policy section

- [ ] 3.1 Add "Quién más los trata" to the policy page (owner-contact spec, "Form processor disclosure"; design D-7).
  - Tests first:
    - In `frontend/test/policy/DataPolicyPage.test.tsx`: the heading, as a second-level heading, and its text appear between "Para qué los usamos" and "Tus derechos". The existing policy tests stay unchanged.
    - In `frontend/test/strings.test.ts`: the heading and text, written literally.
  - Verify: the tests pass.

## 4. Deploy and the form

- [ ] 4.1 Read the form address in `infra/deploy.sh` and document it (infrastructure spec, "Add business form address at build time"; design D-8).
  - Add `add-business-form-url` to the list of parameter names, passed as `VITE_ADD_BUSINESS_FORM_URL`.
  - In `infra/README.md`, with the other owner contact parameters: the `aws ssm put-parameter --type String` command, one form per environment, and that a recreated form needs the parameter updated and a redeploy.
  - Verify: `bash -n infra/deploy.sh` passes, and `git grep` finds no real form address in the repository.
- [ ] 4.2 Write the form checklist and register Google Forms (owner-contact spec, "Add a business form" and "Form authorization"; design D-1 to D-4, D-9).
  - Only after the owner approves Google Forms in chat, add it to the "Tools and services outside the lockfile" table of `docs/dependencies.md`, with the date.
  - Write `docs/add-business-form.md`: how to create the form of each environment from the spec (every element, type, text, the regex and its error text, and each setting); how to build the confirmation `wa.me` link with the encoded text; and the administrator's process for each response (match the number with `57` in front, the 7 days, deleting unconfirmed responses, keeping the response and the exported chat as `docs/number-authorization.md` says, the data migration).
  - The owner creates the `dev` form from the checklist. Check in it that the URL in the confirmation message is clickable. If it is not, apply the fallback of the design risks and update the spec's confirmation scenario in this change.
  - Verify: a test response to the `dev` form is rejected with "Escribe 10 dígitos que empiecen por 3" for `300123456` and `6001234567`, and accepted for `3001234567`; the form cannot be sent without the checkbox; the response lands in a sheet only the owner can open.

## 5. Check in dev

- [ ] 5.1 Deploy `dev` and check the whole flow (integration of tasks 1 to 4).
  - Before creating the parameter, run `infra/deploy.sh dev` and confirm it stops naming `add-business-form-url`, before `sam build`.
  - Create the `dev` form parameter, deploy `dev`, and on a phone check that:
    - The floating button is visible in the loaded state and after a failed load, and opens the `dev` form in a new tab.
    - The form matches the spec table, its checkbox link opens the `dev` policy page, and the policy shows "Quién más los trata".
    - After sending, the confirmation link opens WhatsApp to the administrator with "Confirmo mi registro en el directorio de Alameda del Río", and, following `docs/add-business-form.md`, the response and the message can be matched by number.
  - Record the results and the date in this task, and delete the test response from the `dev` sheet.

## Workflow follow-up

- The owner may have the use of Google Forms reviewed by a lawyer before the first `prod` deploy that includes this change.
- Create the `prod` form and its parameter before that deploy.
- When every task is done and the owner says so, archive with `pnpm exec openspec archive add-business-request-form --yes`, then run `pnpm spec:validate`, as the last commit of the pull request.
