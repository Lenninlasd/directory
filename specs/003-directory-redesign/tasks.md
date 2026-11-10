# Tasks 003: Directory Redesign

- **Status:** Approved
- **Spec:** [spec.md](./spec.md) (Approved)
- **Plan:** [plan.md](./plan.md) (Approved)
- **Related:** [Tasks 001](../001-business-list/tasks.md) (milestone table shared across specs)
- **Created:** 2026-11-02

## How to work a task

Follow the AGENTS.md workflow: write the **Tests first** and see them fail, write the minimum code, run lint, typecheck, and test, then tick the checkbox. Every pull request must pass CI (002-T0).

## Milestone

| Milestone | Goal | Tasks |
|---|---|---|
| **M6** | Redesigned directory works locally against the `dev` API | 003-T1 to 003-T10 |

M6 changes only `frontend/` and does not depend on M4 or M5. It is one branch and one pull request, so `main` goes straight from the spec 001 list to the finished redesign. Tasks are ordered so the old card keeps working until 003-T8 replaces it, and the tile's "Ver detalles" button only becomes visible in the same pull request as the dialog (003-T9).

## M6: Directory redesign

- [x] **003-T1 Dialog stand-ins for tests**
  - **Covers:** enabler for FR-8 tests; plan D-4, R-1
  - **Do:** in `frontend/test/setup.ts`, define `HTMLDialogElement.prototype.showModal()` (sets `open`) and `close()` (clears `open` and fires one `close` event, does nothing if already closed), only when jsdom does not provide them. Comment points to plan R-1.
  - **Tests first:** `frontend/test/dialogStandIns.test.ts`: `showModal()` opens the dialog; `close()` closes it and fires `close` exactly once; `close()` on a closed dialog fires nothing.
  - **Done when:** tests pass and the existing suite still passes.

- [x] **003-T2 Category rules**
  - **Covers:** AC-3.1, AC-3.2, AC-3.10, AC-3.11 (labels), AC-4.2, EC-4, EC-8; plan section 3, D-7, D-8
  - **Do:** `src/features/businesses/supportedCategories.ts` with the 15 names of spec section 7 and their keys. In `src/features/businesses/directory.ts`: `normalizeForMatching`, `listCategoryOptions`, `resolveSelectedCategory`. The only imports are the `Business` type and `supportedCategories.ts`.
  - **Tests first:**
    - `normalizeForMatching`: `"  Café "` gives `"cafe"`, `"PANADERÍA"` gives `"panaderia"`, `"Peña"` gives `"pena"`.
    - `listCategoryOptions`:
      - `"Cafetería"`, `"cafeteria"`, and `" Cafeteria "` give one option labelled `"Cafetería"`.
      - Unsupported `"Óptica"` and `"optica"` give one option, labelled with the first spelling in list order.
      - Options follow Spanish order, for example "Alimentos", "Educación", "Ferretería", "Óptica", "Panadería".
      - An empty list gives `[]`.
    - `resolveSelectedCategory`: a present key is kept; an absent key gives `null`; `null` stays `null`.
  - **Done when:** tests pass. The module has no React import.

- [x] **003-T3 Search and featured rules**
  - **Covers:** AC-2.1 to AC-2.4, AC-3.4, AC-3.7, AC-6.1, AC-6.2, AC-7.1, EC-1, EC-2
  - **Do:** `filterBusinesses` and `featuredBusinesses` in `directory.ts` (plan section 3).
  - **Tests first:**
    - `filterBusinesses`:
      - "cafe" finds "Café del Río" by name; "panaderia" finds a business whose category is "Panadería".
      - "Torre 4" does not match a location summary.
      - `""` and `"   "` return every business in input order.
      - A category key keeps spelling variants of that category.
      - Category plus search keeps only businesses matching both.
      - No match gives `[]`.
    - `featuredBusinesses`:
      - With no category and a blank search, it returns only businesses with a store, in input order.
      - It returns `[]` when a category is selected, and `[]` when the search has text.
  - **Done when:** tests pass.

