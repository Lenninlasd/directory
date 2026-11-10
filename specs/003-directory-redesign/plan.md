# Plan 003: Directory Redesign

- **Status:** Approved (approved by the project owner in chat on 2026-11-02)
- **Spec:** [spec.md](./spec.md) (Approved)
- **Created:** 2026-11-02

Scope: frontend only. The API, data model, backend, migrations, and infrastructure do not change (spec section 2).

## 1. Technical Approach

The page still loads every active business with one request through the existing `useBusinesses` hook. Search, the category filter, and the featured section are computed in the browser from the query data by pure functions. A `Directory` component owns the UI state and composes the header, the content, and the detail dialog.

```
App
  Directory                         useBusinesses() + UI state (search text, category key, open business id)
    DirectoryHeader                 h1 title; SearchInput only while the list is loaded and not empty
    main
      loading / error / empty       spec 001 states, unchanged markup
      or
      CategoryFilter                options from listCategoryOptions()
      FeaturedSection               featuredBusinesses()
      BusinessResults               filterBusinesses(), count, or NoResults
        BusinessTile                cover, badge, WhatsApp icon link, stretched "Ver detalles" button
    BusinessDetailDialog            native <dialog>, business looked up by id in the query data

directory.ts (pure)                 normalizeForMatching, listCategoryOptions, filterBusinesses,
                                    featuredBusinesses, resolveSelectedCategory
```

The visual reference is the playground view listed in spec section 10, including its known differences table.

## 2. Data Model and API

No change. `Business` in `src/api/businesses.ts`, `fetchBusinesses()`, `BUSINESSES_QUERY_KEY`, `useBusinesses()`, and `createQueryClient()` stay as they are (plan 001 section 5).

## 3. Business Rules (`src/features/businesses/directory.ts`)

Framework-free functions, no React imports. Every list keeps the input order, which is the API order of spec 001 FR-5.

```
normalizeForMatching(text)
  NFD, remove diacritics (\p{Diacritic}), lowercase, trim

listCategoryOptions(businesses) -> { key, label }[]          AC-3.1, AC-3.2, AC-3.11
  key   = normalizeForMatching(category)
  label = the section 7 name whose key matches, otherwise the first spelling in list order
  one option per key, sorted by label with Intl.Collator('es')

filterBusinesses(businesses, { searchText, categoryKey })  AC-2.1 to AC-2.4, AC-3.4, AC-3.7
  term = normalizeForMatching(searchText)
  keep when (categoryKey is null or key of category = categoryKey)
        and (term is empty or normalized name contains term or normalized category contains term)

featuredBusinesses(businesses, { searchText, categoryKey }) AC-6.1, AC-6.2
  [] unless categoryKey is null and searchText is blank
  otherwise businesses with hasPhysicalStore

resolveSelectedCategory(options, categoryKey) -> key or null  AC-3.10
  null when categoryKey is not among the option keys
```

`src/features/businesses/supportedCategories.ts` exports the 15 names of spec section 7 as a `const` array, with their keys. It is pure data, shared by `directory.ts` (labels) and `categoryAppearance.ts` (icons and colors).

## 4. Frontend Modules (`frontend/`)

