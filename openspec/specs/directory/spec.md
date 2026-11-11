# directory Specification

## Purpose
A public directory where residents and visitors of Alameda del Río (Barranquilla, Colombia) browse local businesses, find one by search or category, open its details, and start a WhatsApp conversation with it, without an account. Phones are the main device and desktop browsers are supported. Ids in parentheses, such as (001 AC-1.1), name the acceptance criterion of the archived spec that a scenario came from.

## Requirements

### Requirement: Public access without an account
The directory SHALL be open to anyone without an account or login, and SHALL NOT collect personal data from visitors. It shows only contact information of active businesses.

#### Scenario: Opening the directory (001 section 3)
- **WHEN** a person opens the directory for the first time
- **THEN** the businesses are shown without any sign-up, login, or consent step

#### Scenario: No visitor data in logs (001 plan section 3)
- **WHEN** the API handles a request
- **THEN** its logs contain no request headers and no client IP address

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

### Requirement: WhatsApp number validity
A WhatsApp number SHALL be valid when, after removing spaces, dashes, parentheses, and a leading `+`, it has 8 to 15 digits and does not start with `0`. Numbers are stored with the country code. The API SHALL return a valid number as digits only, and `null` for a missing or invalid one.

#### Scenario: A valid number with separators (001 AC-2.5)
- **WHEN** a business has the stored number `+57 (300) 123-4567`
- **THEN** the API returns `"whatsappNumber": "573001234567"`

#### Scenario: An invalid number (001 AC-2.5, 001 EC-5)
- **WHEN** a business has a stored number with letters, fewer than 8 digits, more than 15 digits, or a leading `0`
- **THEN** the API returns `"whatsappNumber": null`

#### Scenario: A missing number
- **WHEN** a business has no stored number
- **THEN** the API returns `"whatsappNumber": null`

### Requirement: Business order
The system SHALL order businesses from the most recently created to the least recently created. Ties SHALL be ordered alphabetically by name with Spanish rules, and then by id, so the order is always the same. The screen SHALL keep the order the API returns.

#### Scenario: Newest first (001 AC-5.1)
- **WHEN** two businesses were created at different times
- **THEN** the more recent one comes first

#### Scenario: Same creation time (001 AC-5.2, 001 EC-6)
- **WHEN** two businesses share the same creation time
- **THEN** they are ordered alphabetically by name, and by id if the names are equal

#### Scenario: Lists on the screen keep the order (003 AC-6.3, 003 AC-7.1)
- **WHEN** the featured section or the full list shows businesses
- **THEN** they appear in the order the API returned them

### Requirement: Loading state
While the list is loading, the system SHALL display a loading indicator with the text "Cargando…".

#### Scenario: The list is loading (001 AC-1.3)
- **WHEN** the directory has requested the list and has no response yet
- **THEN** the text "Cargando…" is shown

### Requirement: Loading failures
If loading the list fails, the system SHALL retry automatically up to 2 times, about 1 second apart. If the retries fail, it SHALL display an error message with a retry button, and SHALL NOT display technical details.

#### Scenario: Automatic retries (001 AC-6.1, 001 EC-2)
- **WHEN** a load fails
- **THEN** the system tries again up to 2 times, about 1 second apart, before showing an error

#### Scenario: Error message (001 AC-6.2)
- **WHEN** all automatic retries fail
- **THEN** the message "No pudimos cargar los negocios. Inténtalo de nuevo." and a "Reintentar" button are shown

#### Scenario: Manual retry (001 AC-6.3)
- **WHEN** the user activates "Reintentar"
- **THEN** the system loads the list again

#### Scenario: No technical details (001 AC-6.4)
- **WHEN** the error message is shown
- **THEN** no status code, exception text, or other technical detail is visible

#### Scenario: Connection lost while loading (001 EC-3)
- **WHEN** the user loses connection while the list is loading
- **THEN** it is treated as a loading failure

### Requirement: Empty state
If there are no active businesses, the system SHALL display the message "Aún no hay negocios disponibles".

#### Scenario: No businesses (001 AC-7.1, 001 EC-1)
- **WHEN** the list loads and has no businesses
- **THEN** the message "Aún no hay negocios disponibles" is shown

### Requirement: Always a visible state
Temporary failures SHALL NOT leave the user on a blank screen. The user SHALL always see content, the loading state, the empty state, or the error with a retry action.

#### Scenario: Any moment of a visit (001 NFR-4)
- **WHEN** the directory is open, in any state of the load
- **THEN** exactly one of these is shown: the businesses, "Cargando…", the empty message, or the error with "Reintentar"

### Requirement: Screen layout
The screen SHALL have a header that stays visible while scrolling, with the title "Negocios en Alameda del Río" as plain text. While the list is loaded and not empty, the header SHALL also hold the search field, and below it the screen SHALL show, in this order, the category filter, the featured section, and the full list.

