# Tasks: Add WhatsApp number authorization

Each task writes its tests first and confirms they fail for the right reason. Each task ends with `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, and `pnpm spec:validate` passing. Then the agent stops and reports, and the human commits.

## 1. Implementation

- [ ] 1.1 Add the "¿Es tu negocio?" link (owner-contact spec, "Business owner link"; design D-2, D-4).
  - Ask the owner for the administrator's WhatsApp number, with the country code.
  - Add the link text and the message to `strings.ts`, the number constant and `buildBusinessOwnerUrl` to `src/features/ownerContact/ownerContact.ts`, and the link to `BusinessDetailDialog.tsx`.
  - Tests first: the URL decodes to the exact message of the spec example and is addressed to the administrator; the dialog shows the link below the WhatsApp button, and below "Este negocio no tiene WhatsApp registrado" for a business without a number; it opens in a new tab.
  - Verify: the tests pass, and at 320 px the WhatsApp button is still visible without scrolling.
- [ ] 1.2 Add the policy page (owner-contact spec, "Data policy page"; design D-3).
  - Ask the owner to approve the policy text and to give the name, email, and effective date.
  - Add `frontend/politica-de-datos.html` and list both HTML files in `build.rolldownOptions.input` in `vite.config.ts`.
  - Tests first: a test reads the HTML file and checks every heading and text of the spec table, in order, with one first-level heading.
  - Verify: the tests pass, `pnpm --filter frontend build` writes `dist/politica-de-datos.html`, and the page shows the app's styles in `vite preview`.
- [ ] 1.3 Write `docs/number-authorization.md` (owner-contact spec, "Number authorization" and "Correction and removal").
  - The invitation message to copy, how to check the reply and export the chat, where to keep it, and how to handle corrections and removals.
  - Verify: every rule in the guide matches the spec.

## 2. Check in dev

- [ ] 2.1 Deploy `dev` and check on a phone that "¿Es tu negocio?" opens WhatsApp to the administrator with the business name and id, and that `/politica-de-datos` shows the policy. Record the result and the date here.

## Workflow follow-up

- When every task is done and the owner says so, archive with `pnpm exec openspec archive add-number-authorization --yes`, then run `pnpm spec:validate`.
