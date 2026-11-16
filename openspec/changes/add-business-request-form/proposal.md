# Proposal: Add a business request form

## Why

With `add-number-authorization`, the administrator can publish a number after inviting its owner, but owners cannot ask to join on their own. This change adds the smallest way for them to do it: a floating button that opens an external Google Form, confirmed by a WhatsApp message from the registered number. The form gives the administrator structured, validated data and a required authorization, and lets the team see whether owners respond before building its own form, an API integration, or owner accounts (`docs/ideas/business-sourcing.md`).

**Depends on:** `add-number-authorization`, which adds the `owner-contact` spec, the data policy page, the build values reader, and the deploy step this change extends. Apply this change after that one is archived.

## What Changes

- A floating button "¿Tienes un negocio en Alameda del Río?", shown at the bottom of the screen in every state, that opens the add business form in a new tab.
- The form, a Google Form set up by hand outside the repository, asks for the business data and the WhatsApp number to publish, with a required authorization checkbox that links the data policy. Its confirmation screen asks the owner to send a fixed WhatsApp message to the administrator **from the number they registered**. That message proves the owner controls the number; without it, nothing is published.
- A second way to authorize a number in the owner-contact spec: a form response with the checkbox, plus the confirmation from the same number.
- A new section of the data policy page, "Quién más los trata", saying that requests are received with Google Forms, which keeps the data outside Colombia.
- The form address reaches the frontend at build time from a fourth SSM parameter per environment. It is never written in the repository. Without a valid Google Forms address, the floating button is not shown.
- Google Forms is added to the register of approved services in `docs/dependencies.md`, after the owner's approval.
- A checklist, `docs/add-business-form.md`, to set up the form of each environment and to process each response.

## Out of scope

- A form built into the product, a backend endpoint, or reading the form responses from the backend.
- Private columns for the data source or the authorization date, and any change to the database or the API.
- The WhatsApp Business Platform, webhooks, or automated matching and evidence storage.
- Owner accounts, owner self-editing, and verification codes.
- Analytics or counting of button use. The administrator counts form responses by hand.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owner-contact`: adds the form address value, the floating button, the form, the form way to authorize a number, and the "Quién más los trata" section of the policy page. All are added requirements; no existing requirement changes.
- `directory`: "Screen layout" adds the floating button.
- `infrastructure`: adds a requirement for the form address as a per-environment SSM parameter that the deploy reads and passes to the frontend build.

## Impact

- **Frontend:** a floating button component, a form address validator in the owner contact module, the address in the build values reader, the policy section, new strings, and one new build variable.
- **Infrastructure:** `infra/deploy.sh` also reads `/alameda/<env>/add-business-form-url`. Documented in `infra/README.md`. No change to the template or the Lambda role.
- **External service:** a Google Form and its response sheet per environment, in a Google account the owner controls.
- **Docs:** `docs/add-business-form.md` and `docs/dependencies.md`.
- **Backend, API, and database:** no change.
- **Dependencies:** no package. One new service, Google Forms.
- **Legal:** Google keeps the form responses outside Colombia. The project owner should have that reviewed by a lawyer before relying on it.
