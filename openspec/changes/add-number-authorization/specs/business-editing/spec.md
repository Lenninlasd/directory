# Spec Delta

## ADDED Requirements

### Requirement: WhatsApp number routes
`GET /businesses/{id}/whatsapp-number` SHALL return `{ "whatsappNumber": "<digits>" | null, "authorized": boolean }`. `PUT /businesses/{id}/whatsapp-number` SHALL take the same shape, store the number as digits only, and record the time of the authorization when `authorized` is `true`. Both are editing routes under "Admin key" and "Editing an inactive or unknown business".

#### Scenario: Reading a number
- **WHEN** an authorized client reads the number of a business that stores `573001234567` without authorization
- **THEN** the response is `200` with `{ "whatsappNumber": "573001234567", "authorized": false }`

#### Scenario: Saving an unauthorized number
- **WHEN** an authorized client sends `{ "whatsappNumber": "+57 300 123 4567", "authorized": false }`
- **THEN** the business stores `573001234567` without authorization, and `GET /businesses` still returns `"whatsappNumber": null` for it

#### Scenario: Marking a number as authorized
- **WHEN** an authorized client sends `{ "whatsappNumber": "573001234567", "authorized": true }`
- **THEN** the authorization time is recorded, and the next `GET /businesses` returns `"whatsappNumber": "573001234567"`

#### Scenario: Removing a number
- **WHEN** an authorized client sends `{ "whatsappNumber": null, "authorized": false }`
- **THEN** the business stores no number and no authorization time

#### Scenario: An invalid request
- **WHEN** the number is not valid under "WhatsApp number validity" in the directory spec, `authorized` is not a boolean, or `authorized` is `true` without a number
- **THEN** the response is `400` with `{ "error": "invalid_whatsapp_number" }`, and nothing is written

### Requirement: WhatsApp number in admin mode
In admin mode, the detail dialog SHALL show a row "WhatsApp (solo admin)" with a "Ver número" button. Once the admin key is accepted, the row SHALL show the stored number, or "Sin número", with "Autorizado" or "Sin autorizar", and an "Editar" button that opens a field "Número de WhatsApp", a checkbox "El dueño autorizó publicarlo", and "Guardar".

#### Scenario: Seeing an unauthorized number
- **WHEN** the admin activates "Ver número" for a business that stores a number without authorization
- **THEN** the key is asked as in "Admin mode" if none is kept for the tab, and the row shows the number with "Sin autorizar"

#### Scenario: Saving
- **WHEN** the admin saves a number with "El dueño autorizó publicarlo" checked
- **THEN** "Guardando…" is shown while it is sent, then "Número actualizado", the list is loaded again, and the business shows its public WhatsApp button

#### Scenario: An invalid number
- **WHEN** the API answers `400`
- **THEN** the row shows "Número no válido" and keeps what the admin typed

#### Scenario: A visitor
- **WHEN** the directory is opened without the `admin` query parameter
- **THEN** no number that is not authorized appears anywhere, and no request reads one

#### Scenario: Interface text
- **WHEN** the row shows a text from this table
- **THEN** it is exactly the text of that row

| Where | Text |
|---|---|
| Row label | "WhatsApp (solo admin)" |
| Show button | "Ver número" |
| No number | "Sin número" |
| Status | "Autorizado" / "Sin autorizar" |
| Edit button | "Editar" |
| Field label | "Número de WhatsApp" |
| Checkbox | "El dueño autorizó publicarlo" |
| Save, saving, saved | "Guardar" / "Guardando…" / "Número actualizado" |
| Invalid number | "Número no válido" |
| Other failure | "No pudimos guardar el número. Inténtalo de nuevo." |
