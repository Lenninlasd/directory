# Spec 003: Directory Redesign

- **Status:** Approved (approved by the project owner in chat on 2026-11-02)
- **Created:** 2026-10-31
- **Last updated:** 2026-11-02
- **Depends on:** [Spec 001](../2026-10-23-001-business-list/spec.md) (Approved)

## 1. Context and Objective

**Context.** Spec 001 shipped a plain list of business cards. As more businesses join, people need a faster way to find the one they want, and a list of identical cards makes categories hard to tell apart. A layout inspired by delivery apps was explored in the playground (`playground/`, AGENTS.md "Playground") and the project owner chose it as the direction.

**Objective.** Redesign the directory screen so people can search, filter by category, recognize categories at a glance, and open a business to see its information in a larger view, using only the data the API already returns.

**Why it matters.** Finding a business takes fewer taps, and the directory looks like the apps people already use every day.

**Success looks like.** A person types part of a business name or taps a category, sees the matching businesses right away, opens one, and starts a WhatsApp conversation from it.

## 2. Relationship to Spec 001

This spec changes only the frontend. The API contract, data model, and business rules of spec 001 do not change. Where the two specs differ, this spec takes precedence for the directory screen:

| Spec 001 item (wording before 2026-11-10) | Change in this spec |
|---|---|
| FR-2 (business card) | The card is replaced by the business tile (FR-5). The tile shows the same attributes, and AC-2.4 still holds. |
| FR-3 (store type label) | Same labels, now shown as a badge with an icon (AC-5.2). |
| Section 8: "Search by name or any other text" | In scope (FR-2) |
| Section 8: "Filters, including by category" | Category filter in scope (FR-3). Other filters and sort options stay out of scope. |
| Section 8: "A detail page for each business" | A detail dialog is in scope (FR-8). A separate page with its own URL stays out of scope. |

Everything else in spec 001 still applies: active businesses only, one request, ordering (FR-5), WhatsApp rules and greeting (FR-4, AC-2.5), loading, error, and empty states (FR-1, FR-6, FR-7), and NFR-1 to NFR-5.

The affected sections of spec 001 are rewritten to describe the current behavior, with links to this spec (AGENTS.md, "When a spec changes earlier behavior"; done on 2026-11-10).

## 3. Users

Same users as spec 001: residents and visitors, mobile first, desktop supported.

## 4. User Stories

- **US-1.** As a user, I want to search businesses by typing part of their name or category, so that I find a business I already have in mind.
- **US-2.** As a user, I want to filter businesses by category, so that I can browse only the kind of business I need.
- **US-3.** As a user, I want each category to have its own icon and color, so that I can scan the list quickly.
- **US-4.** As a user, I want to open a business and see its information in a larger view without leaving the list, so that I can decide whether to contact it.
- **US-5.** As a user, I want businesses with a physical store to stand out, so that I know which ones I can visit.

## 5. Functional Requirements

Acceptance criteria use EARS notation. All quoted Spanish text is listed in section 6.

### FR-1: Screen layout

- **AC-1.1.** The system shall display a header with the directory title as plain, non-interactive text. The directory does not take orders or deliver, so the header does not use delivery wording such as "Entregar en". While the list is loaded and not empty, the header shall also contain the search field (FR-2). The header shall stay visible at the top of the screen while the user scrolls.
- **AC-1.2.** While the list is loaded and not empty, the system shall display, below the header and in this order: the category filter (FR-3), the featured section (FR-6), and the full list (FR-7).
- **AC-1.3.** While the list is loading, fails, or is empty, the system shall display the header title and the corresponding state from spec 001 (FR-1, FR-6, FR-7), without the search field, the category filter, or the sections.
- **AC-1.4.** The directory title shall be the page's main heading, section titles shall be second-level headings, and business names on tiles shall be third-level headings. The content below the header shall be the page's main landmark.

### FR-2: Search (US-1)

- **AC-2.1.** When the user types in the search field, the system shall show only the businesses whose name or category contains the typed text. The location summary is not searched, since a building or tower name would match many unrelated businesses.
- **AC-2.2.** The search shall ignore letter case, accents, and leading and trailing spaces. For example, "cafe" matches "Café del Río".
- **AC-2.3.** The system shall filter the list already loaded in the browser and shall not send a request to the API while the user types.
- **AC-2.4.** While the search field is empty, the system shall not filter by text.
- **AC-2.5.** The search field shall have the accessible name "Buscar negocios". While it has text, it shall show a button "Borrar búsqueda" that empties it. The browser's built-in clear control is not enough, since some browsers do not show one.

### FR-3: Category filter (US-2)

