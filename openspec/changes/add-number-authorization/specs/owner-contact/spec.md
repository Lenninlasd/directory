# Spec Delta

## Purpose

Lets a business owner and the directory's administrator reach each other about the owner's data: how a WhatsApp number is authorized and proven before it is published, how an owner asks for a correction or removal, and how the owner is told how their data is treated.

## ADDED Requirements

### Requirement: Number authorization
A WhatsApp number that belongs to a natural person SHALL be published only after that person authorizes it in a way this spec defines, and after the administrator keeps the evidence outside the repository. One way is replying "Sí, autorizo" from that same number to the invitation message. Silence, a refusal, or a reply from another number SHALL NOT count as an authorization.

#### Scenario: An authorized number
- **WHEN** the administrator sends the invitation message to `+57 300 123 4567` and gets "Sí, autorizo" from that number
- **THEN** the administrator exports the chat, keeps it outside the repository, and may then load the number `573001234567` through a reviewed data migration

#### Scenario: A reply from another number
- **WHEN** the authorization arrives from a number that is not the one to publish
- **THEN** the number is not published until "Sí, autorizo" arrives from the number to publish

#### Scenario: No reply or a refusal
- **WHEN** the owner does not reply within 7 days, or refuses
- **THEN** the number is not published, the administrator sends at most one reminder after a missing reply and none after a refusal, and the business may still be published without a number

#### Scenario: A company number
- **WHEN** the number belongs to a company with a tax id (NIT) and not to a natural person
- **THEN** no authorization is needed, and the administrator keeps the address and date of the public source where the company shows it

#### Scenario: Evidence never in the repository
- **WHEN** the repository and the data migrations are inspected
- **THEN** they contain no chat, screenshot, or authorization text

### Requirement: Invitation message
The invitation message SHALL say who sends it, which data the business card would show, that the directory is public on the internet, how to ask for a correction or removal, where the policy is, and how to authorize. Its text SHALL be exactly the one in the first scenario.

#### Scenario: Message text
- **WHEN** the administrator invites an owner
- **THEN** the message is exactly the following, where `{administrador}` is the controller's name, `{sitio}` the directory address, `{datos}` the list of fields the card would show, and `{politica}` the policy page address:

```
Hola, soy {administrador} y administro el directorio de Alameda del Río ({sitio}). ¿Quieres que tu negocio aparezca gratis? Tu ficha mostraría: {datos} y un botón de WhatsApp a este número. El directorio es público en internet. Puedes pedir que corrijamos o retiremos tu ficha cuando quieras, escribiendo a este chat. Política de datos: {politica}
¿Nos autorizas a publicarla? Si es así, responde: Sí, autorizo
```

### Requirement: Correction and removal requests
A request from an owner to correct or remove their business SHALL be accepted only from the business's published number, or, for a business without a number, after the administrator confirms it by writing to a number the business already shows publicly. A removal SHALL be deployed within 15 business days of the request.

#### Scenario: A removal from the published number
- **WHEN** the owner asks for the removal of their business from its published number
- **THEN** the administrator deactivates the business through a reviewed data migration deployed within 15 business days, and keeps the request as evidence outside the repository

#### Scenario: A request from another number
- **WHEN** someone asks to change a business from a number that is not the published one
- **THEN** nothing changes until the administrator confirms the request through the published number or a number the business shows publicly

#### Scenario: Adding a number to a business without one
- **WHEN** the owner of a business published without a number asks to show their number
- **THEN** it follows "Number authorization" before it is published

### Requirement: Owner contact values
The frontend SHALL receive the administrator's WhatsApp number and the data controller's name and email at build time. The number SHALL be used only when it is digits only and valid under "WhatsApp number validity" in the directory spec. While the number is not valid, the "¿Es tu negocio?" link SHALL NOT be shown, and the rest of the directory SHALL work as usual.

#### Scenario: A valid number
- **WHEN** the frontend is built with the administrator number `573001234567`
- **THEN** the owner link opens a WhatsApp conversation addressed to `573001234567`