#### Scenario: Header (003 AC-1.1)
- **WHEN** the user scrolls the page
- **THEN** the header with the title stays visible at the top
- **AND** the title is not interactive and uses no delivery wording such as "Entregar en"

#### Scenario: Loaded with businesses (003 AC-1.2)
- **WHEN** the list is loaded and not empty
- **THEN** the header contains the search field
- **AND** the category filter, the featured section, and the full list follow in that order

#### Scenario: Loading, failed, or empty (003 AC-1.3)
- **WHEN** the list is loading, has failed, or is empty
- **THEN** the header title and the matching state are shown, without the search field, the category filter, or the sections

#### Scenario: Headings and landmark (003 AC-1.4)
- **WHEN** assistive technology reads the page
- **THEN** the title is the main heading, section titles are second-level headings, and business names on tiles are third-level headings
- **AND** the content below the header is the main landmark

### Requirement: Search
The system SHALL let the user filter businesses by typing in a search field. It SHALL match the typed text against the business name and category, ignoring letter case, accents, and leading and trailing spaces, and SHALL filter the list already loaded in the browser.

#### Scenario: Match by name (003 AC-2.1, 003 AC-2.2)
- **WHEN** the user types "cafe"
- **THEN** "Café del Río" is shown and businesses whose name and category do not contain the text are hidden

#### Scenario: Match by category (003 AC-2.1)
- **WHEN** the user types "panaderia"
- **THEN** businesses whose category is "Panadería" are shown

#### Scenario: The letter ñ (003 plan D-8)
- **WHEN** the user types "pena"
- **THEN** a business named "Peña" is shown

#### Scenario: The location is not searched (003 AC-2.1)
- **WHEN** the user types text that appears only in a location summary, such as "Torre 4"
- **THEN** that business is not matched

#### Scenario: No request while typing (003 AC-2.3)
- **WHEN** the user types in the search field
- **THEN** no request is sent to the API

#### Scenario: Empty search (003 AC-2.4)
- **WHEN** the search field is empty or has only spaces
- **THEN** the list is not filtered by text

#### Scenario: Name and clear button (003 AC-2.5)
- **WHEN** the search field has text
- **THEN** a button with the accessible name "Borrar búsqueda" is shown, and activating it empties the field
- **AND** the field has the accessible name "Buscar negocios"

### Requirement: Category filter
The system SHALL display one filter option per category among the loaded businesses, preceded by the option "Todos". Selecting an option SHALL show only the businesses of that category. Only one option is selected at a time.

#### Scenario: One option per category (003 AC-3.1, 003 EC-4)
- **WHEN** businesses use the categories "Cafetería", "cafeteria", and " Cafeteria "
- **THEN** they count as one category with one option, since case, accents, and surrounding spaces are ignored

#### Scenario: Option order (003 AC-3.2)
- **WHEN** the options are shown
- **THEN** "Todos" is first and the categories follow alphabetically with Spanish rules, for example "Alimentos", "Educación", "Ferretería", "Óptica", "Panadería"

#### Scenario: Opening the directory (003 AC-3.3)
- **WHEN** the user opens the directory
- **THEN** "Todos" is selected

#### Scenario: Selecting a category (003 AC-3.4, 003 AC-3.6)
- **WHEN** the user selects a category option
- **THEN** only businesses of that category are shown, and that option is the only one marked as selected

#### Scenario: Back to all (003 AC-3.5)
- **WHEN** the user selects the option that is already selected, or selects "Todos"
- **THEN** businesses of every category are shown

#### Scenario: Category and search together (003 AC-3.7)
- **WHEN** a category is selected and the search field has text
- **THEN** only businesses that match both are shown

#### Scenario: Option content and state (003 AC-3.8)
- **WHEN** an option is shown
- **THEN** it displays the category icon and name, and exposes whether it is selected to assistive technology

#### Scenario: Option labels (003 AC-3.11, 003 EC-11)
- **WHEN** an option is shown
- **THEN** its label is the supported category name, or for an unsupported category the spelling of the first business of that category in list order
- **AND** the label is shown in full, wrapping to two lines if needed, never cut with an ellipsis

#### Scenario: Many categories on a narrow screen (003 AC-3.9, 003 EC-7)
- **WHEN** the options do not fit the width of the screen
- **THEN** they scroll horizontally instead of wrapping onto many lines

#### Scenario: The selected category disappears (003 AC-3.10, 003 EC-8)
- **WHEN** the list is loaded again and the selected category no longer exists
- **THEN** "Todos" is selected

### Requirement: Category visual identity
The system SHALL give each supported category its own icon and color, matching a business category to a supported one while ignoring case, accents, and surrounding spaces. Category icons are decorative.

