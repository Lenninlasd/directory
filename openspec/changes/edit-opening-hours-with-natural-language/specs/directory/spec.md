## MODIFIED Requirements

### Requirement: Business detail dialog
When the user opens a tile, the system SHALL display a modal dialog with a short cover in the category color and icon, the full business name as its title, the category, the store type badge, a "Ubicación" row with the full location summary, and the rows of "Detail dialog hours and website rows". It SHALL NOT display any other business attribute. In admin mode it SHALL also display the controls of the business-editing spec.

#### Scenario: Dialog content (003 AC-8.1, 003 AC-8.3)
- **WHEN** the user opens a tile
- **THEN** the dialog shows the cover, name, category, badge, and full location of that business, plus its hours and website when it has them, and nothing else about it

#### Scenario: Admin mode controls
- **WHEN** the dialog is open in admin mode
- **THEN** it also shows the "Editar horario" button in the "Horario" row and, while editing, the panel of "Opening hours edit flow" in the business-editing spec

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
| Dialog opening hours row label | "Horario" |
| Dialog website row label | "Página web" |
| Day names, Monday to Sunday | "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo" |
| A day without hours | "Cerrado" |
| Dialog WhatsApp button | "Escribir por WhatsApp" |
| Dialog, no WhatsApp | "Este negocio no tiene WhatsApp registrado" |

### Requirement: Detail dialog hours and website rows
Below "Ubicación", the detail dialog SHALL display a "Horario" row when the business has opening hours, and then a "Página web" row when it has a website. A row without data SHALL NOT be displayed, except the "Horario" row in admin mode.

#### Scenario: Opening hours row
- **WHEN** the business has opening hours
- **THEN** the dialog shows a "Horario" row below "Ubicación", as defined in "Opening hours display"

#### Scenario: Website row
- **WHEN** the business has a website
- **THEN** the dialog shows a "Página web" row after the other rows, with the link defined in "Website link"

#### Scenario: No hours or no website
- **WHEN** `openingHours` is `[]` or `websiteUrl` is `null`, outside admin mode
- **THEN** the dialog does not show that row, and shows no text in its place

#### Scenario: No hours in admin mode
- **WHEN** `openingHours` is `[]` in admin mode
- **THEN** the dialog shows the "Horario" row with "Sin horario registrado" and the "Editar horario" button

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
| Managing businesses or categories through the product, except opening hours in admin mode | The team loads all other business data through reviewed data migrations (infrastructure spec). Categories are free text. Opening hours are edited as defined in the business-editing spec. |
| Business owner accounts and ownership claims | |
| User accounts, login, favorites, reviews, ratings | Admin mode uses one shared key, not an account. |
| Maps, directions, choosing a delivery address | The header only names the area. |
| Interface languages other than Spanish | |
| Analytics and usage tracking | |
| Dark mode | |

#### Scenario: A change proposes an excluded feature
- **WHEN** a change adds a feature from the table
- **THEN** the same change removes its row from the table and specifies the new behavior as requirements
