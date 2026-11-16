# Design: Add WhatsApp number authorization

## Context

See `proposal.md` for the motivation, and the three spec deltas for the required behavior (`owner-contact`, `directory`, `infrastructure`). What shapes the approach:

- **Frontend.** One Vite entry (`index.html` → `src/main.tsx`) renders `Directory`, with no router. Every text is in `src/strings.ts`, and `strings.test.ts` checks the exact wording. `features/businesses/whatsapp.ts` builds the business `wa.me` URL, and the WhatsApp links open in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). The detail dialog is a native `<dialog>` opened with `showModal()`. The only build variable today is `VITE_API_BASE_URL`, read at call time, and tests set it with `vi.stubEnv`.
- **Number validity.** The backend validates business numbers (`normalizeWhatsappNumber`), and the frontend trusts what the API returns. The administrator number does not come from the API, so the frontend has to check it itself.
- **Data loading.** Business rows change only through reviewed data migrations (infrastructure spec, "Business data loading"). Authorization and removal therefore end in a migration, and the product has no state of its own about them.
- **Deploy.** `infra/deploy.sh dev|prod` runs from the developer's machine with their AWS credentials: it checks that the tree is clean, deploys the stack, runs migrations, builds the frontend with `VITE_API_BASE_URL`, and uploads `frontend/dist` to Cloudflare Pages. Secrets already live in SSM under `/alameda/<env>/`.
- **Hosting.** Cloudflare Pages serves `politica-de-datos.html` at `/politica-de-datos` and redirects the `.html` address to it. This cannot be turned off ([Cloudflare Pages, "Serving Pages"](https://developers.cloudflare.com/pages/configuration/serving-pages/), checked 2026-11-15).
- **Vite.** The installed version is 8.3.5. A multi-page build lists each HTML file in `build.rolldownOptions.input`, which replaces `build.rollupOptions`, now deprecated ([Vite, "Building for Production", Multi-Page App](https://vite.dev/guide/build), checked 2026-11-15, and the installed type definitions).

## Goals / Non-Goals

**Goals:**

- The authorization is a written reply from the number itself, so one message both authorizes and proves control of the number.
- The validator and the URL builder are pure functions, tested without React or the network.
- A build without the owner contact values (local development, CI, tests) still works and simply hides the owner link.
- `add-business-request-form` can reuse the module, the config reader, the policy page, and the deploy step without changing them.

**Non-Goals:**

- No storage of authorizations in the product. The evidence lives outside the repository, and a later change can add `consented_at`.
- No router library and no client-side routing.
- No validation of the administrator number's country code. The administrator stores it with 57, as the README will say.

## Decisions

| # | Decision | Alternatives discarded | Why |
|---|---|---|---|
| D-1 | The authorization is the reply "Sí, autorizo" to a fixed invitation, sent from the number to publish, and the evidence is the exported chat. | (a) An oral authorization. (b) A signed paper form. (c) A form. | Decree 1377 of 2013, art. 7, accepts written, oral, or unequivocal-conduct authorization, and art. 8 puts the proof on the controller. (a) is hard to prove. (b) needs a visit per business. (c) is `add-business-request-form`. A reply from the number is written, cheap, and proves control of that number. |
| D-2 | The invitation text is fixed in the spec, with placeholders the administrator fills in. | A free message each time. | Every owner gets the information Law 1581, art. 12, requires, and the evidence shows exactly what was said. A wording change goes through a change, like any interface text. |
| D-3 | `src/features/ownerContact/ownerContact.ts` exports pure functions: `readAdminWhatsappNumber(value)` returns the number when it matches `^[1-9][0-9]{7,14}$` and `null` otherwise, and `buildBusinessOwnerUrl(adminNumber, business)` returns `https://wa.me/<number>?text=<encoded message>`. The texts are in `strings.ts`. | (a) Building the URL inside the component. (b) Reusing `buildWhatsappUrl`, which always adds the greeting. | (a) would need a rendered component to test the message. (b) has the wrong text. The regex is the directory's validity rule applied to a number that is already digits only. |
| D-4 | `src/features/ownerContact/config.ts` reads `VITE_ADMIN_WHATSAPP_NUMBER`, `VITE_DATA_CONTROLLER_NAME`, and `VITE_DATA_CONTROLLER_EMAIL` from `import.meta.env` when called, not at import time, and passes the number through `readAdminWhatsappNumber`. Components call it during render. | (a) Reading the values once in a module constant. (b) Passing them down as props from `App`. | (a) breaks `vi.stubEnv` in tests, which is how the API URL is already tested. (b) threads props through `Directory` to the dialog for values that never change while the page is open. |
| D-5 | The owner link in `BusinessDetailDialog` is a text link below the WhatsApp button or the "no WhatsApp" text, in the dialog's bottom area, with a 44 px touch target, and is not shown when the number is `null`. | A second button next to "Escribir por WhatsApp". | A second button would compete with the main action, and on a 320 px screen it would push the WhatsApp button out of view (directory spec, "A 320 px wide screen"). |
| D-6 | The policy page is a second HTML entry, `frontend/politica-de-datos.html`, with its own small `src/policy/main.tsx` that renders `DataPolicyPage` and imports the same `index.css`. `vite.config.ts` lists both HTML files in `build.rolldownOptions.input`. The policy effective date is a constant next to its strings. | (a) A plain HTML file in `public/`. (b) A router library. (c) The build date as the effective date. | (a) files in `public/` are not processed, so they get no Tailwind classes or tokens, and the page would not be testable with Testing Library. (b) is a new dependency for one static page. (c) a rebuild for another reason must not change when the text started to apply. |
| D-7 | `infra/deploy.sh` reads the three SSM `String` parameters with `aws ssm get-parameter --query Parameter.Value --output text`, right after the environment and `prod` checks and before `sam build`, in a loop over a list of names, so a later change adds a name to the list. A missing or empty value stops the script with the parameter name. The values go only into the environment of the `pnpm --filter frontend build` command. | (a) `SecureString` parameters. (b) An uncommitted `.env.production.local` file. (c) Values in `samconfig.toml`. | (a) the values are public once the site is built, so encrypting them adds nothing. (b) Vite builds both environments in `production` mode, so one file would serve both, and it lives only on one machine. (c) puts personal data in the repository. Reading first means a missing value never leaves an environment half deployed. |
| D-8 | The administrator's process (invitation, checks, evidence, reminders, corrections, removals, company numbers) is in `docs/number-authorization.md`, which points to the spec for every rule and text. | Putting the process only in the spec. | The spec states the rules; the guide is the checklist the administrator follows with WhatsApp open. |

## Risks / Trade-offs

- [The policy and invitation texts are a first version written without a lawyer.] → The owner approves the exact texts in task 3.1 and can have them checked before the `prod` deploy. A wording change is a text-only change.
- [The controller's name and WhatsApp number are public on the policy page.] → The law requires naming the controller in the policy. Domicile is the city only, never a home address. The owner can use a dedicated number for the directory.
- [Exported chats live on the administrator's phone and can be lost.] → The guide says to copy each export to private storage right away, outside the repository.
- [The administrator forgets a removal.] → The guide says to label the chat as pending until the migration is deployed, and the spec sets 15 business days.
- [In local development, `/politica-de-datos` falls back to the directory, since only Pages removes the `.html`.] → In development, use `/politica-de-datos.html`. The README notes it.
- [`finish-mvp-rollout` deploys `prod` with the same script.] → If this change merges first, the three `prod` parameters must exist before that deploy. Task 4.1 documents them in `infra/README.md` next to the secret parameters.

## Migration Plan

1. Create the three `dev` parameters, deploy `dev`, and check the link and the policy on a phone (task 5).
2. Before the first `prod` deploy, create the three `prod` parameters. The `prod` deploy itself belongs to `finish-mvp-rollout`.
3. Rollback: redeploy the previous commit. Nothing is stored in the product, so there is no data to undo. The SSM parameters can stay.

## Open Questions

- The policy effective date (D-6), set when the owner approves the policy text.
