# Proposal: Add WhatsApp number authorization

## Why

Colombian Law 1581 of 2012 lets the directory publish a natural person's WhatsApp number only with that person's authorization, and owners must be able to correct or remove their data. Today there is no rule for getting that authorization, no data policy, and no way for an owner to reach the administrator from the product.

## What Changes

- **A rule:** a person's number is published only after they reply "Sí, autorizo" from that number, and the administrator keeps the chat outside the repository.
- **A "¿Es tu negocio?" link** in the business detail dialog. It opens WhatsApp to the administrator with the business name and id, to ask for a correction or removal.
- **A data policy page** in Spanish at `/politica-de-datos`.
- **A short guide** for the administrator, `docs/number-authorization.md`.

The administrator's WhatsApp number, name, and email are constants in the frontend code. They are public on the site anyway, so no build variable or deploy change is needed.

## Out of scope

- Owners adding a business on their own (`add-business-request-form`).
- Any change to the backend, the API, the database, or the deploy.
- Automation: the WhatsApp Business Platform, owner accounts, verification codes.

## Capabilities

### New Capabilities

- `owner-contact`: how a WhatsApp number is authorized, how an owner asks for a correction or removal, and the data policy page.

### Modified Capabilities

- `directory`: "Deliberate exclusions" narrows the ownership claims row, since owners can now reach the administrator by WhatsApp.

## Impact

- **Frontend:** one link in the dialog, one small pure module, and one static HTML page.
- **Docs:** `docs/number-authorization.md`.
- **Dependencies:** none.
- **Legal:** the policy text is a first version. The owner should have it reviewed by a lawyer.