- [x] **003-T4 UI texts, category appearance, icons, and tokens**
  - **Covers:** spec section 6, AC-4.1, AC-4.3, AC-4.4, EC-3, NFR-6, NFR-7; plan section 5, D-7, R-4, R-5, R-7
  - **Do:**
    - **Texts:** add every text of spec section 6 to `src/strings.ts` with exact wording, including `resultCount(n)` and `viewDetailsLabel(name)`.
    - **Tokens:** add the 48 category tokens of plan section 5 to `src/index.css`, as the hex values of the listed Tailwind palette shades. Check the hex values and the v4 `@theme` syntax against the official Tailwind documentation. Add the contrast note to the header comment, and `scrollbar-gutter: stable` on `html`.
    - **Icons:** `src/features/businesses/icons.tsx` with the category icons, the fallback, and the search, close, store, delivery, and "Todos" icons, all `aria-hidden`. The WhatsApp glyph comes in 003-T5.
    - **Appearance:** `src/features/businesses/categoryAppearance.ts` with full literal class names.
  - **Tests first:**
    - `resultCount(1)` is "1 negocio" and `resultCount(4)` is "4 negocios".
    - `viewDetailsLabel("Arepas La Mona")` is "Ver detalles de Arepas La Mona".
    - Every supported key has an appearance, and an unknown key gets the fallback.
    - Every class of an appearance names that category's tokens, for example it contains `category-ferreteria-`.
  - **Done when:** tests pass, and `pnpm --filter frontend build` produces CSS that contains a category class used by `categoryAppearance.ts`.

- [x] **003-T5 Business tile and WhatsApp icon link**
  - **Covers:** AC-5.1 to AC-5.8, AC-4.4, EC-5, EC-6, NFR-9; plan D-9, D-10, R-3
  - **Do:**
    - **Glyph:** before writing code, get the WhatsApp glyph from WhatsApp's official brand resources and read its usage guidelines. If they do not allow this use, stop and report (plan R-3). Add the glyph to `icons.tsx` unmodified, with a comment naming the source.
    - **Link:** add `WhatsAppIconLink` to `WhatsAppButton.tsx`. The existing `WhatsAppButton` stays as is until 003-T9.
    - **Components:** `CategoryCover.tsx`, `StoreTypeBadge.tsx`, and `BusinessTile.tsx` with an `onOpen(trigger: HTMLElement)` prop. Motion only through `motion-safe:` variants.
  - **Tests first (`test/features/businesses/BusinessTile.test.tsx`, the replacement for `BusinessCard.test.tsx`):**
    - The name is an `h3`; the category and location summary are shown.
    - "En tienda" or "Solo domicilios" appears according to `hasPhysicalStore`.
    - With a number: a link with the `href` from `buildWhatsappUrl`, accessible name "Contactar a {nombre} por WhatsApp", `target="_blank"`, and `rel="noopener noreferrer"`.
    - Without a number: no link and no WhatsApp text, and the rest of the tile renders.
    - No other business fields are rendered (same check as `BusinessCard.test.tsx`).
    - The button "Ver detalles de {nombre}" calls `onOpen` with that button; clicking the WhatsApp link does not call `onOpen`.
  - **Done when:** tests pass, and `BusinessCard.test.tsx` still passes (it is removed in 003-T8).

- [x] **003-T6 Search field and category filter**
  - **Covers:** AC-2.5, AC-3.3 to AC-3.9, AC-3.11, EC-7, EC-11
  - **Do:** `SearchInput.tsx` and `CategoryFilter.tsx` (plan section 4), as controlled components with no state of their own.
  - **Tests first:**
    - **Search field:**
      - It has the accessible name "Buscar negocios" and the placeholder "Buscar negocios o categorías".
      - "Borrar búsqueda" is absent while empty and present with text.
      - Clicking "Borrar búsqueda" calls `onChange("")` and focuses the input.
    - **Filter:**
      - A `nav` named "Categorías", with "Todos" first and pressed when the selected key is `null`.
      - Options appear in the given order, with their full label text.
      - Clicking an option calls `onSelect(key)`, and clicking the selected option calls `onSelect(null)`.
      - Exactly one option is pressed.
  - **Done when:** tests pass.

- [x] **003-T7 Featured section, results, and no results**
  - **Covers:** FR-6 (display), AC-7.1 to AC-7.5, EC-1, EC-10
  - **Do:** `FeaturedSection.tsx`, `BusinessResults.tsx`, `NoResults.tsx` (plan section 4).
  - **Tests first:**
    - **Featured section:** an `h2` "Visítalos en su tienda" with the subtitle "Negocios con local físico" and tiles in the given order. It renders nothing for `[]`.
    - **Results:**
      - The `h2` is "Todos los negocios" with no category, and the category label when one is given.
      - The count reads "1 negocio" or "3 negocios" inside a `status` element.
      - Tiles appear in the given order.
      - An empty list shows "No encontramos negocios" and "Prueba con otra búsqueda o categoría.".
  - **Done when:** tests pass.