- **AC-3.1.** The system shall display one filter option per category among the loaded businesses, preceded by the option "Todos". Categories that differ only in letter case, accents, or leading and trailing spaces count as one category (the same rule as AC-4.2), so the filter and the icons follow the same rule even though categories are free text (plan 001).
- **AC-3.2.** The system shall order category options alphabetically using Spanish rules (accents and case).
- **AC-3.3.** When the user opens the directory, "Todos" shall be selected.
- **AC-3.4.** When the user selects a category option, the system shall show only businesses of that category and mark that option as selected.
- **AC-3.11.** An option's label shall be the category name from section 7 for a supported category, and otherwise the spelling used by the first business of that category in list order. Labels shall be shown in full, never cut with an ellipsis. Long labels may wrap to two lines.
- **AC-3.5.** When the user selects the option that is already selected, or selects "Todos", the system shall show businesses of every category.
- **AC-3.6.** Only one option shall be selected at a time.
- **AC-3.7.** While a category is selected and the search field has text, the system shall show only businesses that match both.
- **AC-3.8.** Each option shall display the category icon and name (FR-4), and shall expose its selected state to assistive technology.
- **AC-3.9.** On narrow screens, the options shall scroll horizontally instead of wrapping onto many lines.
- **AC-3.10.** If the list is loaded again and the selected category no longer exists, then the system shall select "Todos".

### FR-4: Category visual identity (US-3)

- **AC-4.1.** The system shall assign an icon and a color to each supported category listed in section 7.
- **AC-4.2.** The system shall match a business category to a supported category ignoring letter case, accents, and leading and trailing spaces.
- **AC-4.3.** If a business category does not match any supported category, then the system shall use the fallback icon and color, and shall still display and filter that business normally.
- **AC-4.4.** Category icons are decorative. The category name shall always be displayed as text next to them.

### FR-5: Business tile (US-3, replaces spec 001 FR-2)

- **AC-5.1.** The system shall display each business as a tile with a cover area in the category color and icon, the business name, and a line with its category and location summary.
- **AC-5.2.** The tile shall display the store type as a badge on the cover: "En tienda" with a store icon, or "Solo domicilios" with a delivery icon (spec 001 FR-3).
- **AC-5.3.** While a business has a valid WhatsApp number (spec 001 AC-2.5), the tile shall display a WhatsApp button on the cover showing the official WhatsApp glyph, used as WhatsApp's brand guidelines allow, with the accessible name "Contactar a {nombre} por WhatsApp". It opens WhatsApp as in spec 001 FR-4.
- **AC-5.4.** If a business has no valid WhatsApp number, then the tile shall not display the WhatsApp button or any text about it, and shall display the rest of the tile. The detail dialog explains it (AC-8.2).
- **AC-5.5.** The name and the category and location line may be shortened to one line each with an ellipsis. The full text is always available in the detail dialog (FR-8).
- **AC-5.6.** When the user activates any part of the tile other than the WhatsApp button, the system shall open the detail dialog for that business (FR-8).
- **AC-5.7.** The tile shall be reachable and openable with the keyboard, with the accessible name "Ver detalles de {nombre}".
- **AC-5.8.** The tile shall not display any business attribute beyond those in AC-5.1 and AC-5.2 (spec 001 AC-2.4).

### FR-6: Featured section (US-5)

- **AC-6.1.** While "Todos" is selected, the search field is empty, and at least one loaded business has a physical store, the system shall display the section "Visítalos en su tienda" with those businesses as tiles in a horizontal row.
- **AC-6.2.** While a category is selected or the search field has text, the system shall hide the featured section, so filtered results are not shown twice.
- **AC-6.3.** The featured section shall keep the order of spec 001 FR-5.

### FR-7: Full list

- **AC-7.1.** The system shall display every business that matches the current search and category filter as tiles, in the order of spec 001 FR-5.
- **AC-7.2.** The section title shall be "Todos los negocios" while "Todos" is selected, and the category name while a category is selected.
- **AC-7.3.** The system shall display the number of matching businesses under the title: "1 negocio" or "{n} negocios". Changes to that number shall be announced to screen readers.
- **AC-7.4.** The list shall show one column on phones and more columns on wider screens.
- **AC-7.5.** If no business matches the current search and category filter, then the system shall display "No encontramos negocios" and "Prueba con otra búsqueda o categoría." in place of the featured section and the full list, and the search field and category filter shall stay visible.

### FR-8: Business detail dialog (US-4)

- **AC-8.1.** When the user opens a tile, the system shall display a modal dialog with:
  - a short cover in the category color and icon
  - the full business name, as the dialog title
  - the category
  - the store type badge
  - a "Ubicación" row with the full location summary
