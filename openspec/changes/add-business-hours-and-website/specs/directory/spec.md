## MODIFIED Requirements

### Requirement: Business list API
The API SHALL expose `GET /businesses`, with no parameters and no authentication, and return every active business in one JSON response. Each business SHALL have exactly these fields: `id`, `name`, `category`, `locationSummary`, `hasPhysicalStore`, `whatsappNumber`, `websiteUrl`, and `openingHours`.

#### Scenario: Active businesses are returned in one request (001 AC-1.1)
- **WHEN** a client calls `GET /businesses`
- **THEN** the response is `200` with a body of the form `{ "businesses": [ { "id": "0b9f6c1e-6d0a-4c43-9f43-3a6c1d2e8a10", "name": "Panadería La Esquina", "category": "Panadería", "locationSummary": "Centro Comercial Plaza, local 12", "hasPhysicalStore": true, "whatsappNumber": "573001234567", "websiteUrl": "https://example.com/panaderia", "openingHours": [ { "dayOfWeek": 1, "opens": "07:00", "closes": "19:00" } ] } ] }`
- **AND** it contains every active business

#### Scenario: Inactive businesses are never returned (001 AC-1.2)
- **WHEN** a business is marked as inactive
- **THEN** it does not appear in the response

#### Scenario: No active businesses
- **WHEN** there are no active businesses
- **THEN** the response is `200` with `{ "businesses": [] }`

#### Scenario: No other attributes are returned (001 AC-2.4)
- **WHEN** a client reads a business from the response
- **THEN** it has only the eight fields of this requirement, and no active flag, creation time, or other attribute

#### Scenario: Server failure (001 AC-6.4, 002 EC-1)
- **WHEN** the API cannot read the businesses
- **THEN** the response is `500` with `{ "error": "internal_error" }` and no stack trace or database message
- **AND** the details are written only to the logs

### Requirement: Business detail dialog
When the user opens a tile, the system SHALL display a modal dialog with a short cover in the category color and icon, the full business name as its title, the category, the store type badge, a "Ubicación" row with the full location summary, and the rows of "Detail dialog hours and website rows". It SHALL NOT display any other business attribute.

#### Scenario: Dialog content (003 AC-8.1, 003 AC-8.3)
- **WHEN** the user opens a tile
- **THEN** the dialog shows the cover, name, category, badge, and full location of that business, plus its hours and website when it has them, and nothing else about it

#### Scenario: WhatsApp button in the dialog (003 AC-8.2)
- **WHEN** the business has a valid WhatsApp number
- **THEN** the dialog shows a main button with the WhatsApp glyph and the text "Escribir por WhatsApp", whose accessible name equals that text

#### Scenario: No WhatsApp number (003 AC-8.2, 003 EC-6)
- **WHEN** the business has no valid WhatsApp number
- **THEN** the dialog shows "Este negocio no tiene WhatsApp registrado" in place of the button

#### Scenario: Sheet or centered (003 AC-8.4)
- **WHEN** the dialog opens on a phone
- **THEN** it appears as a sheet anchored to the bottom of the screen, and on wider screens it appears centered

#### Scenario: A 320 px wide screen (003 AC-8.5)
- **WHEN** the dialog opens on a 320 px wide screen
- **THEN** the location row and the WhatsApp button are visible without scrolling

#### Scenario: Closing (003 AC-8.6)
- **WHEN** the user activates the "Cerrar" button, presses Escape, or taps outside the dialog
- **THEN** the dialog closes

#### Scenario: After closing (003 AC-8.7, 003 EC-9)
- **WHEN** the dialog closes in any way
- **THEN** the screen is exactly as before, with no overlay left behind, and keyboard focus is on the tile that opened it

#### Scenario: While open (003 AC-8.8)
- **WHEN** the dialog is open
- **THEN** keyboard focus stays inside it and the page behind it does not scroll

#### Scenario: Page address (003 AC-8.9)
- **WHEN** the dialog opens or closes
- **THEN** the page URL does not change

#### Scenario: The open business disappears (003 plan section 4)
- **WHEN** the list is loaded again and no longer contains the business shown in the dialog
- **THEN** the dialog closes