#### Scenario: Supported categories (003 section 7)
- **WHEN** a business category matches a row of this table
- **THEN** it is shown with that row's icon and color family

| Category | Icon | Color family |
|---|---|---|
| Alimentos | Basket | Lime / green |
| Belleza | Sparkles | Pink |
| Cafetería | Coffee cup | Amber / brown |
| Comida | Fork and knife | Orange / red |
| Deportes | Dumbbell | Emerald |
| Educación | Book | Sky / indigo |
| Farmacia | Pill | Red |
| Ferretería | Wrench | Slate |
| Floristería | Flower | Fuchsia |
| Lavandería | Shirt | Cyan / blue |
| Mascotas | Paw | Violet |
| Mercado | Shopping cart | Green |
| Panadería | Bread | Yellow / orange |
| Postres | Cake | Rose |
| Tecnología | Phone | Zinc |
| Any other category (fallback) | Tag | Teal |

#### Scenario: A supported category (003 AC-4.1, 003 AC-4.2)
- **WHEN** a business has the category "ferreteria"
- **THEN** it is shown with the wrench icon and the slate color of "Ferretería"

#### Scenario: An unsupported category (003 AC-4.3, 003 EC-3)
- **WHEN** a business category matches no supported category
- **THEN** the tag icon and teal color are used, and the business is still displayed and filterable

#### Scenario: Icons never replace the name (003 AC-4.4)
- **WHEN** a category icon is shown
- **THEN** the category name is displayed as text next to it, and the icon is hidden from assistive technology

#### Scenario: Two shades per category (003 section 7)
- **WHEN** a category color is used
- **THEN** a strong shade fills the tile and dialog cover, and a light shade sits behind the icon of its filter option

### Requirement: Business tile
The system SHALL display each business as a tile with a cover in the category color and icon, the business name, and a line with its category and location summary. The tile SHALL NOT display any other business attribute, apart from the store type badge and the WhatsApp button.

#### Scenario: Tile content (003 AC-5.1, 001 AC-2.1)
- **WHEN** a business is listed
- **THEN** its tile shows the cover, the name, the category, and the location summary

#### Scenario: No other attributes (003 AC-5.8, 001 AC-2.4)
- **WHEN** a tile is shown
- **THEN** it shows no attribute beyond the name, category, location summary, store type, and WhatsApp button

#### Scenario: Long text (003 AC-5.5, 003 EC-5, 001 EC-4)
- **WHEN** a name or a category and location line is too long for the tile
- **THEN** it is shortened to one line with an ellipsis, the layout does not break, and the full text is available in the detail dialog

#### Scenario: Opening the dialog (003 AC-5.6)
- **WHEN** the user activates any part of the tile other than the WhatsApp button
- **THEN** the detail dialog for that business opens

#### Scenario: Keyboard (003 AC-5.7)
- **WHEN** the user moves through the page with the keyboard
- **THEN** the tile can be reached and opened, with the accessible name "Ver detalles de {nombre}"

### Requirement: Store type label
The system SHALL show whether a business operates from a physical store: "En tienda" with a store icon, or "Solo domicilios" with a delivery icon. The label SHALL appear as a badge on the tile cover and in the detail dialog.

#### Scenario: A business with a physical store (001 AC-3.1, 003 AC-5.2)
- **WHEN** a business operates from a physical store
- **THEN** the badge reads "En tienda"

#### Scenario: A delivery-only business (001 AC-3.2, 003 AC-5.2)
- **WHEN** a business does not operate from a physical store
- **THEN** the badge reads "Solo domicilios"

### Requirement: WhatsApp contact
While a business has a valid WhatsApp number, the system SHALL offer a WhatsApp button on its tile and in its dialog. Activating it SHALL open a WhatsApp conversation with that number and the prefilled greeting "Hola, te encontré en el directorio de Alameda del Río", which does not include the business name.

#### Scenario: Starting a conversation (001 AC-4.1)
- **WHEN** the user activates a WhatsApp button
- **THEN** WhatsApp opens a conversation addressed to that business's number with the greeting prefilled
- **AND** the directory stays open where the user left it

#### Scenario: WhatsApp is not installed (001 AC-4.2)
- **WHEN** the user's device has no WhatsApp app
- **THEN** the user can continue the conversation through WhatsApp's web experience

#### Scenario: Button on the tile (003 AC-5.3, 001 AC-2.2)
- **WHEN** a business has a valid number
- **THEN** its tile cover shows a WhatsApp button with the accessible name "Contactar a {nombre} por WhatsApp"

#### Scenario: No valid number on the tile (003 AC-5.4, 001 AC-2.3, 003 EC-6)
- **WHEN** a business has no valid number
- **THEN** its tile shows no WhatsApp button and no text about it, and the rest of the tile is shown

