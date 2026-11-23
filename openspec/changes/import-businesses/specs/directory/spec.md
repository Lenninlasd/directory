# Spec Delta

## MODIFIED Requirements

### Requirement: Public access without an account
The directory SHALL be open to anyone without an account or login, and SHALL NOT collect personal data from visitors. It shows only public information of active businesses, never their private fields (business-import spec).

#### Scenario: Opening the directory (001 section 3)
- **WHEN** a person opens the directory for the first time
- **THEN** the businesses are shown without any sign-up, login, or consent step

#### Scenario: No visitor data in logs (001 plan section 3)
- **WHEN** the API handles a request
- **THEN** its logs contain no request headers and no client IP address

### Requirement: Business list API
The API SHALL expose `GET /businesses`, with no parameters and no authentication, and return every active business in one JSON response. Each business SHALL have exactly these fields: `id`, `name`, `category`, `locationSummary`, `hasPhysicalStore`, `whatsappNumber`, `websiteUrl`, `openingHours`, `mapsUrl`, `description`, and `instagramUrl`.

#### Scenario: Active businesses are returned in one request (001 AC-1.1)
- **WHEN** a client calls `GET /businesses`
- **THEN** the response is `200` with a body of the form `{ "businesses": [ { "id": "0b9f6c1e-6d0a-4c43-9f43-3a6c1d2e8a10", "name": "Panadería La Esquina", "category": "Panadería", "locationSummary": "Centro Comercial Plaza, local 12", "hasPhysicalStore": true, "whatsappNumber": "573001234567", "websiteUrl": "https://example.com/panaderia", "openingHours": [ { "dayOfWeek": 1, "opens": "07:00", "closes": "19:00" } ], "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Panader%C3%ADa%20La%20Esquina&query_place_id=EXAMPLE_PLACE_ID", "description": "Pan artesanal y tortas por encargo.", "instagramUrl": "https://www.instagram.com/example.panaderia/" } ] }`
- **AND** it contains every active business

#### Scenario: Inactive businesses are never returned (001 AC-1.2)
- **WHEN** a business is marked as inactive
- **THEN** it does not appear in the response

#### Scenario: No active businesses
- **WHEN** there are no active businesses
- **THEN** the response is `200` with `{ "businesses": [] }`

#### Scenario: No other attributes are returned (001 AC-2.4)
- **WHEN** a client reads a business from the response
- **THEN** it has only the eleven fields of this requirement, and no active flag, creation time, private field of the business-import spec, or other attribute

#### Scenario: Server failure (001 AC-6.4, 002 EC-1)
- **WHEN** the API cannot read the businesses
- **THEN** the response is `500` with `{ "error": "internal_error" }` and no stack trace or database message
- **AND** the details are written only to the logs

### Requirement: Business detail dialog
When the user opens a tile, the system SHALL display a modal dialog with a short cover in the category color and icon, the full business name as its title, the category, the store type badge, the "Business description", a "Ubicación" row with the full location summary and its "Maps link", and the rows of "Detail dialog hours and website rows". It SHALL NOT display any other business attribute. In admin mode it SHALL also display the controls of the business-editing spec.

#### Scenario: Dialog content (003 AC-8.1, 003 AC-8.3)
- **WHEN** the user opens a tile
- **THEN** the dialog shows the cover, name, category, badge, and full location of that business, plus its description, Maps link, hours, website, and Instagram when it has them, and nothing else about it

#### Scenario: Admin mode controls
- **WHEN** the dialog is open in admin mode
- **THEN** it also shows the "Editar con IA" button in the "Horario" row and, while editing, the panel of "Opening hours edit flow" in the business-editing spec

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

### Requirement: Detail dialog hours and website rows
Below "Ubicación", the detail dialog SHALL display a "Horario" row when the business has opening hours, then a "Página web" row when it has a website, and then an "Instagram" row when it has an Instagram link. A row without data SHALL NOT be displayed, except the "Horario" row in admin mode.

#### Scenario: Opening hours row
- **WHEN** the business has opening hours
- **THEN** the dialog shows a "Horario" row below "Ubicación", as defined in "Opening hours display"

