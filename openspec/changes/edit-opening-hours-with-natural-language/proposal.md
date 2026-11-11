# Proposal: Edit opening hours with natural language

## Why

Opening hours change often (holidays, a new Saturday schedule), and today every change needs a SQL data migration and a pull request. The owner wants to correct hours from the directory itself, without a classic form: they type the change in Spanish ("el sábado cerramos a las 2") and the system turns it into the stored format. It is also the first AI feature of the project, built as a single structured-output call inside a fixed workflow rather than as an agent.

## What Changes

- **Admin mode:** opening the directory with `?admin` shows an "Editar horario" button in the detail dialog. Visitors never see it. The admin key is asked for the first time it is needed and kept in `sessionStorage` until the tab closes. There are no accounts and no login.
- **Edit flow in the dialog:** a text box for the request, a loading state, then either a preview of the new week with the changed days marked and "Guardar" / "Cancelar" buttons, or a short message when the request was not understood. Saving shows a confirmation and reloads the list.
- **API, two new routes, both requiring the admin key:**
  - `POST /businesses/{id}/opening-hours/interpretation`: sends the stored hours and the request to Claude Haiku 5.5 and returns the proposed full week. It never writes.
  - `PUT /businesses/{id}/opening-hours`: validates a full week with the domain rules and stores it. It never calls the model.
- **Domain:** a strict validator for hours to be written, which reports why a week is invalid. The existing read validator, which returns `[]`, does not change.
- **Secrets:** the admin key and the Anthropic API key are stored per environment as SSM Parameter Store `SecureString` parameters, created by hand and read by the Lambda at run time. The Lambda role gets `ssm:GetParameter` on those two parameters only, and `kms:Decrypt` only through SSM for those two parameters.
- **Eval:** about 20 Spanish requests with their expected weeks, and a script run by hand that reports accuracy and cost. It calls the real API and never runs in CI.
- **Deliberate exclusions:** the directory row "Managing businesses or categories through the product" is narrowed: opening hours can now be managed in admin mode. Everything else in that row stays excluded.

Visitors see no change, and `GET /businesses` does not change.

## Out of scope

- Editing any other field (name, category, WhatsApp, website, location) or creating and deactivating businesses.
- Owner accounts, per-business edit links, roles, or more than one admin key.
- A conversation with the model: each request is one call, with no memory of earlier requests.
- An agent loop, tool calling, streaming, or a fallback to another model.
- Holiday or date-specific hours, and ranges that cross midnight (the "Opening hours validity" rules stay as they are).
- Rate limiting, a WAF, or cost alarms. Requests without the key are rejected before any model call, so they cost nothing.
- Running the eval in CI, and a classic form as a fallback.
- An audit history of hours changes beyond the CloudWatch logs.

## Capabilities

### New Capabilities

- `business-editing`: changing business data from the product in admin mode: the admin key, the two hours routes, the strict hours validation for writes, the interpretation with the model, the edit flow in the dialog, and its interface text.

### Modified Capabilities

- `directory`:
  - MODIFIED "Business detail dialog": in admin mode it also shows the editing controls.
  - MODIFIED "Detail dialog hours and website rows": in admin mode the "Horario" row is shown even when the business has no hours.
  - MODIFIED "Interface text": admin mode text is defined in the business-editing spec.
  - MODIFIED "Deliberate exclusions": the managing row is narrowed as described above, and the login row notes that the admin key is not an account.
- `infrastructure`:
  - MODIFIED "Infrastructure as code": secret values are the one thing a person stores by hand, with a documented command.
  - MODIFIED "Backend deployment": the API also exposes the two hours routes.
  - MODIFIED "Least privilege and secrets": the Lambda role may also read and decrypt this environment's two SSM parameters, and both secrets live there.
  - MODIFIED "Business data loading": opening hours may also be changed through the admin routes, so data migrations are no longer the only way to change them.

## Impact

- `backend/src/`: a strict hours validator in `domain/`, an admin key check, an interpretation module that receives a `callModel` function, a repository update, two services, and two routes in `app.ts`. `handlers/lambda.ts` wires the SSM and Anthropic clients.
- `backend/scripts/` and a golden set file: the eval.
- `frontend/src/`: an admin mode module, API functions and mutation hooks for the two routes, a week diff for the preview, an edit panel in `BusinessDetailDialog.tsx`, and new texts in `strings.ts`.
- `infra/template.yaml`: two routes, CORS for `POST`, `PUT`, and the `Authorization` and `Content-Type` headers, two environment variables with parameter names, and the `ssm:GetParameter` and conditional `kms:Decrypt` permissions. The 10-second Lambda timeout stays.
- Deployment documentation: the manual step that creates the two `SecureString` parameters per environment.
- **New packages, which need the owner's approval:** `@anthropic-ai/sdk` and `@aws-sdk/client-ssm` in `backend`, recorded in `docs/dependencies.md`.
- A paid service: Anthropic API usage, estimated below one dollar a month at the expected volume.
- Tests for each of the above, with the model and AWS clients replaced by fakes.