### Requirement: Interface text
All interface text SHALL be in Spanish, with the exact wording of the table in the first scenario. Everything else (specs, code, and API field names) is in English.

#### Scenario: Wording table (001 section 3, 003 section 6)
- **WHEN** the directory shows a text for one of the places in this table
- **THEN** it is exactly the text of that row, with the same wording and characters

| Where | Text |
|---|---|
| Header title | "Negocios en Alameda del Río" |
| Loading | "Cargando…" |
| Load error and its button | "No pudimos cargar los negocios. Inténtalo de nuevo." / "Reintentar" |
| No businesses at all | "Aún no hay negocios disponibles" |
| Search field placeholder | "Buscar negocios o categorías" |
| Search field accessible name | "Buscar negocios" |
| Search clear button accessible name | "Borrar búsqueda" |
| Category filter accessible name | "Categorías" |
| "All categories" option | "Todos" |
| Featured section title and subtitle | "Visítalos en su tienda" / "Negocios con local físico" |
| Full list title | "Todos los negocios", or the selected category name |
| Result count | "1 negocio" / "{n} negocios" |
| No matching businesses | "No encontramos negocios" / "Prueba con otra búsqueda o categoría." |
| Store type badge | "En tienda" / "Solo domicilios" |
| Tile accessible name | "Ver detalles de {nombre}" |
| Tile WhatsApp button accessible name | "Contactar a {nombre} por WhatsApp" |
| WhatsApp greeting | "Hola, te encontré en el directorio de Alameda del Río" |
| Dialog close button accessible name | "Cerrar" |
| Dialog location row label | "Ubicación" |
| Dialog opening hours row label | "Horario" |
| Dialog website row label | "Página web" |
| Day names, Monday to Sunday | "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo" |
| A day without hours | "Cerrado" |
| Dialog WhatsApp button | "Escribir por WhatsApp" |
| Dialog, no WhatsApp | "Este negocio no tiene WhatsApp registrado" |

### Requirement: Deliberate exclusions
The directory SHALL NOT include the features in the table of the first scenario. Each was left out on purpose, and a change that adds one SHALL remove it from this table.

#### Scenario: Excluded features (001 section 8, 003 section 11)
- **WHEN** a person uses the directory
- **THEN** none of the features in this table is available

| Excluded | Notes |
|---|---|
| Pagination, "load more", infinite scroll | All active businesses come in one request. To be revisited when the number of businesses requires it. |
| Other filters, selecting several categories, sort options | Only the single category filter and the fixed order exist. |
| Search on the server, typo-tolerant search, search by location summary | Search runs in the browser over name and category. |
| A page or URL per business; search or category kept in the URL | Details open in a dialog. |
| Extended business attributes | Description, logo, cover image, photos, exact address, coordinates, email, Instagram, catalog link, home delivery flag, payment methods, verification status. They need API and data model changes. |
| A confirmation dialog for leaving the site | |
| Managing businesses or categories through the product | The team loads business data through reviewed data migrations (infrastructure spec). Categories are free text. |
| Business owner accounts and ownership claims | |
| User accounts, login, favorites, reviews, ratings | |
| Maps, directions, choosing a delivery address | The header only names the area. |
| Interface languages other than Spanish | |
| Analytics and usage tracking | |
| Dark mode | |

#### Scenario: A change proposes an excluded feature
- **WHEN** a change adds a feature from the table
- **THEN** the same change removes its row from the table and specifies the new behavior as requirements

## ADDED Requirements

### Requirement: Detail dialog hours and website rows
Below "Ubicación", the detail dialog SHALL display a "Horario" row when the business has opening hours, and then a "Página web" row when it has a website. A row without data SHALL NOT be displayed.

#### Scenario: Opening hours row
- **WHEN** the business has opening hours
- **THEN** the dialog shows a "Horario" row below "Ubicación", as defined in "Opening hours display"

#### Scenario: Website row
- **WHEN** the business has a website
- **THEN** the dialog shows a "Página web" row after the other rows, with the link defined in "Website link"