- [x] **003-T8 Directory page and App**
  - **Covers:** AC-1.1 to AC-1.4, AC-3.10, FR-2, FR-3, FR-6, and FR-7 together, EC-1, EC-2, EC-8, EC-10; spec 001 FR-1, FR-6, FR-7; spec 003 completion criterion 2
  - **Do:**
    - **New and changed files:** `DirectoryHeader.tsx` and `Directory.tsx` (plan section 4, D-1 to D-3). The loading, error, and empty markup moves unchanged from `BusinessList.tsx`. `App.tsx` renders `<Directory />`.
    - **Tests moved:** `BusinessList.test.tsx` becomes `Directory.test.tsx`, keeping its assertions.
    - **Removed:** `BusinessList.tsx`, `BusinessCard.tsx`, and `BusinessCard.test.tsx` (replaced in 003-T5).
    - **Opening tiles:** tiles get an `onOpen` that stores the open business id and the opener. The dialog itself comes in 003-T9, in the same pull request.
  - **Tests first (mocked API, fresh `QueryClient`):**
    - **Moved from spec 001:** the existing tests, changed only where "card" becomes "tile inside the results section" (plan section 8).
    - **Header:** the `h1` "Negocios en Alameda del Río" shows in every state. The search field is absent while loading, on error, and when empty.
    - **Filtering:**
      - Typing filters the results and updates the count.
      - Picking a category filters the results and titles the section.
      - With no results, the search field and the filter stay visible.
    - **Featured section:** shown with no filter, hidden with a category or a search.
    - **Reload:** a reload that drops the selected category leaves "Todos" pressed and all businesses shown.
    - **`App.test.tsx`:** the `main` landmark and the `h1`.
  - **Done when:** tests pass, and the page works in the browser against the `dev` API through the Vite proxy.

- [x] **003-T9 Business detail dialog**
  - **Covers:** AC-8.1 to AC-8.9, EC-6, EC-9; plan D-4, D-5, R-2, R-5
  - **Do:**
    - **WhatsApp button:** change `WhatsAppButton` into the dialog variant: glyph plus "Escribir por WhatsApp", no `aria-label`.
    - **Dialog:** `BusinessDetailDialog.tsx` (plan section 4).
    - **In `Directory.tsx`:**
      - Look up the open business by id in the query data.
      - Add `overflow-hidden` to `html` while the dialog is open.
      - Focus the opener when it closes.
  - **Tests first (with the 003-T1 stand-ins):**
    - **Content:** opening a tile shows a dialog named after the business, with its category, badge, "Ubicación", and the full location summary.
    - **WhatsApp:**
      - With a number, the button's accessible name is exactly "Escribir por WhatsApp" and its `href` is the WhatsApp URL.
      - Without a number, it shows "Este negocio no tiene WhatsApp registrado".
      - No other business fields are rendered.
    - **Closing:**
      - "Cerrar" closes it.
      - A click on the dialog element itself closes it; a click inside the content does not.
      - After closing, no dialog is open and focus is on the opener.
    - **Page around it:**
      - `html` has `overflow-hidden` only while the dialog is open.
      - `window.location.href` does not change.
      - A reload that removes the business closes the dialog.
  - **Done when:** tests pass, and opening and closing works in the browser against the `dev` API.

- [x] **003-T10 Manual checks**
  - **Covers:** plan section 8 manual checks 1 to 7; spec 003 completion criteria
  - **Do:** run the seven manual checks of plan section 8 with `pnpm --filter frontend dev` against the `dev` API, and again on the `dev` URL once 002-T8 has deployed it. Record the date, browser, device, and result of each check in the "Verification log" section below.
  - **Done when:** all seven pass, or each failure has an issue or a spec change proposal.

## Verification log

Local run with `pnpm --filter frontend dev` against the `dev` API, reported by the project owner in chat on 2026-11-10. Browser and device were not recorded.

| # | Check (plan section 8) | Date | Result |
|---|---|---|---|
| 1 | Dialog | 2026-11-10 | Pass |
| 2 | 320 px | 2026-11-10 | Pass |
| 3 | Header and filter | 2026-11-10 | Pass |
| 4 | Screen reader | 2026-11-10 | Pass |
| 5 | Reduced motion | 2026-11-10 | Pass |
| 6 | Instant filtering (about 300 businesses) | 2026-11-10 | Pass. No visible delay while typing, reported by the project owner. |
| 7 | Contrast | 2026-11-10 | Pass |

The seven checks were also run on the `dev` URL and passed, reported by the project owner in chat on 2026-11-10.
