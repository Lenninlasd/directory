# Proposal: Add a business request form

## Why

With `add-number-authorization`, the administrator can publish a number after inviting its owner, but owners cannot ask to join on their own. A Google Form gives them a way to do it, with structured data and a required authorization, without building a backend.

**Depends on:** `add-number-authorization`. Apply this change after that one is archived.

## What Changes

- **A floating button** "¿Tienes un negocio en Alameda del Río?" at the bottom of the directory screen. It opens a Google Form in a new tab.
- **The form**, created by hand in Google Forms: the business data, the WhatsApp number, and a required authorization checkbox. After sending it, the owner confirms with a WhatsApp message **from the number they registered**. Without that message, nothing is published.
- **One paragraph in the data policy** saying that requests are received with Google Forms.
- **Google Forms** is registered as an approved service in `docs/dependencies.md`.
- **A checklist**, `docs/add-business-form.md`, to create the form and process each response.

## Out of scope

- A form built into the product, or reading the responses from the backend.
- Any change to the backend, the API, the database, or the deploy.
- Automated matching of responses and confirmations.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owner-contact`: adds the floating button, the form, the form as a way to authorize a number, and the policy paragraph.

## Impact

- **Frontend:** one floating button and one paragraph in the policy page.
- **External service:** one Google Form in a Google account the owner controls.
- **Docs:** `docs/add-business-form.md` and `docs/dependencies.md`.
- **Legal:** Google keeps the responses outside Colombia. The owner should have that reviewed by a lawyer.
