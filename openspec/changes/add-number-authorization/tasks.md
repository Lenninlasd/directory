# Tasks: Add WhatsApp number authorization

Each task writes its tests first and confirms they fail for the right reason. Each task ends with `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, and `pnpm spec:validate` passing. Then the agent stops and reports, and the human commits. No test hits the network or the database.

## 1. Backend

- [ ] 1.1 Add the column, the backfill, and the seed change (design D-2, D-6).
  - Write `003_add_whatsapp_authorized_at.sql` and `004_authorize_existing_whatsapp_numbers.sql`, one statement each. Check `TIMESTAMPTZ` and `ALTER TABLE ... ADD COLUMN` against the Aurora PostgreSQL documentation first.
  - Update `backend/seeds/dev_businesses.sql`: an authorization time for every sample number except one valid one.
  - Verify: the existing migration tests pass, and the statement counter sees one statement per file.
- [ ] 1.2 Return only authorized numbers from `GET /businesses` (directory spec, "WhatsApp number validity"; design D-3).
  - Tests first: `publicWhatsappNumber` returns the normalized number with a time and `null` without one; the repository reads `whatsapp_authorized_at`; `GET /businesses` returns `null` for an unauthorized valid number. The existing tests keep passing with authorized numbers.
  - Verify: the tests pass.
- [ ] 1.3 Add the WhatsApp number routes (business-editing spec, "WhatsApp number routes"; design D-4).
  - Tests first: every scenario of the requirement, plus `401` without the key and `404` for an unknown or inactive business; the repository's SQL and parameters.
  - Add both route events to `infra/template.yaml`.
  - Verify: the tests pass, and `sam validate` passes.

## 2. Frontend

- [ ] 2.1 Add the admin WhatsApp row (business-editing spec, "WhatsApp number in admin mode"; design D-5, D-9).
  - Tests first, with a mocked API and a fresh `QueryClient`: "Ver número" asks for the key when none is kept and then shows the number and its status; saving shows "Guardando…" and "Número actualizado" and reloads the list; a `400` shows "Número no válido" and keeps the input; outside admin mode the row is absent and no request is sent; the texts of the table, literally.
  - Verify: the tests pass, and the existing admin mode tests are unchanged.
- [ ] 2.2 Add the "¿Es tu negocio?" link (owner-contact spec, "Business owner link"; design D-7, D-9).
  - Ask the owner for the administrator's WhatsApp number, with the country code.
  - Tests first: the URL decodes to the exact message of the spec example and is addressed to the administrator; the link is below the WhatsApp button, or below "Este negocio no tiene WhatsApp registrado"; it opens in a new tab.
  - Verify: the tests pass, and at 320 px the WhatsApp button is still visible without scrolling.
- [ ] 2.3 Add the policy page (owner-contact spec, "Data policy page"; design D-8).
  - Ask the owner to approve the policy text and to give the name, email, and effective date.
  - Tests first: a test reads `frontend/politica-de-datos.html` and checks every heading and text of the spec table, in order, with one first-level heading.
  - Verify: the tests pass, and `pnpm --filter frontend build` writes `dist/politica-de-datos.html` with the app's styles.

## 3. Guide and check

- [ ] 3.1 Write `docs/number-authorization.md` (owner-contact spec, "Number authorization" and "Correction and removal"): the invitation message to copy, how to store an unauthorized number in admin mode, how to check the reply and keep the chat, how to mark it as authorized, and how to handle refusals, corrections, and removals. Verify: every rule in the guide matches the spec.
- [ ] 3.2 Deploy `dev` and check on a phone: a visitor does not see the unauthorized seed number; in admin mode "Ver número" shows it as "Sin autorizar"; marking it as authorized shows its WhatsApp button; "¿Es tu negocio?" opens WhatsApp to the administrator; `/politica-de-datos` shows the policy. Record the result and the date here.

## Workflow follow-up

- When every task is done and the owner says so, archive with `pnpm exec openspec archive add-number-authorization --yes`, then run `pnpm spec:validate`.
