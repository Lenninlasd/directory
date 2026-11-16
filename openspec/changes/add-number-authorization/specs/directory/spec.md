# Spec Delta

## MODIFIED Requirements

### Requirement: WhatsApp number validity
A WhatsApp number SHALL be valid when, after removing spaces, dashes, parentheses, and a leading `+`, it has 8 to 15 digits and does not start with `0`. Numbers are stored with the country code. `GET /businesses` SHALL return a valid number as digits only, and only while the owner has authorized it (owner-contact spec, "Number authorization"), and `null` for a missing, invalid, or unauthorized one.

#### Scenario: A valid number with separators (001 AC-2.5)
- **WHEN** a business has the stored number `+57 (300) 123-4567`
- **AND** the owner has authorized it
- **THEN** the API returns `"whatsappNumber": "573001234567"`

#### Scenario: An invalid number (001 AC-2.5, 001 EC-5)
- **WHEN** a business has a stored number with letters, fewer than 8 digits, more than 15 digits, or a leading `0`
- **THEN** the API returns `"whatsappNumber": null`

#### Scenario: A missing number
- **WHEN** a business has no stored number
- **THEN** the API returns `"whatsappNumber": null`

#### Scenario: An unauthorized number
- **WHEN** a business has a valid stored number that the owner has not authorized
- **THEN** `GET /businesses` returns `"whatsappNumber": null`, and the tile and the dialog behave as for a business without a number

### Requirement: Business detail dialog
When the user opens a tile, the system SHALL display a modal dialog with a short cover in the category color and icon, the full business name as its title, the category, the store type badge, a "Ubicación" row with the full location summary, and the rows of "Detail dialog hours and website rows". It SHALL NOT display any other business attribute. In admin mode it SHALL also display the controls and the admin WhatsApp row of the business-editing spec.

#### Scenario: Dialog content (003 AC-8.1, 003 AC-8.3)
- **WHEN** the user opens a tile
- **THEN** the dialog shows the cover, name, category, badge, and full location of that business, plus its hours and website when it has them, and nothing else about it

#### Scenario: Admin mode controls
- **WHEN** the dialog is open in admin mode
- **THEN** it also shows the "Editar con IA" button in the "Horario" row and, while editing, the panel of "Opening hours edit flow" in the business-editing spec
- **AND** it shows the row of "WhatsApp number in admin mode" in the business-editing spec

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
| Business owner accounts; handling ownership claims or new business requests inside the product (built-in forms, verification codes, automatic publishing) | Owners reach the administrator outside the product (owner-contact spec), and the administrator handles every request by hand. |
| User accounts, login, favorites, reviews, ratings | Admin mode uses one shared key, not an account. |
| Maps, directions, choosing a delivery address | The header only names the area. |
| Interface languages other than Spanish | |
| Analytics and usage tracking | |
| Dark mode | |

#### Scenario: A change proposes an excluded feature
- **WHEN** a change adds a feature from the table
- **THEN** the same change removes its row from the table and specifies the new behavior as requirements