| File | Change | Responsibility |
|---|---|---|
| `src/App.tsx` | Changed | Renders `<Directory />`. The `main` landmark moves into `Directory`, since the header sits outside it (AC-1.4). |
| `src/features/businesses/Directory.tsx` | New | Calls `useBusinesses()`. Holds `searchText`, `selectedCategoryKey`, and `openBusinessId` with `useState`. Derives options, results, and featured lists with the functions of section 3 (`useMemo`). Renders the header, `main` with either the spec 001 state or the content, and the dialog. Keeps a ref to the element that opened the dialog (D-5). |
| `src/features/businesses/BusinessList.tsx` | Removed | Its loading, error, and empty markup moves unchanged into `Directory.tsx`. |
| `src/features/businesses/DirectoryHeader.tsx` | New | Sticky `header` with the `h1` "Negocios en Alameda del Río" and, when given, the search field (AC-1.1, AC-1.3). |
| `src/features/businesses/SearchInput.tsx` | New | `input type="search"` with `aria-label="Buscar negocios"` and the placeholder. While it has text, a `button` "Borrar búsqueda" empties it and returns focus to the input (AC-2.5). |
| `src/features/businesses/CategoryFilter.tsx` | New | `nav` labelled "Categorías" with a `button` per option ("Todos" first) and `aria-pressed`. Selecting the selected option selects "Todos" (AC-3.3 to AC-3.9). Horizontal scroll; labels wrap up to two lines and never truncate (AC-3.11). |
| `src/features/businesses/FeaturedSection.tsx` | New | `section` with `h2` "Visítalos en su tienda", subtitle, and a horizontal row of tiles with scroll snap (FR-6). |
| `src/features/businesses/BusinessResults.tsx` | New | `section` with `h2` (category label or "Todos los negocios"), the count in an element with `role="status"` (AC-7.3), and the tile grid: one column, two from `sm`, three from `lg` (AC-7.4). Shows `NoResults` when empty (AC-7.5). |
| `src/features/businesses/NoResults.tsx` | New | The two no-results texts. |
| `src/features/businesses/BusinessTile.tsx` | New (replaces `BusinessCard.tsx`) | `article` with a stretched `button` "Ver detalles de {nombre}" covering the tile, the cover, the badge, the WhatsApp icon link above the button, the `h3` name, and the category and location line, each cut to one line (FR-5, D-9). |
| `src/features/businesses/BusinessCard.tsx` | Removed | Replaced by `BusinessTile.tsx`. |
| `src/features/businesses/StoreTypeBadge.tsx` | New | Store or delivery icon plus "En tienda" or "Solo domicilios", used by the tile and the dialog (AC-5.2, AC-8.1). |
| `src/features/businesses/CategoryCover.tsx` | New | Gradient cover with the large faded icon and the centered icon, used by the tile and the dialog (AC-5.1, AC-8.1). |
| `src/features/businesses/WhatsAppButton.tsx` | Changed | Two exports: `WhatsAppIconLink` for the tile (glyph only, accessible name "Contactar a {nombre} por WhatsApp", AC-5.3) and `WhatsAppButton` for the dialog (glyph plus "Escribir por WhatsApp", no `aria-label`, AC-8.2). Both keep `target="_blank"` and `rel="noopener noreferrer"`. |
| `src/features/businesses/BusinessDetailDialog.tsx` | New | Native `<dialog>` opened with `showModal()` when a business id is set (FR-8, D-4). Bottom sheet on phones, centered from `sm` (AC-8.4). Cover at 2:1, capped in height (AC-8.5). Closes on "Cerrar", Escape (native `cancel`), and a click whose target is the dialog itself (AC-8.6). Handles `onClose` only when `event.target === event.currentTarget` (D-4). |
| `src/features/businesses/categoryAppearance.ts` | New | `Record<supported key, { icon, coverClass, tintClass, iconOnTintClass }>` plus the fallback. Class names are full literals so Tailwind detects them (R-4). |
| `src/features/businesses/icons.tsx` | New | Inline SVG icons: the 15 category icons and the fallback tag, plus search, close, store, delivery, "Todos" grid, and the official WhatsApp glyph (NFR-7, D-10). |
| `src/features/businesses/directory.ts`, `supportedCategories.ts` | New | Section 3. |
| `src/strings.ts` | Changed | Adds every text of spec section 6. `resultCount(n)` and `viewDetailsLabel(name)` are functions, like `whatsappButtonLabel`. Existing strings stay. |
| `src/index.css` | Changed | Category tokens (section 5), the `whatsapp-glyph` token (D-10), and `scrollbar-gutter: stable` on `html` (R-5). Existing tokens stay. |
| `test/setup.ts` | Changed | `showModal()` and `close()` stand-ins for jsdom (D-4, R-1). |

Notes:

- The header is `sticky top-0` on every screen size, with `bg-surface` and a bottom border.
- Business data is never copied into state. The dialog receives the id and reads the business from `useBusinesses()` data. If a reload removes the business, the dialog closes (AC-8.7).
- While the dialog is open, `Directory` adds the `overflow-hidden` class to the `html` element and removes it on close (AC-8.8).
- Motion uses `motion-safe:` variants only (tile hover zoom, color transitions), so reduced motion turns it off (NFR-9). The dialog has no open or close animation.
- Neutral colors use the existing tokens: `surface`, `canvas`, `border`, `ink`, `ink-muted`, `whatsapp`. The reference's `stone-*` colors map to them.

## 5. Category Design Tokens

Three tokens per category in the `@theme` block of `src/index.css`: `--color-category-<slug>-from` and `-to` for the cover gradient, and `-tint` for the background of the filter option icon. The filter option icon uses the `-to` color. Values are the hex of these Tailwind default palette shades, taken from the reference `playground/src/categories.ts`:

| Category | Slug | From | To | Tint |
|---|---|---|---|---|
| Alimentos | `alimentos` | lime-500 | emerald-700 | lime-100 |
| Belleza | `belleza` | pink-400 | fuchsia-600 | pink-100 |
| Cafetería | `cafeteria` | amber-600 | amber-900 | amber-100 |
| Comida | `comida` | orange-400 | red-500 | orange-100 |
| Deportes | `deportes` | emerald-400 | teal-700 | emerald-100 |
| Educación | `educacion` | sky-400 | indigo-600 | sky-100 |
| Farmacia | `farmacia` | red-400 | rose-600 | red-100 |
| Ferretería | `ferreteria` | slate-500 | slate-700 | slate-100 |
| Floristería | `floristeria` | fuchsia-300 | rose-500 | fuchsia-100 |
| Lavandería | `lavanderia` | cyan-400 | blue-600 | cyan-100 |
| Mascotas | `mascotas` | violet-400 | purple-600 | violet-100 |
| Mercado | `mercado` | green-500 | green-800 | green-100 |
| Panadería | `panaderia` | yellow-400 | orange-500 | yellow-100 |
| Postres | `postres` | rose-300 | pink-500 | rose-100 |
| Tecnología | `tecnologia` | zinc-600 | zinc-900 | zinc-100 |
| Fallback | `other` | teal-500 | teal-700 | teal-100 |

Contrast (NFR-6): no text is drawn on a category color. Cover and option icons are decorative and are always next to the category name as text (AC-4.4). The only text on a cover is the store type badge, drawn in `ink` on a `surface` pill, already checked in plan 001 (16.0:1 on canvas, higher on surface). The `index.css` header comment records this.

## 6. Technical Decisions