#### Scenario: No hours or no website
- **WHEN** `openingHours` is `[]` or `websiteUrl` is `null`
- **THEN** the dialog does not show that row, and shows no text in its place

### Requirement: Website validity
A stored website SHALL be valid when it is an absolute URL with the `https` scheme. The API SHALL return a valid website as `websiteUrl`, and `null` for a missing or invalid one.

#### Scenario: A valid website
- **WHEN** a business has the stored website `https://example.com/panaderia`
- **THEN** the API returns `"websiteUrl": "https://example.com/panaderia"`

#### Scenario: An invalid or missing website
- **WHEN** a business has no stored website, or one without a scheme, such as `example.com/panaderia`, or with another scheme, such as `http://example.com` or `javascript:alert(1)`
- **THEN** the API returns `"websiteUrl": null`

### Requirement: Opening hours validity
The API SHALL return a business's weekly hours as `openingHours`, a list of ranges ordered by day and then by opening time. A range has `dayOfWeek` (1 is Monday, 7 is Sunday), `opens`, and `closes`. Times are `HH:MM` in 24-hour format, `closes` is later than `opens`, and `closes` can be `"24:00"` for midnight. A day can have several ranges. For missing hours, or stored hours with any invalid range, the API SHALL return `[]`.

#### Scenario: Valid hours
- **WHEN** a business has stored the ranges Tuesday `09:00` to `17:00`, Monday `14:00` to `18:00`, and Monday `08:00` to `12:00`
- **THEN** `openingHours` is `[ { "dayOfWeek": 1, "opens": "08:00", "closes": "12:00" }, { "dayOfWeek": 1, "opens": "14:00", "closes": "18:00" }, { "dayOfWeek": 2, "opens": "09:00", "closes": "17:00" } ]`

#### Scenario: Missing hours
- **WHEN** a business has no stored hours
- **THEN** the API returns `"openingHours": []`

#### Scenario: Invalid hours
- **WHEN** the stored hours are not a list of ranges, or contain a range with a day outside 1 to 7, a time that is not `HH:MM`, or a closing time that is not later than its opening time
- **THEN** the API returns `"openingHours": []`, so the directory never shows partly wrong hours

### Requirement: Opening hours display
The "Horario" row SHALL list the week from Monday to Sunday, one line per group of consecutive days with the same hours, as `{días} · {horas}`. A day's hours are its ranges as `{apertura} – {cierre}`, joined by " y ", or "Cerrado" when the day has none. A group is labeled with its day name, two names joined by " y ", or its first and last names joined by " a ", with only the first word capitalized.

#### Scenario: A typical week
- **WHEN** a business opens Monday to Friday from `08:00` to `18:00`, Saturday from `08:00` to `12:00`, and has no range on Sunday
- **THEN** the row shows "Lunes a viernes · 8:00 a. m. – 6:00 p. m.", "Sábado · 8:00 a. m. – 12:00 p. m.", and "Domingo · Cerrado", in that order

#### Scenario: Two days and several ranges
- **WHEN** Saturday and Sunday both open from `08:00` to `12:00` and from `14:00` to `24:00`
- **THEN** their line reads "Sábado y domingo · 8:00 a. m. – 12:00 p. m. y 2:00 p. m. – 12:00 a. m."

#### Scenario: Times in 12-hour format
- **WHEN** a time is shown
- **THEN** it has the hour without a leading zero, two-digit minutes, and "a. m." or "p. m.": `07:00` is "7:00 a. m.", `12:00` is "12:00 p. m.", `18:30` is "6:30 p. m.", and both `00:00` and `24:00` are "12:00 a. m."

### Requirement: Website link
The "Página web" row SHALL show a link whose text is the website without its `https://` prefix and without a trailing slash, followed by an external-link icon that screen readers ignore. Activating the link SHALL open the website in a new tab, with no confirmation step.

#### Scenario: Link text
- **WHEN** the website is `https://example.com/panaderia/`
- **THEN** the link text reads "example.com/panaderia", followed by the icon

#### Scenario: Opening the website
- **WHEN** the user activates the link
- **THEN** the website opens in a new tab, and the directory stays open with the dialog where the user left it