- **AC-8.2.** While the business has a valid WhatsApp number, the dialog shall display a main button with the official WhatsApp glyph and the text "Escribir por WhatsApp" that opens WhatsApp as in spec 001 FR-4. Otherwise, it shall display "Este negocio no tiene WhatsApp registrado" in its place.
- **AC-8.3.** The dialog shall not display any business attribute beyond those in AC-8.1. Extended attributes (description, hours, website, photos) belong to a future spec.
- **AC-8.4.** On phones the dialog shall appear as a sheet anchored to the bottom of the screen. On wider screens it shall appear centered.
- **AC-8.5.** The cover shall be short enough that, on a 320 px wide screen, the location row and the WhatsApp button are visible without scrolling.
- **AC-8.6.** When the user activates the "Cerrar" button, presses Escape, or taps outside the dialog, the system shall close the dialog.
- **AC-8.7.** When the dialog closes, the screen shall return to exactly its previous state, with no overlay left behind, and keyboard focus shall return to the tile that opened it.
- **AC-8.8.** While the dialog is open, keyboard focus shall stay inside the dialog and the page behind it shall not scroll.
- **AC-8.9.** Opening and closing the dialog shall not change the page URL.

## 6. UI Text

All new Spanish text. Text reused from spec 001 keeps its exact wording.

| Where | Text |
|---|---|
| Header title | "Negocios en Alameda del Río" |
| Search field placeholder | "Buscar negocios o categorías" |
| Search field accessible name | "Buscar negocios" |
| Search clear button accessible name | "Borrar búsqueda" |
| Category filter accessible name | "Categorías" |
| "All categories" option | "Todos" |
| Featured section title and subtitle | "Visítalos en su tienda" / "Negocios con local físico" |
| Full list title | "Todos los negocios", or the selected category name |
| Result count | "1 negocio" / "{n} negocios" |
| No matching businesses | "No encontramos negocios" / "Prueba con otra búsqueda o categoría." |
| Tile accessible name | "Ver detalles de {nombre}" |
| Dialog close button accessible name | "Cerrar" |
| Dialog location row label | "Ubicación" |
| Dialog WhatsApp button | "Escribir por WhatsApp". The dialog title already names the business, so the accessible name equals the visible text (WCAG 2.5.3). |
| Dialog, no WhatsApp | "Este negocio no tiene WhatsApp registrado" |
| Reused from spec 001 | "En tienda", "Solo domicilios", "Contactar a {nombre} por WhatsApp", the WhatsApp greeting, and the loading, error, and empty texts |

## 7. Supported Categories

The table covers the 7 categories in the `dev` data plus 8 likely ones. A new category gets its own icon and color through a small change to this spec; until then it uses the fallback (AC-4.3). Category names are matched as described in AC-4.2. As in the reference, each category uses two shades of its color family: a strong one for the tile and dialog cover, and a light one behind the icon of its filter option. Each shade becomes a design token, and the exact values are set in the plan with checked contrast (NFR-6). The plan also decides whether covers are a gradient, as in the reference, or a solid color.

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

## 8. Non-Functional Requirements

Spec 001 NFR-1 to NFR-5 still apply. In addition:

- **NFR-6 Design tokens and contrast.** Every color, including category colors, shall be a design token in the Tailwind `@theme` block. All text, including the badge and any text on a cover, shall meet WCAG 2.1 AA contrast. The large cover icons are decorative and are exempt.
- **NFR-7 No new dependencies.** Icons shall be inline SVG kept in the repository (icons drawn for this project, plus the official WhatsApp glyph), and the dialog shall use the browser's native dialog element. No icon, UI component, or dialog library.
- **NFR-8 Instant filtering.** With up to a few hundred businesses, search and category results shall update with no noticeable delay on a mid-range phone.
- **NFR-9 Reduced motion.** While the user's system asks for reduced motion, the system shall not animate the dialog or the tiles.

## 9. Edge Cases

| # | Situation | Expected behavior |
|---|---|---|
| EC-1 | The search matches no business | No-results message, filters stay visible (AC-7.5) |
| EC-2 | A category is selected and the search matches nothing in it | No-results message, the category stays selected (AC-7.5) |
| EC-3 | A business category is not in section 7 | Fallback icon and color, still listed and filterable (AC-4.3) |
| EC-4 | Two businesses spell the same category differently (for example "Cafeteria" and "Cafetería") | One filter option, one icon and color (AC-3.1, AC-4.2). The label follows AC-3.11. Each tile still shows its own spelling. |
| EC-5 | A very long business name or location summary | Shortened with an ellipsis on the tile (AC-5.5), shown in full and wrapped in the dialog |
| EC-6 | A business has no valid WhatsApp number | No button on the tile (AC-5.4), message in the dialog (AC-8.2) |
| EC-7 | Many categories | Filter options scroll horizontally (AC-3.9) |
| EC-8 | The list is loaded again while a category that no longer exists is selected | "Todos" is selected (AC-3.10) |
| EC-9 | The dialog is closed in any way | No overlay is left and focus returns to the tile (AC-8.7) |
| EC-10 | Only one business is loaded | Featured section (if it has a store), one filter option plus "Todos", "1 negocio" |
| EC-11 | A category name is long (for example "Floristería") | The filter option shows it in full, wrapping to two lines if needed (AC-3.11) |

