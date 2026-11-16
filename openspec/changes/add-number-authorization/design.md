# Design: Add WhatsApp number authorization

## Context

See `proposal.md` for the motivation and the spec deltas for the behavior. The frontend has one Vite entry and no router, the WhatsApp links are built in `features/businesses/whatsapp.ts`, and business rows change only through reviewed data migrations.

## Decisions

| # | Decision | Alternatives discarded | Why |
|---|---|---|---|
| D-1 | The authorization is a written reply from the number to publish, and the evidence is the exported chat, kept outside the repository. | An oral authorization, a signed paper, a form. | One message both authorizes and proves control of the number (Decree 1377 of 2013, arts. 7 and 8). The form is `add-business-request-form`. |
| D-2 | The administrator's number is a constant in `src/features/ownerContact/ownerContact.ts`, next to `buildBusinessOwnerUrl(business)`. The name and email are written in the policy page. | Build variables read from SSM by the deploy script. | The values are public on the site and the same in `dev` and `prod`. Constants need no deploy change, no parameters, and no "missing value" behavior. |
| D-3 | The policy page is a static file, `frontend/politica-de-datos.html`, with Tailwind classes and a link to `src/index.css`, listed with `index.html` in `build.rolldownOptions.input`. No React. | (a) A file in `public/`. (b) A React page. (c) A router library. | (a) gets no Tailwind classes. (b) and (c) add code for a page with no behavior. Cloudflare Pages serves it at `/politica-de-datos` ([Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/), checked 2026-11-15). The multi-page option is from [Vite 8, Multi-Page App](https://vite.dev/guide/build), checked 2026-11-15. |
| D-4 | The owner link is a text link below the WhatsApp button. | A second button. | A second button would compete with the main action and push it out of view at 320 px. |

## Risks / Trade-offs

- [The owner's name, number, and email are in the repository.] → They are public on the policy page anyway. The owner can use a dedicated number and email for the directory.
- [The policy text has not been reviewed by a lawyer.] → The owner approves the exact text in task 1.2 and can have it checked before `prod`.
- [In local development only `/politica-de-datos.html` works.] → Only Cloudflare Pages removes the `.html`. The guide notes it.
