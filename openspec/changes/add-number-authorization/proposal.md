# Proposal: Add WhatsApp number authorization

## Why

Colombian Law 1581 of 2012 lets the directory publish a natural person's WhatsApp number only with that person's authorization, and owners must be able to correct or remove their data. Today there is no rule for getting that authorization, no data policy, no way for an owner to reach the administrator from the product, and no place to keep a number while its owner is asked. The repository is public, so such a number cannot go in a data migration.

## What Changes

- **A rule:** a person's number is published only after they reply "Sí, autorizo" from that number, and the administrator keeps the chat outside the repository.
- **Unauthorized numbers are private.** A business can store a number marked as not authorized. `GET /businesses` returns `null` for it, so visitors never see it.
- **Admin routes for the number:** `GET` and `PUT /businesses/{id}/whatsapp-number`, protected by the admin key. WhatsApp numbers are set only through them, never in a migration.
- **An admin row in the dialog:** in admin mode, "WhatsApp (solo admin)" shows the stored number and its status, and lets the admin save it and mark it as authorized.
- **A "¿Es tu negocio?" link** in the business detail dialog. It opens WhatsApp to the administrator with the business name and id, to ask for a correction or removal.
- **A data policy page** in Spanish at `/politica-de-datos`.
- **A short guide** for the administrator, `docs/number-authorization.md`.

The administrator's WhatsApp number, name, and email are constants in the frontend code. They are public on the site anyway.

## Out of scope

- Owners adding a business on their own (`add-business-request-form`).
- Keeping the authorization evidence in the product. It stays outside the repository.
- Automation: the WhatsApp Business Platform, owner accounts, verification codes.

## Capabilities

### New Capabilities

- `owner-contact`: how a WhatsApp number is authorized, how an owner asks for a correction or removal, and the data policy page.

### Modified Capabilities

- `directory`: "WhatsApp number validity" returns only authorized numbers; "Business detail dialog" shows the admin row; "Deliberate exclusions" narrows the ownership claims row.
- `business-editing`: adds the WhatsApp number routes and the admin row.
- `infrastructure`: "Business data loading" sets WhatsApp numbers only through the admin routes.

## Impact

- **Database:** a new nullable column `whatsapp_authorized_at`, and a data migration that marks the numbers already stored as authorized, so nothing published today disappears.
- **Backend:** the authorization rule in the business service, and two admin routes. Two new route events in `infra/template.yaml`. The Lambda role does not change.
- **Frontend:** the admin row and the owner link in the dialog, one small pure module, and one static HTML page.
- **Docs:** `docs/number-authorization.md`.
- **Dependencies:** none.
- **Legal:** keeping a number before its authorization is also processing personal data. The policy says so, and the owner should have it reviewed by a lawyer.