## 10. Visual Reference

The visual reference is the playground view "App de domicilios", opened at `#delivery` (see `playground/README.md` to run it):

- [`playground/src/views/DeliveryView.tsx`](../../../../playground/src/views/DeliveryView.tsx): header, search, category filter, featured section, list, and tile
- [`playground/src/BusinessDetailDialog.tsx`](../../../../playground/src/BusinessDetailDialog.tsx): detail dialog
- [`playground/src/categories.ts`](../../../../playground/src/categories.ts) and [`playground/src/icons.tsx`](../../../../playground/src/icons.tsx): category icons and colors

Plan 003 uses these files as the reference for layout, spacing, and styling. Per `playground/README.md`, the design reaches `frontend/src/` through the normal workflow and the code is never copied over. Where the playground and this spec differ, this spec wins. The playground's example data (extra businesses, descriptions, photos, websites, the photo gallery) and its leaving-the-site dialog are not part of this spec (section 11).

Known differences between the reference and this spec, as of 2026-11-02:

| Area | Reference | This spec |
|---|---|---|
| Header | "Entregar en Alameda del Río" as a button with an arrow that does nothing | Plain title "Negocios en Alameda del Río" (AC-1.1) |
| Header during loading, error, or empty | The whole view is replaced by the state | Title stays, search is hidden (AC-1.3) |
| Headings and landmarks | No main heading, no main landmark | AC-1.4 |
| Search field | No accessible name. Clear control only in browsers that provide one. | AC-2.5 |
| Category option order | Order of first appearance | Alphabetical (AC-3.2) |
| Category option labels | Cut with an ellipsis when long | Full text (AC-3.11) |
| Category spelling variants | Exact text, for both options and icon lookup | Normalized (AC-3.1, AC-4.2) |
| Unknown or missing category after reload | Selection kept, shows "no results" | Resets to "Todos" (AC-3.10) |
| Featured section | Shown with any filter. Subtitle "Negocios con local en el conjunto". | Only while browsing all (AC-6.1, AC-6.2). Subtitle "Negocios con local físico". |
| Tile WhatsApp button | Generic chat icon | Official WhatsApp glyph (AC-5.3, AC-8.2) |
| Tile without WhatsApp | Shows the text "Sin WhatsApp" | Shows nothing (AC-5.4) |
| Result count | Not announced to screen readers | Announced (AC-7.3) |
| Dialog WhatsApp button | Accessible name "Contactar a {nombre} por WhatsApp", which does not contain the visible text | Accessible name equals the visible text (section 6) |
| Motion | Hover zoom and transitions always on | Off with reduced motion (NFR-9) |

## 11. Out of Scope

- Extended business attributes in the tile or dialog (description, opening hours, website, photos), and a confirmation dialog for leaving the site. These are planned for a future spec because they need API and data model changes.
- A separate page or URL per business, and keeping the search or selected category in the URL.
- Search on the server, typo-tolerant search, and search by location summary (AC-2.1).
- Selecting more than one category, other filters, and sort options.
- A categories table, or managing categories through the product.
- Choosing a delivery address or location. The header only names the area.
- Maps, favorites, ratings, user accounts, and analytics (still out of scope from spec 001).
- Dark mode.

## 12. Approved Dependencies

None. This spec adds no package (NFR-7).

## 13. Completion Criteria

This feature is complete when all of the following are true:

1. Every functional requirement (FR-1 to FR-8) has its acceptance criteria verified by an automated test or a documented manual check.
2. Tests for spec 001 requirements that still apply keep passing unchanged. Tests for the parts this spec replaces (spec 001 FR-2 card layout and the FR-3 label presentation, section 2) are replaced by tests for FR-5 in this spec's tasks. That is a planned replacement, not a weakened test.
3. The non-functional requirements are met, including a contrast check of every category color.
4. All edge cases (EC-1 to EC-11) behave as described.
5. A user can search or pick a category, open a business, and start a WhatsApp conversation from the dialog.
