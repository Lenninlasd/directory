# Spec Delta

## ADDED Requirements

### Requirement: Add a business button
The directory screen SHALL show a floating button "¿Tienes un negocio en Alameda del Río?" fixed at the bottom of the screen, in every state: loading, failed, empty, and loaded. Activating it SHALL open the add business form in a new tab.

#### Scenario: Opening the form
- **WHEN** the user activates "¿Tienes un negocio en Alameda del Río?" in any state of the screen
- **THEN** the add business form opens in a new tab, and the directory stays open where the user left it

#### Scenario: Not in the way
- **WHEN** the user scrolls to the end of the page, or opens a business dialog
- **THEN** the last content is fully visible above the button, and the button cannot be reached while the dialog is open

#### Scenario: Small screens and accessibility
- **WHEN** the button is shown on a 320 px wide screen, or used with the keyboard, assistive technology, or touch
- **THEN** it fits the screen, it can be reached and activated, its accessible name equals its text, and its touch target is at least 44 px high

### Requirement: Add a business form
The add business form SHALL be a Google Form with exactly the elements of the first scenario, all required. It SHALL NOT collect email addresses or require signing in, and only the administrator SHALL see its responses. After sending it, the owner SHALL be asked to confirm by WhatsApp from the registered number.

#### Scenario: Form content
- **WHEN** a person opens the form
- **THEN** it has these elements in this order, where `{politica}` is the address of the policy page

| Element | Text |
|---|---|
| Title | "Agrega tu negocio al directorio de Alameda del Río" |
| Description | "Es gratis. Revisamos cada solicitud antes de publicarla." |
| Short answer | "Nombre del negocio" |
| Drop-down | "Categoría", with the supported categories of the directory spec and "Otra" |
| Short answer | "Ubicación", with the help text "Por ejemplo: CC Alameda, local 12. No pongas la dirección de tu casa." |
| Multiple choice | "¿Tiene local físico?", with "Sí" and "No" |
| Short answer, 10 digits starting with 3 | "Número de WhatsApp del negocio", with the help text "10 dígitos, sin espacios. Ej.: 3001234567" |
| Checkbox | "Autorizo publicar estos datos y este número de WhatsApp en el directorio de Alameda del Río, que es público en internet. Sé que esta solicitud se guarda en Google Forms. Política de datos: {politica}" |

#### Scenario: Confirmation screen
- **WHEN** a person sends the form
- **THEN** the confirmation screen shows "¡Gracias! Último paso: escríbenos por WhatsApp desde el número que registraste, para confirmar que es tuyo: {enlace}. Sin ese mensaje no podemos publicar tu negocio."
- **AND** `{enlace}` opens a WhatsApp conversation with the administrator and the text "Confirmo mi registro en el directorio de Alameda del Río"

### Requirement: Form authorization
A form response with the authorization checked, followed by the confirmation message from the same WhatsApp number, SHALL be a way to authorize that number under "Number authorization". The administrator SHALL keep the response and the exported chat outside the repository. A response without that confirmation SHALL NOT be published.

#### Scenario: A confirmed request
- **WHEN** a response with the number `3001234567` is followed by the confirmation message from `+57 300 123 4567`
- **THEN** the administrator may load the business with the number `573001234567` through a reviewed data migration

#### Scenario: No confirmation
- **WHEN** no confirmation arrives from the number of a response, or it arrives from another number
- **THEN** the business is not published

### Requirement: Form processor disclosure
The data policy page SHALL show, between "Para qué los usamos" and "Tus derechos", the heading "Quién más los trata" and the text "Las solicitudes para agregar un negocio se reciben con Google Forms, un servicio de Google que guarda los datos en servidores fuera de Colombia. Solo el administrador puede ver esas respuestas."

#### Scenario: Policy section
- **WHEN** a person opens `/politica-de-datos`
- **THEN** the heading and its text appear between "Para qué los usamos" and "Tus derechos"