#### Scenario: Website row
- **WHEN** the business has a website
- **THEN** the dialog shows a "Página web" row after "Ubicación" and "Horario", with the link defined in "Website link"

#### Scenario: Instagram row
- **WHEN** the business has an Instagram link
- **THEN** the dialog shows an "Instagram" row after the other rows, with the link defined in "Instagram link"

#### Scenario: No hours or no website
- **WHEN** `openingHours` is `[]` or `websiteUrl` is `null`, outside admin mode
- **THEN** the dialog does not show that row, and shows no text in its place

#### Scenario: No Instagram
- **WHEN** `instagramUrl` is `null`
- **THEN** the dialog does not show the "Instagram" row, and shows no text in its place

#### Scenario: No hours in admin mode
- **WHEN** `openingHours` is `[]` in admin mode
- **THEN** the dialog shows the "Horario" row with "Sin horario registrado" and the "Editar con IA" button

### Requirement: Interface text
All interface text SHALL be in Spanish, with the exact wording of the table in the first scenario. Everything else (specs, code, and API field names) is in English. Admin mode text is defined in the business-editing spec.

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
| Dialog Maps link | "Ver en Google Maps" |
| Dialog opening hours row label | "Horario" |
| Dialog website row label | "Página web" |
| Dialog Instagram row label | "Instagram" |
| Description expand button | "Ver más" / "Ver menos" |
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
| Search on the server, typo-tolerant search, search by location summary or description | Search runs in the browser over name and category. |
| A page or URL per business; search or category kept in the URL | Details open in a dialog. |
| Extended business attributes | Logo, cover image, photos, exact address, coordinates, email, catalog link, products and prices, home delivery flag, payment methods, verification status. They need API and data model changes. Coordinates are stored by the import but never shown (business-import spec). |
| A confirmation dialog for leaving the site | |
| Managing businesses or categories through the product, except opening hours in admin mode | The team loads all other business data with the import command (business-import spec). Categories are free text. Opening hours are edited as defined in the business-editing spec. |
| Business owner accounts and ownership claims | |
| User accounts, login, favorites, reviews, ratings | Admin mode uses one shared key, not an account. |
| Embedded maps, directions, choosing a delivery address | The header only names the area. The dialog only links to the business's own Google Maps listing ("Maps link"). |
| Interface languages other than Spanish | |
| Analytics and usage tracking | |
| Dark mode | |

#### Scenario: A change proposes an excluded feature
- **WHEN** a change adds a feature from the table
- **THEN** the same change removes its row from the table and specifies the new behavior as requirements

## ADDED Requirements

### Requirement: Maps link validity
A stored Maps link SHALL be valid when it is an absolute URL with the `https` scheme, the host `www.google.com`, and a path that starts with `/maps/`. The API SHALL return a valid link as `mapsUrl`, and `null` for a missing or invalid one.

#### Scenario: A valid Maps link
- **WHEN** a business has the stored link `https://www.google.com/maps/search/?api=1&query=Panader%C3%ADa&query_place_id=EXAMPLE_PLACE_ID`
- **THEN** the API returns it as `mapsUrl`

#### Scenario: An invalid or missing Maps link
- **WHEN** a business has no stored link, or one with another scheme, such as `http://www.google.com/maps/` or `javascript:alert(1)`, another host, such as `https://maps.app.goo.gl/abc` or `https://example.com/maps/`, or another path, such as `https://www.google.com/search?q=panaderia`
- **THEN** the API returns `"mapsUrl": null`

### Requirement: Instagram link validity
A stored Instagram link SHALL be valid when it is exactly `https://www.instagram.com/{handle}/`, where the handle has 1 to 30 letters, digits, periods, or underscores. The API SHALL return a valid link as `instagramUrl`, and `null` for a missing or invalid one.

#### Scenario: A valid Instagram link
- **WHEN** a business has the stored link `https://www.instagram.com/example.panaderia/`
- **THEN** the API returns it as `instagramUrl`

