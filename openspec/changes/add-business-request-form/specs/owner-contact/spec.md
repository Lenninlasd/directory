# Spec Delta

## ADDED Requirements

### Requirement: Add business form address
The frontend SHALL receive the add business form address at build time, and SHALL use it only when it starts with `https://docs.google.com/forms/` or `https://forms.gle/`. While the address is not valid, the floating button SHALL NOT be shown, and the rest of the directory SHALL work as usual.

#### Scenario: A valid address
- **WHEN** the frontend is built with the form address `https://forms.gle/AbC123`
- **THEN** the floating button opens `https://forms.gle/AbC123`

#### Scenario: No address or another site
- **WHEN** the frontend is built without a form address, or with one that is not a Google Forms address, such as `http://forms.gle/AbC123` or `https://forms.gle.example.com/AbC123`
- **THEN** the floating button is not shown, and the rest of the directory works as usual

#### Scenario: Not in the repository
- **WHEN** the repository is inspected
- **THEN** it contains no form address, outside tests that use made-up ones

### Requirement: Add a business button
While the form address is valid, the directory screen SHALL show a floating button "¿Tienes un negocio en Alameda del Río?" fixed at the bottom of the screen, in every state: loading, failed, empty, and loaded. Activating it SHALL open the add business form in a new tab, and the directory SHALL stay open where the user left it.

#### Scenario: Opening the form
- **WHEN** the user activates "¿Tienes un negocio en Alameda del Río?"
- **THEN** the add business form opens in a new tab
- **AND** the directory stays open where the user left it

#### Scenario: Every state
- **WHEN** the list is loading, has failed, is empty, or is loaded
- **THEN** the floating button is shown at the bottom of the screen

#### Scenario: The end of the content
- **WHEN** the user scrolls to the end of the page
- **THEN** the last content of the page is fully visible above the floating button

#### Scenario: While the dialog is open
- **WHEN** the business detail dialog is open
- **THEN** the floating button is behind the dialog and cannot be reached with the keyboard or activated

#### Scenario: A 320 px wide screen
- **WHEN** the screen is 320 px wide
- **THEN** the floating button fits the screen without overflowing, and its text may take two lines

#### Scenario: Accessibility
- **WHEN** a person uses the floating button with assistive technology, the keyboard, or touch
- **THEN** its accessible name equals its visible text, it can be reached and activated with the keyboard, its touch target is at least 44 by 44 px, and its text meets the AA contrast ratio

### Requirement: Add a business form
The add business form SHALL be a Google Form set up by hand with the fields, texts, and settings of the first scenario. It SHALL require the authorization checkbox and SHALL not ask for anything else. Its confirmation screen SHALL link a WhatsApp conversation with the administrator and the confirmation message prefilled.

#### Scenario: Form content
- **WHEN** a person opens the add business form
- **THEN** it has exactly these elements, in this order, all required, where `{politica}` is the address of the policy page of the environment's site

| Element | Type | Text |
|---|---|---|
| Title | | "Agrega tu negocio al directorio de Alameda del Río" |
| Description | | "Es gratis. Revisamos cada solicitud antes de publicarla." |
| Field | Short answer | "Nombre del negocio" |
| Field | Drop-down | "Categoría", with the 15 supported categories of "Category visual identity" in the directory spec, in that order, and "Otra" |
| Field | Short answer | "Ubicación", with the help text "Por ejemplo: CC Alameda, local 12. No pongas la dirección de tu casa." |
| Field | Multiple choice | "¿Tiene local físico?", with "Sí" and "No" |
| Field | Short answer, validated by the regular expression `^3[0-9]{9}$` | "Número de WhatsApp del negocio", with the help text "10 dígitos, sin espacios. Ej.: 3001234567", and the validation error "Escribe 10 dígitos que empiecen por 3" |
| Field | Checkbox | "Autorizo publicar en el directorio de Alameda del Río, que es público en internet, el nombre, la categoría, la ubicación, si tiene local físico y este número de WhatsApp. Sé que esta solicitud se guarda en Google Forms. Política de datos: {politica}" |

#### Scenario: Form settings
- **WHEN** the form settings are inspected
- **THEN** it does not collect email addresses, does not require signing in, does not let respondents see other responses, and saves its responses only in a sheet that only the administrator can open

#### Scenario: Confirmation screen
- **WHEN** a person sends the form
- **THEN** the confirmation screen shows "¡Gracias! Último paso: escríbenos por WhatsApp desde el número que registraste, para confirmar que es tuyo: {enlace}. Si no recibimos ese mensaje, no podemos publicar tu negocio."
- **AND** `{enlace}` is a `wa.me` link to the administrator's number with the prefilled text "Confirmo mi registro en el directorio de Alameda del Río"

### Requirement: Form authorization
A form response with the authorization checked, followed by a confirmation message from the same WhatsApp number, SHALL be a way to authorize that number under "Number authorization". The administrator SHALL keep the response and the exported chat as evidence outside the repository before the data migration. A response without that confirmation SHALL NOT be published.

#### Scenario: A confirmed request
- **WHEN** a form response with the number `3001234567` is followed by the confirmation message from `+57 300 123 4567`
- **THEN** the administrator keeps the response and the chat outside the repository, and may load the business with the number `573001234567` through a reviewed data migration

#### Scenario: No confirmation
- **WHEN** no confirmation message arrives from the number of a response within 7 days
- **THEN** the business is not published, the administrator does not write to that number, and the response is deleted from the sheet

#### Scenario: A message from another number
- **WHEN** a confirmation message arrives from a number that is not in any response
- **THEN** no business is published from it

### Requirement: Form processor disclosure
The data policy page SHALL show, right after the "Para qué los usamos" text, the heading "Quién más los trata" and the text "Las solicitudes para agregar un negocio se reciben con Google Forms, un servicio de Google que guarda los datos en servidores fuera de Colombia. Solo el administrador puede ver esas respuestas."

#### Scenario: Policy section
- **WHEN** a person opens `/politica-de-datos`
- **THEN** the heading "Quién más los trata", as a second-level heading, and its text appear between "Para qué los usamos" and "Tus derechos", with the exact wording of this requirement
