# Proposal: Add WhatsApp number authorization

## Why

The directory can only publish a natural person's WhatsApp number with that person's prior, express, and informed authorization (Colombian Law 1581 of 2012), and owners must be able to correct or remove their data. Today there is no data policy to inform them, no rule for how an authorization is obtained and proven, and no way for an owner to reach the administrator from the product. This change sets those foundations before any number from an owner is published (`docs/ideas/business-sourcing.md`).

## What Changes

- A rule for publishing a natural person's number: the administrator sends a fixed invitation message by WhatsApp, the owner replies "Sí, autorizo" **from the number to publish**, and the administrator keeps the exported chat as evidence outside the repository before the data migration. Silence or a reply from another number is not an authorization.
- A data processing policy page in Spanish at `/politica-de-datos`, linked from the invitation message, with the content Colombian law requires of a policy (controller and contact, purpose, owners' rights, and how to exercise them).
- A "¿Es tu negocio?" link in the business detail dialog, for every business, that opens WhatsApp to the administrator with the business name and id prefilled, to ask for a correction or removal.
- The administrator's WhatsApp number and the data controller's name and email reach the frontend at build time, read by the deploy script from per-environment SSM parameters. They are never written in the repository. Without a valid administrator number, the "¿Es tu negocio?" link is not shown.
- A short guide for the administrator, `docs/number-authorization.md`, with the invitation message, how to check and keep the evidence, and how to handle corrections and removals.
- The "Deliberate exclusions" row "Business owner accounts and ownership claims" is narrowed: owners now reach the administrator outside the product, while owner accounts and handling requests inside the product stay excluded.

## Out of scope

- A way for owners to add a business on their own. That is the separate change `add-business-request-form`, which builds on this one.
- Private columns for the data source (`source_type`) or the authorization date (`consented_at`), and any change to the database or the API.
- The rule that stored WhatsApp numbers always carry the 57 country code.
- The WhatsApp Business Platform, webhooks, or automated evidence storage.
- Owner accounts, owner self-editing, and verification codes.
- Analytics or counting of link use.

## Capabilities

### New Capabilities

- `owner-contact`: how a business owner and the directory's administrator reach each other about the owner's data: how a WhatsApp number is authorized and proven, the owner link and its message, the build-time values, and the data processing policy page.

### Modified Capabilities

- `directory`: "Business detail dialog" adds the "¿Es tu negocio?" link; "Interface text" points to the owner-contact spec; "Deliberate exclusions" narrows the ownership claims row.
- `infrastructure`: adds a requirement for the owner contact values (administrator number, controller name and email) as per-environment SSM parameters that the deploy reads and passes to the frontend build.

## Impact

- **Frontend:** a link in `BusinessDetailDialog.tsx`, a pure module that validates the administrator number and builds the owner WhatsApp URL, new strings, a second HTML entry for the policy page, and three new build variables.
- **Infrastructure:** `infra/deploy.sh` reads `/alameda/<env>/admin-whatsapp-number`, `/alameda/<env>/data-controller-name`, and `/alameda/<env>/data-controller-email`, and stops before changing anything when one is missing. The parameters are created by hand once per environment and documented in `infra/README.md`. No change to the template or the Lambda role.
- **Docs:** `docs/number-authorization.md`.
- **Backend, API, and database:** no change.
- **Dependencies:** none.
- **Legal:** the policy and the invitation texts are a first version written by the team. The project owner should have them reviewed by a lawyer before relying on them.