#### Scenario: An invalid or missing Instagram link
- **WHEN** a business has no stored link, or one with another scheme or host, such as `http://www.instagram.com/example/` or `https://instagram.example.com/example/`, a longer path, such as `https://www.instagram.com/p/abc123/`, or a handle with other characters or more than 30 of them
- **THEN** the API returns `"instagramUrl": null`

### Requirement: Description validity
A stored description SHALL be valid when, after removing spaces and line breaks at both ends, it has 1 to 300 characters. The API SHALL return a valid description in that trimmed form as `description`, and `null` for a missing, empty, or longer one.

#### Scenario: A valid description
- **WHEN** a business has the stored description `"  Pan artesanal y tortas por encargo. "`
- **THEN** the API returns `"description": "Pan artesanal y tortas por encargo."`

#### Scenario: An empty, long, or missing description
- **WHEN** a business has no stored description, one with only spaces, or one with more than 300 characters after trimming
- **THEN** the API returns `"description": null`

### Requirement: Maps link
While a business has a Maps link, the "Ubicación" row of the detail dialog SHALL show, below the location summary, a link with the text "Ver en Google Maps", followed by an external-link icon that screen readers ignore. Activating the link SHALL open the business's Google Maps listing in a new tab, with no confirmation step.

#### Scenario: A business with a Maps link
- **WHEN** the dialog opens for a business whose `mapsUrl` is not `null`
- **THEN** the "Ubicación" row shows the location summary and, below it, the link "Ver en Google Maps" with the icon

#### Scenario: A business without a Maps link
- **WHEN** `mapsUrl` is `null`
- **THEN** the "Ubicación" row shows only the location summary, with no link and no text in its place

#### Scenario: Opening the Maps link
- **WHEN** the user activates the link
- **THEN** the listing opens in a new tab, and the directory stays open with the dialog where the user left it

### Requirement: Instagram link
The "Instagram" row SHALL show a link whose text is `@` followed by the handle, followed by an external-link icon that screen readers ignore. Activating the link SHALL open the Instagram profile in a new tab, with no confirmation step.

#### Scenario: Link text
- **WHEN** the Instagram link is `https://www.instagram.com/example.panaderia/`
- **THEN** the link text reads "@example.panaderia", followed by the icon

#### Scenario: Opening the profile
- **WHEN** the user activates the link
- **THEN** the profile opens in a new tab, and the directory stays open with the dialog where the user left it

### Requirement: Business description
While a business has a description, the detail dialog SHALL show it as plain text in a paragraph between the store type badge and the rows, limited to three lines. When the text needs more than three lines, a "Ver más" button below it SHALL show the full text, and its text SHALL then read "Ver menos", which limits it to three lines again. Markup in a description SHALL be shown as text, never interpreted.

#### Scenario: A short description
- **WHEN** the dialog opens for a business whose description fits in three lines
- **THEN** the description is shown in full between the badge and the rows, with no button

#### Scenario: A long description
- **WHEN** the dialog opens for a business whose description needs more than three lines
- **THEN** the dialog shows its first three lines, ending in an ellipsis, and below them a "Ver más" button whose `aria-expanded` is `false`

#### Scenario: Expanding and limiting the description
- **WHEN** the user activates "Ver más"
- **THEN** the full description is shown, the button reads "Ver menos" and its `aria-expanded` is `true`, and keyboard focus stays on it, and activating it again limits the description to three lines

#### Scenario: Another business
- **WHEN** the user expands a description, closes the dialog, and opens another business or the same one again
- **THEN** its description is limited to three lines again

#### Scenario: A business without a description
- **WHEN** `description` is `null`
- **THEN** the dialog shows no paragraph, no button, and no text in their place

#### Scenario: The longest description on a 320 px wide screen
- **WHEN** the dialog opens on a 320 px wide screen for a business with a 300-character description, not expanded
- **THEN** the location row and the WhatsApp button are still visible without scrolling, as in "Business detail dialog"

#### Scenario: Markup in a description
- **WHEN** a description contains text such as `<b>Pan</b>`
- **THEN** the dialog shows those characters as they are, with no bold text
