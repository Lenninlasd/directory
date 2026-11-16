# Tasks: Add a business request form

Each task writes its tests first and confirms they fail for the right reason. Each task ends with `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, and `pnpm spec:validate` passing. Then the agent stops and reports, and the human commits.

## 1. Implementation

- [ ] 1.1 Create the form (owner-contact spec, "Add a business form" and "Form authorization"; design D-1, D-2).
  - First check that `openspec/specs/owner-contact/spec.md` exists, so `add-number-authorization` is archived.
  - After the owner approves Google Forms in chat, add it to the services table of `docs/dependencies.md`, with the date.
  - Write `docs/add-business-form.md`: how to create the form from the spec, and how to process each response (match the number, keep the response and the chat, write the data migration).
  - The owner creates the form from the checklist and gives its address.
  - Verify: the form rejects `300123456` and `6001234567`, accepts `3001234567`, cannot be sent without the checkbox, and its confirmation link opens WhatsApp with the confirmation text.
- [ ] 1.2 Add the floating button (owner-contact spec, "Add a business button"; design D-3, D-4).
  - Add the button text to `strings.ts`, the form address constant to `ownerContact.ts`, and `AddBusinessButton` to `Directory`.
  - Tests first: the button is a link to the form address that opens in a new tab; `Directory` shows it while loading, after a failure, with no businesses, and with businesses. The existing tests stay unchanged.
  - Verify: the tests pass. At 320 px the button fits, the last tile is visible above it, and Tab does not reach it while the dialog is open.
- [ ] 1.3 Add "Quién más los trata" to the policy page (owner-contact spec, "Form processor disclosure").
  - Tests first: the policy page test checks the heading and its text between "Para qué los usamos" and "Tus derechos".
  - Verify: the tests pass.

## 2. Check in dev

- [ ] 2.1 Deploy `dev` and check on a phone: the button opens the form, the form matches the spec, the confirmation link opens WhatsApp, and the response and the message can be matched by number. Delete the test response. Record the result and the date here.

## Workflow follow-up

- When every task is done and the owner says so, archive with `pnpm exec openspec archive add-business-request-form --yes`, then run `pnpm spec:validate`.