| # | Decision | Alternatives discarded and why |
|---|---|---|
| D-1 | Search and filters run in the browser over the loaded list, in pure functions memoized in `Directory` | Search on the server: out of scope (spec section 11), and a request per keystroke breaks AC-2.3 |
| D-2 | UI state in `Directory` with `useState`: search text, selected category key, open business id. Ids, not business objects. | URL state: out of scope. A global store: forbidden by AGENTS.md. Copying business objects into state: mirrors query data (AGENTS.md). |
| D-3 | AC-3.10 is derived at render time with `resolveSelectedCategory()`, with no effect | A `useEffect` that resets the state: an extra render and a moment with an invalid selection |
| D-4 | Native `<dialog>` with `showModal()`. `onClose` only acts when the event comes from this dialog. Tests use `showModal()` and `close()` stand-ins in `test/setup.ts`. | A dialog library: NFR-7. A hand-made `div` modal: has to rebuild the focus trap, the inert background, and Escape. The `onClose` guard is needed because React passes `close` events up through the component tree (found in the playground). |
| D-5 | On close, focus goes explicitly to the element that opened the dialog, kept in a ref | The browser's built-in focus restore: Safari does not focus a button on click, so focus would go to the page (AC-8.7) |
| D-6 | Gradient covers, three tokens per category (section 5) | Solid covers: fewer tokens, but further from the approved reference |
| D-7 | Categories are matched by a normalized key. Supported names live in a pure module, and appearance is a `Record` over the supported keys, so TypeScript reports a missing entry. | A lookup by exact text: breaks AC-4.2. Appearance in the pure module: puts React icons and Tailwind classes in business logic. |
| D-8 | Matching removes diacritics, so "n" also matches "ñ" ("pena" finds "Peña") | Keeping "ñ" distinct: stricter, but people without a "ñ" key could not find those businesses |
| D-9 | Tile: a stretched `button` under the content, with the WhatsApp link stacked above it | The whole tile as a `button`: a link cannot be nested inside a button. The tile as a link: there is no URL to go to (spec section 11). |
| D-10 | The WhatsApp glyph is an inline SVG of `Digital_Glyph_White_RGB_2026.svg` from the WhatsApp Brand Resource Center logo pack (meta.com, downloaded 2026-11-10), with its paths and white fill unmodified. It is always shown on a `whatsapp` background (5.0:1): a round button on the tile and the dialog button. Its fill is the token `whatsapp-glyph` (`#ffffff`, the brand's white, never changed). In the dialog it is a separate element next to "Escribir por WhatsApp" and never replaces the word. Changed 2026-11-10, approved by the project owner in chat. | An icon library: NFR-7. A hand-drawn or third-party copy: the guidelines allow only the official files. A recolored glyph (the earlier "`whatsapp` on `surface`" option): the guidelines say "You shouldn't modify any colors in our logos". The official Green glyph on white: about 2.0:1, below the WCAG 1.4.11 minimum of 3:1. |
| D-11 | Component tests use `fireEvent` from Testing Library, like the existing tests | `@testing-library/user-event`: listed in spec 001 section 8a but not installed, and not needed for these interactions |

## 7. Dependencies

None (spec section 12).

## 8. Testing Strategy

Tests are written before code, per task.

| Layer | What is tested | Tool | Covers |
|---|---|---|---|
| `directory.ts` | Accents, case, and spaces ignored. Name and category matched, location not. Category variants grouped, label from section 7 or first spelling, Spanish alphabetical order. Category and search combined. Featured only with no filter, stores only. Unknown selected key resolves to `null`. Input order kept everywhere. | vitest | FR-2, FR-3, FR-6, AC-4.2, AC-7.1, EC-2, EC-4, EC-8 |
| `strings.ts` | `resultCount` singular and plural | vitest | AC-7.3 |
| `categoryAppearance.ts` | Every supported key has an appearance. Unknown key gets the fallback. | vitest | AC-4.1, AC-4.3, EC-3 |
| `SearchInput` | Accessible name, clear button appears only with text, empties the field, focus returns to the input | vitest + Testing Library | AC-2.5 |
| `CategoryFilter` | "Todos" first and pressed by default, `aria-pressed`, selecting the selected option selects "Todos", full labels | vitest + Testing Library | AC-3.3 to AC-3.8, AC-3.11 |
| `BusinessTile` | Name, category, location. Badge labels. WhatsApp link URL and accessible name. No link and no text without a number. No other fields. "Ver detalles de {nombre}" button opens. | vitest + Testing Library | FR-5, EC-6 |
| `BusinessDetailDialog` | Content and full texts. WhatsApp button accessible name equals its visible text. No-WhatsApp message. "Cerrar" and a click on the backdrop close it. After closing, no open dialog remains and focus is on the opener. | vitest + Testing Library, dialog stand-ins | FR-8 except native Escape and focus trap, EC-9 |
| `Directory` | Spec 001 loading, error, retry, empty, and no-technical-details tests, moved from `BusinessList.test.tsx` with the same assertions. Title always shown and search hidden in those states. Typing and picking a category filter the results. No-results state keeps filters visible. Featured hidden with any filter. Count in a `status` element. A reload without the selected category selects "Todos". | vitest + Testing Library, mocked API, fresh `QueryClient` | FR-1, FR-2, FR-3, FR-6, FR-7, EC-1, EC-2, EC-8, EC-10 |
| `App` | `main` landmark and `h1` | vitest + Testing Library | AC-1.4 |

Existing tests:

| File | Outcome |
|---|---|
| `test/features/businesses/BusinessCard.test.tsx` | Replaced by `BusinessTile.test.tsx` (spec 003 completion criterion 2). The same rules are kept: fields, labels, WhatsApp URL and name, no link without a number, no other fields. The assertion on the visible text "WhatsApp" goes away, since the tile button is glyph-only (AC-5.3). |
| `test/features/businesses/BusinessList.test.tsx` | Moved to `Directory.test.tsx`. The loading, error, retry, empty, and no-technical-details tests keep their assertions. "One card per business in API order" checks tiles inside the results section, since a store business can also appear in the featured row. |
| `test/App.test.tsx` | Kept, plus the `h1` check |
| `useBusinesses`, `whatsapp`, `api/businesses` tests | Unchanged |

Documented manual checks, in Chrome, Safari, and Firefox, on a phone and on desktop:

1. **Dialog (AC-8.4 to AC-8.8):** sheet on a phone and centered on desktop; Escape and a tap outside close it; Tab stays inside; the page does not scroll behind it; focus returns to the tile, also in Safari after a mouse click.
2. **320 px (AC-8.5, NFR-2):** the dialog shows the location row and the WhatsApp button without scrolling; tiles and filter options do not overflow.
3. **Header and filter (AC-1.1, AC-3.9, AC-3.11):** the header stays visible while scrolling; options scroll sideways; "Floristería" shows in full.
4. **Screen reader (AC-1.4, AC-7.3):** headings and landmark announced; the count is announced when it changes.
5. **Reduced motion (NFR-9):** with the system setting on, no zoom or transitions.
6. **Instant filtering (NFR-8):** with about 300 businesses (playground example data multiplied, or a long `dev` seed), typing shows no visible delay on a mid-range phone.
7. **Contrast (NFR-6):** the badge and every text meet AA; category colors carry no text.

## 9. Risks

| # | Risk | Mitigation |
|---|---|---|
| R-1 | jsdom 30 has `HTMLDialogElement` but no `showModal()` or `close()` (checked 2026-11-02), so dialog tests cannot run as is | Stand-ins in `test/setup.ts` that set `open` and fire `close`. Native behavior (Escape, focus trap, backdrop) is covered by manual check 1. |
| R-2 | Focus does not return to the tile in Safari | D-5, with a test and manual check 1 |
| R-3 | WhatsApp's brand guidelines limit how the glyph can be shown | Checked 2026-11-10 on the meta.com WhatsApp brand page: only official files, no color changes, no combining with other words, never more prominent than the content. The owner downloaded the logo pack and accepted its terms. Use the official White glyph unmodified (D-10). If the guidelines rule out a use, stop and propose a spec change. |
| R-4 | Tailwind only generates classes it finds as full text, so built class names would silently have no style | `categoryAppearance.ts` lists every class as a full literal. Its test checks that every supported key has one. |
| R-5 | Adding `overflow-hidden` to `html` removes the scrollbar on desktop and shifts the page sideways | `scrollbar-gutter: stable` on `html` in `index.css` |
| R-6 | The count is announced on every keystroke | `role="status"` is polite, so screen readers wait for a pause. Manual check 4. |
| R-7 | `index.css` grows by 48 tokens | Grouped under one comment, ordered as section 5 |

## 10. Constitution Check

All six principles are met:

1. **Stack Simplicity:** no new package (section 7). Native dialog, inline SVG.
2. **Spec-Code Alignment:** every module traces to an FR, NFR, or edge case of spec 003. The playground is only a visual reference and no code is copied from it.
3. **Separation of Concerns:** search, filter, and category rules are in `directory.ts` and `supportedCategories.ts` with no React import. Components only render and hold UI state.
4. **Testing Standard:** tests first for every business rule and component (section 8). Replaced tests are listed, none are weakened.
5. **Data Persistence:** no schema or data change.
6. **Language Standard:** English code and identifiers; Spanish only in `src/strings.ts`.
