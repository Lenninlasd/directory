# Design: Add a business request form

## Context

See `proposal.md` for the motivation and the spec delta for the behavior. This change starts from what `add-number-authorization` leaves: the `ownerContact.ts` module with the administrator's number, and the static policy page.

## Decisions

| # | Decision | Alternatives discarded | Why |
|---|---|---|---|
| D-1 | Requests go through a Google Form, confirmed by a WhatsApp message from the registered number. | (a) A prefilled WhatsApp message with empty fields. (b) A form built into the product. | (a) gives free text to transcribe, and the owner can delete the authorization line. (b) needs an endpoint, storage, and spam protection before knowing whether owners use it. |
| D-2 | A response and its confirmation are matched by the number: the response's 10 digits with `57` in front equal the sender of the message. | A unique code per response. | The confirmation screen of a Google Form is static, so it cannot show a code. The number is already unique and is what the message must prove. |
| D-3 | One form for both environments, with its address as a constant in `ownerContact.ts`. | A form and a build variable per environment. | The address is public. A test response from `dev` is deleted by hand. |
| D-4 | `AddBusinessButton` is a link styled as a pill, rendered by `Directory` after `<main>`, `fixed` at the bottom, below the header's `z-index`. `<main>` gets bottom padding so the last tile clears it. | A static footer, or hiding the button on scroll. | The owner chose a floating button. The native modal dialog already makes the page behind it inert, so no code is needed for that case. |

The number field uses Google Forms' regular expression validation, `^3[0-9]{9}$` ([Set rules for your form](https://support.google.com/docs/answer/3378864), checked 2026-11-16).

## Risks / Trade-offs

- [The link in the confirmation screen may not be clickable.] → Task 1.1 checks it in the real form. If it is not, the link also goes in the form's last section, and the spec is updated in this change.
- [Someone sends the form with another person's number.] → Nothing is published without the confirmation from that number.
- [The form is edited by hand and drifts from the spec.] → Task 2.1 compares the real form with the spec.
- [Google keeps the responses outside Colombia.] → The policy and the checkbox say so, and the owner asks a lawyer whether that is enough.
