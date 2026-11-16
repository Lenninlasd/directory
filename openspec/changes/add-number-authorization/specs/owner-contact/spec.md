# Spec Delta

## Purpose

How the directory's administrator gets and proves an owner's authorization to publish a WhatsApp number, how an owner asks for a correction or removal, and how owners are told how their data is treated.

## ADDED Requirements

### Requirement: Number authorization
A WhatsApp number of a natural person SHALL be published only after that person authorizes it in a way this spec defines, and after the administrator keeps the evidence outside the repository. One way is replying "Sí, autorizo" from that number to the administrator's invitation, which names the data to publish and links the policy page. Silence or a reply from another number SHALL NOT count.

#### Scenario: An authorized number
- **WHEN** the owner replies "Sí, autorizo" from `+57 300 123 4567` to the invitation
- **THEN** the administrator saves the exported chat outside the repository, and may then load `573001234567` through a reviewed data migration

#### Scenario: No valid authorization
- **WHEN** the owner does not reply, refuses, or replies from another number
- **THEN** the number is not published, and the business may still be published without it

#### Scenario: A company number
- **WHEN** the number belongs to a company with a tax id (NIT)
- **THEN** no authorization is needed

### Requirement: Correction and removal
A request to correct or remove a business SHALL be accepted only when it comes from the business's published number, or after the administrator confirms it through a number the business shows publicly. A removal SHALL be deployed within 15 business days.

#### Scenario: A removal from the published number
- **WHEN** the owner asks for a removal from the business's published number
- **THEN** the administrator deactivates the business through a data migration deployed within 15 business days

#### Scenario: A request from another number
- **WHEN** the request comes from a number that is not the published one
- **THEN** nothing changes until the administrator confirms it through the published number

### Requirement: Business owner link
The detail dialog of every business SHALL show a link "¿Es tu negocio?" below the WhatsApp button or the text that replaces it. Activating it SHALL open, in a new tab, a WhatsApp conversation with the administrator's number and this text prefilled: "Hola, este es mi negocio en el directorio de Alameda del Río: {nombre} (código {id}). Quiero corregir o retirar su información."

#### Scenario: Asking for a correction
- **WHEN** the user activates "¿Es tu negocio?" in the dialog of "Panadería La Espiga", whose id is `0b6f1c2e-5a4d-4e8f-9c1b-2d3e4f5a6b7c`
- **THEN** WhatsApp opens a conversation with the administrator, never the business, with the text "Hola, este es mi negocio en el directorio de Alameda del Río: Panadería La Espiga (código 0b6f1c2e-5a4d-4e8f-9c1b-2d3e4f5a6b7c). Quiero corregir o retirar su información."

#### Scenario: A business without WhatsApp
- **WHEN** the dialog of a business with no valid WhatsApp number is open
- **THEN** the link is shown below "Este negocio no tiene WhatsApp registrado"

#### Scenario: Accessibility
- **WHEN** a person uses the link with the keyboard, assistive technology, or touch
- **THEN** it can be reached and activated, its accessible name is "¿Es tu negocio?", and its touch target is at least 44 px high

### Requirement: Data policy page
The system SHALL serve a page at `/politica-de-datos` with the data processing policy in Spanish, with the text of the first scenario, open to anyone. It SHALL collect no data from visitors.

#### Scenario: Page text
- **WHEN** a person opens `/politica-de-datos`
- **THEN** the page shows these texts in this order, where `{nombre}`, `{correo}`, `{whatsapp}`, and `{fecha}` are the values the project owner gives when the page is written

| Element | Text |
|---|---|
| Main heading | "Política de tratamiento de datos personales" |
| Heading | "Responsable" |
| Text | "{nombre}, administrador del Directorio de Alameda del Río. Barranquilla, Colombia. Correo: {correo}. WhatsApp: {whatsapp}." |
| Heading | "Qué datos tratamos" |
| Text | "Publicamos el nombre, la categoría, la ubicación general, si tiene local físico, el horario, la página web y el número de WhatsApp de cada negocio. Si el número es de una persona, solo lo publicamos con su autorización. No recogemos datos de quienes visitan el directorio." |
| Heading | "Para qué los usamos" |
| Text | "Para mostrar los negocios del sector en este directorio, que es público en internet, y para que los vecinos los encuentren y les escriban por WhatsApp. No los usamos para nada más." |
| Heading | "Tus derechos" |
| Text | "Puedes conocer, actualizar y corregir tus datos, pedir prueba de tu autorización, revocarla, pedir que retiremos tus datos y presentar quejas ante la Superintendencia de Industria y Comercio (Ley 1581 de 2012, artículo 8)." |
| Heading | "Cómo ejercerlos" |
| Text | "Escríbenos por WhatsApp o al correo de arriba. Respondemos las consultas en un máximo de 10 días hábiles y los reclamos en un máximo de 15 días hábiles. Si pides que retiremos tus datos, los quitamos del directorio." |
| Text | "Vigente desde el {fecha}." |
| Link to the directory | "Volver al directorio" |

#### Scenario: Layout and accessibility
- **WHEN** the page is shown on a 320 px wide screen or read by assistive technology
- **THEN** nothing overflows, and the main heading is the only first-level heading