#### Scenario: Official glyph (003 AC-5.3, 003 plan D-10)
- **WHEN** a WhatsApp button is shown
- **THEN** it uses the official white WhatsApp glyph, unmodified, on the WhatsApp green of the design tokens
- **AND** the glyph never replaces the word "WhatsApp" in a text

### Requirement: Featured section
While "Todos" is selected, the search field is empty, and at least one loaded business has a physical store, the system SHALL display the section "Visítalos en su tienda", with the subtitle "Negocios con local físico", showing those businesses as tiles in a horizontal row.

#### Scenario: Browsing everything (003 AC-6.1)
- **WHEN** no category is selected and the search field is empty
- **THEN** the section shows every business with a physical store

#### Scenario: A filter is active (003 AC-6.2)
- **WHEN** a category is selected or the search field has text
- **THEN** the featured section is hidden, so results are not shown twice

#### Scenario: No business has a store (003 AC-6.1)
- **WHEN** no loaded business has a physical store
- **THEN** the featured section is not shown

### Requirement: Full list
The system SHALL display every business that matches the current search and category as tiles, under a title and a count of matching businesses. If nothing matches, it SHALL display a no-results message in place of the featured section and the list.

#### Scenario: Matching businesses (003 AC-7.1)
- **WHEN** a search or a category is active
- **THEN** every business that matches is shown as a tile

#### Scenario: Section title (003 AC-7.2)
- **WHEN** "Todos" is selected
- **THEN** the title is "Todos los negocios", and while a category is selected the title is the category name

#### Scenario: Count (003 AC-7.3)
- **WHEN** the number of matching businesses changes
- **THEN** the text under the title reads "1 negocio" or "{n} negocios", and the change is announced to screen readers

#### Scenario: Columns (003 AC-7.4)
- **WHEN** the list is shown on a phone
- **THEN** it has one column, and it has more columns on wider screens

#### Scenario: Nothing matches (003 AC-7.5, 003 EC-1, 003 EC-2)
- **WHEN** no business matches the current search and category
- **THEN** "No encontramos negocios" and "Prueba con otra búsqueda o categoría." are shown
- **AND** the search field and the category filter stay visible, and a selected category stays selected

#### Scenario: Only one business (003 EC-10)
- **WHEN** only one business is loaded
- **THEN** the filter shows "Todos" and one option, the count reads "1 negocio", and the featured section appears only if that business has a store

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

### Requirement: Performance
On a typical mobile connection, the list SHALL be visible within about 3 seconds. With up to a few hundred businesses, search and category results SHALL update with no noticeable delay on a mid-range phone.

#### Scenario: First load (001 NFR-1)
- **WHEN** a person opens the directory on a typical mobile connection
- **THEN** the list is visible within about 3 seconds

#### Scenario: Instant filtering (003 NFR-8)
- **WHEN** the user types in the search field or selects a category with a few hundred businesses loaded
- **THEN** the results update with no noticeable delay on a mid-range phone

### Requirement: Responsive layout
The directory SHALL be designed mobile-first, usable on screens down to 320 px wide, and SHALL also work on desktop browsers.

#### Scenario: A 320 px wide screen (001 NFR-2)
- **WHEN** the directory is shown on a 320 px wide screen
- **THEN** every part is usable and nothing overflows the screen

#### Scenario: A desktop browser (001 NFR-2)
- **WHEN** the directory is shown in a desktop browser
- **THEN** it works and uses the wider layout

### Requirement: Accessibility
The directory SHALL meet WCAG 2.1 level AA, including keyboard operation, an accessible name for every button, and sufficient contrast for all text. No text SHALL be drawn directly on a category color.

#### Scenario: Keyboard only (001 NFR-3)
- **WHEN** a person uses the directory with only the keyboard
- **THEN** every action can be reached and done

#### Scenario: Text contrast (001 NFR-3, 003 NFR-6)
- **WHEN** any text is shown, including the badge on a cover
- **THEN** it meets the AA contrast ratio against its background

#### Scenario: Decorative cover icons (003 NFR-6)
- **WHEN** a large icon is shown on a cover
- **THEN** it is decorative and is exempt from the text contrast rule

### Requirement: Reduced motion
While the user's system asks for reduced motion, the system SHALL NOT animate the dialog or the tiles.

#### Scenario: Reduced motion is on (003 NFR-9)
- **WHEN** the system setting for reduced motion is on
- **THEN** tiles do not zoom or transition, and the dialog opens and closes without animation

### Requirement: Data freshness
Changes to business data SHALL appear the next time the list is loaded. Real-time updates are not required.

#### Scenario: A business changes (001 NFR-5)
- **WHEN** a business is added, changed, or deactivated
- **THEN** the change is visible the next time a person loads the directory

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