#### Scenario: No number
- **WHEN** the frontend is built without an administrator number, or with one that is not digits only or not valid
- **THEN** the detail dialog shows no "¿Es tu negocio?" link, and the list, search, filter, and dialog work as usual

#### Scenario: Not in the repository
- **WHEN** the repository is inspected
- **THEN** it contains no administrator WhatsApp number, controller name, or controller email, outside tests that use made-up ones

### Requirement: Business owner link
While the administrator number is valid, the detail dialog of every business SHALL offer a link "¿Es tu negocio?", below the WhatsApp button or the text that replaces it. Activating it SHALL open, in a new tab, a WhatsApp conversation with the administrator's number and the business owner message of that business prefilled.

#### Scenario: Asking for a correction
- **WHEN** the user activates "¿Es tu negocio?" in the dialog of a business
- **THEN** WhatsApp opens a conversation addressed to the administrator's number, with that business's owner message prefilled
- **AND** the dialog and the directory stay open where the user left them

#### Scenario: WhatsApp is not installed
- **WHEN** the user's device has no WhatsApp app
- **THEN** the user can continue the conversation through WhatsApp's web experience

#### Scenario: A business without WhatsApp
- **WHEN** the dialog of a business with no valid WhatsApp number is open
- **THEN** the link is shown below "Este negocio no tiene WhatsApp registrado"

#### Scenario: Not the business's number
- **WHEN** the user activates the link
- **THEN** the conversation is addressed to the administrator, never to the business

#### Scenario: Accessibility
- **WHEN** a person uses the link with assistive technology, the keyboard, or touch
- **THEN** its accessible name equals its visible text, it can be reached and activated with the keyboard, and its touch target is at least 44 by 44 px

### Requirement: Business owner message
The business owner message SHALL name the business and its id, so the administrator knows which business it is about. Its text SHALL be exactly the one in the first scenario.

#### Scenario: Message text
- **WHEN** the owner message is prefilled for the business "Panadería La Espiga" with the id `0b6f1c2e-5a4d-4e8f-9c1b-2d3e4f5a6b7c`
- **THEN** its text is exactly:

```
Hola, este es mi negocio en el directorio de Alameda del Río: Panadería La Espiga (código 0b6f1c2e-5a4d-4e8f-9c1b-2d3e4f5a6b7c). Quiero corregir o retirar su información.
```

### Requirement: Data policy page
The system SHALL serve a page at `/politica-de-datos` with the data processing policy in Spanish, open to anyone without an account, with the text of the first scenario. It SHALL fill in the controller's name, email, and WhatsApp number given at build time, and it SHALL collect no data from visitors. The directory screen has no link to it; the invitation message links it.

#### Scenario: Page text
- **WHEN** a person opens `/politica-de-datos`
- **THEN** the page shows these headings and texts, in this order, where `{nombre}`, `{correo}`, and `{whatsapp}` are the controller's name, email, and WhatsApp number with a leading `+`, and `{fecha}` is the date the project owner approves the text, written in the form "1 de diciembre de 2026"

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
| Link | "Volver al directorio" |

#### Scenario: Back to the directory
- **WHEN** the person activates "Volver al directorio"
- **THEN** the directory opens at the root address of the same site

#### Scenario: Without build values
- **WHEN** the page is built without a controller name, email, or valid WhatsApp number
- **THEN** the "Responsable" text omits each missing part and its label, and the rest of the page is shown

#### Scenario: Layout and accessibility
- **WHEN** the page is shown on a 320 px wide screen, read by assistive technology, or used with the keyboard only
- **THEN** nothing overflows, the main heading is the only first-level heading, the section headings are second-level headings, and the link can be reached and activated

### Requirement: Owner contact text
All owner contact text in the product SHALL be in Spanish, with the exact wording of the table in the first scenario.

#### Scenario: Wording table
- **WHEN** the system shows a text for one of the places in this table
- **THEN** it is exactly the text of that row

| Where | Text |
|---|---|
| Dialog owner link | "¿Es tu negocio?" |
| Policy page back link | "Volver al directorio" |
