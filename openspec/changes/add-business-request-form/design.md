# Design: Add a business request form

## Context

See `proposal.md` for the motivation, and the three spec deltas for the required behavior (`owner-contact`, `directory`, `infrastructure`). This change starts from the state `add-number-authorization` leaves:

- **Owner contact module.** `src/features/ownerContact/ownerContact.ts` has `readAdminWhatsappNumber` and `buildBusinessOwnerUrl`, and `config.ts` reads the build values when called. The policy page is a second Vite entry rendered by `DataPolicyPage`.
- **Deploy.** `infra/deploy.sh` reads a list of SSM parameter names before `sam build` and passes their values to the frontend build.
- **Frontend.** The header is `sticky` with `z-30`. The detail dialog is a native `<dialog>` opened with `showModal()`, so the browser puts it in the top layer and makes the rest of the page inert. Tests set build values with `vi.stubEnv`.
- **Google Forms.** A short answer can be validated with a regular expression ("Matches") and a custom error text, and the confirmation message is edited under Settings → Presentation ([Google Docs Editors Help, "Set rules for your form"](https://support.google.com/docs/answer/3378864), checked 2026-11-16). The help pages do not say whether a URL in the confirmation message becomes a clickable link; task 4.2 checks it in the real form.

## Goals / Non-Goals

**Goals:**

- No backend: the product only links to the form, and the form lives in Google.
- The new code only extends the module, the config reader, the policy page, and the deploy list of `add-number-authorization`.

**Non-Goals:**

- No reading of form responses from the product or the backend, and no Google API credentials.
- No storage or tracking of button activations.

## Decisions

| # | Decision | Alternatives discarded | Why |
|---|---|---|---|
| D-1 | New business requests go through an external Google Form, confirmed by a WhatsApp message from the registered number. | (a) A `wa.me` link with a prefilled message holding the authorization and empty fields. (b) A form built into the product with a backend endpoint. | (a) gives free text the administrator transcribes, and the owner can edit or delete the authorization line. The owner chose the form for its structured data, required checkbox, and validated fields. (b) needs an endpoint, storage, spam protection, and a larger change, before knowing whether owners use it. |
| D-2 | The response and the confirmation are matched by the phone number itself: the response's 10 digits with `57` in front must equal the sender of the confirmation message. The confirmation text is the same for everyone. | A unique code per response shown on the confirmation screen. | A Google Form's confirmation screen is static, so it cannot show a code without Apps Script. The number is already a unique key, and it is exactly what the confirmation must prove. |
| D-3 | The form asks for the number as 10 local digits, `^3[0-9]{9}$`, and the administrator adds `57` in the data migration. | Asking for the number with the country code. | Owners in Colombia rarely type `57`, and a wrong prefix is the error the regex can catch. The rule excludes landlines and foreign numbers, which WhatsApp businesses in the area do not use. |
| D-4 | One form per environment. The `dev` form is a copy whose checkbox links the `dev` policy, used only for checks. | One form for both. | A test response never mixes with real requests, and each form links its own site's policy. |
| D-5 | `readAddBusinessFormUrl(value)` in `ownerContact.ts` parses the value with `URL` and returns it only when the protocol is `https:` and the host is `forms.gle`, or the host is `docs.google.com` and the path starts with `/forms/`. `config.ts` adds `addBusinessFormUrl`, read from `VITE_ADD_BUSINESS_FORM_URL`. | (a) Accepting any `https` address. (b) A plain string prefix check. | (a) a mistyped parameter could send owners to any site. (b) parsing the host rejects look-alikes such as `forms.gle.example.com` without a fragile pattern. |
| D-6 | `AddBusinessButton` is an `<a>` styled as a pill button, rendered by `Directory` after `<main>` and outside the state branches, `fixed` at the bottom center with `min-h-11`, a maximum width that fits 320 px, and a `z-index` below the header's. `<main>` gets enough bottom padding for the last content to clear the button. It opens the form in a new tab. | (a) A static footer. (b) Hiding the button while scrolling down. (c) A `<button>` that calls `window.open`. | (a) the owner chose a floating button. (b) more code with no shown need. (c) a link is the right element for navigation: the browser shows the address, and opening it in a new tab works without script. The native modal dialog already covers and disables the button, so no extra code is needed while it is open. |
| D-7 | The "Quién más los trata" section is one more heading and text in `DataPolicyPage`, between "Para qué los usamos" and "Tus derechos", with its strings in `strings.ts`. | A separate page about Google Forms. | It is one paragraph of the same policy, and the law asks for the processors to be named in the policy itself. |
| D-8 | `infra/deploy.sh` adds `add-business-form-url` to the list of parameter names, mapped to `VITE_ADD_BUSINESS_FORM_URL`. | A separate read step. | The list already stops on a missing value before anything changes. |
| D-9 | The form is set up by hand from a checklist in `docs/add-business-form.md`, which points to the spec for every text and lists each setting. The administrator's process for each response is in the same file, and links `docs/number-authorization.md` for evidence and removals. | Creating the form with the Google Forms API or Apps Script. | One form per environment, created once, does not justify credentials and code. The checklist is reviewed in the PR like the rest of the change. |

## Risks / Trade-offs

- [A URL in the form's confirmation message may not be clickable.] → Task 4.2 checks it. If it is not, the same `wa.me` link and text also go in the description of the form's last section, and the spec's confirmation scenario is updated in this change.
- [Someone sends the form with another person's number.] → Nothing is published without the confirmation from that number (owner-contact spec, "Form authorization").
- [An owner sends the form but never the confirmation.] → The response is deleted after 7 days and nobody writes to that number. The confirmation screen says the business cannot be published without it.
- [The form is edited by hand and drifts from the spec.] → Task 5.1 compares the real form with the spec. Any later change to the form's texts goes through a change, like any interface text.
- [Google keeps the responses outside Colombia, and a free personal account has less clear data processing terms than Google Workspace.] → The policy and the checkbox say so. The owner asks the lawyer whether that is enough or whether a Workspace account is needed.
- [The floating button covers content on short screens.] → `<main>` has bottom padding, and the button is one line on wide screens and at most two at 320 px.
- [If the form is recreated, its address changes.] → Update the SSM parameter and redeploy. The README says so.
- [This change is applied before `add-number-authorization` is archived.] → The proposal states the order, and task 1.1 starts by checking that `openspec/specs/owner-contact/spec.md` exists.

## Migration Plan

1. Create the `dev` form and the `dev` form parameter, deploy `dev`, and check the whole flow on a phone (task 5).
2. Before the first `prod` deploy that includes this change, create the `prod` form and its parameter.
3. Rollback: redeploy the previous commit. Nothing is stored in the product. The forms and the parameter can stay.
