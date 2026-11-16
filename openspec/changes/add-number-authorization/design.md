# Design: Add WhatsApp number authorization

## Context

See `proposal.md` for the motivation and the spec deltas for the behavior. What shapes the approach:

- **Repository.** It is public on GitHub, and business rows enter through data migrations committed to it. A number that is not authorized cannot follow that path.
- **Backend.** `GET /businesses` reads every active business in `businessRepository.ts`. The opening hours routes already show how an admin route works: `requireAdminKey`, a 4 KB JSON body, a UUID check, and an `UPDATE ... WHERE is_active = true RETURNING id`. The HTTP API already allows `GET` and `PUT` with the `authorization` header in CORS.
- **Frontend.** Admin mode keeps the key per tab and asks for it with `AdminKeyDialog`. Server state goes through TanStack Query, with query keys as constants.
- **Seed.** `backend/seeds/dev_businesses.sql` runs after the migrations in `dev` only.

## Decisions

| # | Decision | Alternatives discarded | Why |
|---|---|---|---|
| D-1 | The authorization is a written reply from the number to publish, and the evidence is the exported chat, kept outside the repository. | An oral authorization, a signed paper, a form. | One message both authorizes and proves control of the number (Decree 1377 of 2013, arts. 7 and 8). The form is `add-business-request-form`. |
| D-2 | Migration `003_add_whatsapp_authorized_at.sql` adds `whatsapp_authorized_at TIMESTAMPTZ NULL`. Migration `004_authorize_existing_whatsapp_numbers.sql` sets it to `now()` where `whatsapp_number IS NOT NULL`. One statement per file. | (a) A boolean column. (b) No backfill. | (a) the time is the useful fact to match with the evidence. (b) would hide every number published today. The numbers already stored came through reviewed migrations as public business contact information. |
| D-3 | The rule lives in a pure domain function, `publicWhatsappNumber(storedNumber, authorizedAt)`, called by the business service: it returns the normalized number only when `authorizedAt` is not `null`. The repository reads both columns. | Filtering in SQL. | The rule is tested without a database, like the other domain rules, and `GET /businesses` keeps one place that decides what is public. |
| D-4 | `GET` and `PUT /businesses/{id}/whatsapp-number` follow the opening hours routes: `requireAdminKey` first, a 4 KB JSON body for `PUT`, the UUID check, and `404` for an inactive or unknown business. `PUT` writes `whatsapp_number = :number, whatsapp_authorized_at = CASE WHEN :authorized THEN now() ELSE NULL END`. | (a) Keeping the first authorization time when the number is saved again. (b) A separate route to mark the authorization. | (a) a new number needs a new authorization, so the time must move with every save that says `authorized: true`. (b) one route with the full state is simpler and idempotent. |
| D-5 | In the frontend, `api/whatsappNumber.ts` has `fetchWhatsappNumber` and `saveWhatsappNumber`, wrapped by `useAdminWhatsappNumber(id)` (a query enabled only after "Ver número") and a mutation that invalidates that query and the businesses query on success. | Loading the number when the dialog opens. | The dialog does not ask for the key until the admin acts, as with "Editar con IA". A visitor never sends the request. |
| D-6 | The seed gives most sample businesses an authorization time and leaves one valid number without it. | Leaving the seed unchanged. | The seed runs after migration 004, so without a change every sample number would disappear in `dev`. The unauthorized row shows the new case. |
| D-7 | The administrator's number is a constant in `src/features/ownerContact/ownerContact.ts`, next to `buildBusinessOwnerUrl(business)`. The name and email are written in the policy page. | Build variables read from SSM. | The values are public on the site and the same in `dev` and `prod`, so constants need no deploy change. |
| D-8 | The policy page is a static file, `frontend/politica-de-datos.html`, with Tailwind classes and a link to `src/index.css`, listed with `index.html` in `build.rolldownOptions.input`. | A file in `public/`, a React page, a router. | `public/` gets no Tailwind classes, and a page with no behavior needs no React. Cloudflare Pages serves it at `/politica-de-datos` ([Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/), checked 2026-11-15). Multi-page builds: [Vite 8](https://vite.dev/guide/build), checked 2026-11-15. |
| D-9 | The owner link is a text link below the WhatsApp button, and the admin row goes after the "Página web" row. | Second buttons. | A second button would compete with the main action and push it out of view at 320 px. |

## Risks / Trade-offs

- [A number is set by mistake as authorized.] → It is published on the next load. The admin unchecks the box and saves, and the number is hidden again.
- [Stored unauthorized numbers are still personal data.] → They are readable only with the admin key, the policy says they are kept only to ask for the authorization, and a refusal removes them.
- [The owner's name, number, and email are in the repository.] → They are public on the policy page anyway. The owner can use a dedicated number and email for the directory.
- [The policy text has not been reviewed by a lawyer.] → The owner approves the exact text and can have it checked before `prod`.

## Migration Plan

1. Deploy runs migrations 003 and 004 after the stack update. The previous Lambda ignores the new column, and the new one reads it, so both work during the deploy.
2. Rollback: redeploy the previous commit. The column stays and is ignored.
