# Spec 001: Business Directory Listing

- **Status:** Approved
- **Created:** 2026-10-23
- **Last updated:** 2026-10-24 (business data loading clarified, section 8a extended, database access through the RDS Data API)

## 1. Context and Objective

**Context.** Alameda del Río (Barranquilla, Colombia) is a residential area with many small businesses: shops inside shopping centers and home-based businesses that sell through delivery. Today there is no single place where people can discover them, so they depend on word of mouth and scattered chat groups.

**Objective.** Provide a public directory where anyone can browse the businesses of Alameda del Río and start a WhatsApp conversation with one of them in a few taps.

**Why it matters.** It reduces the effort for residents and visitors to find local businesses, and it is the foundation for every later directory feature.

**Success looks like.** A person opens the directory, browses the businesses, and reaches a WhatsApp chat with a business of their choice without creating an account.

## 2. Users

| User | Description | Needs in this MVP |
|---|---|---|
| Resident | Lives in Alameda del Río | Discover nearby businesses and contact them |
| Visitor | Does not live in the area | Discover businesses and contact them |

The primary device is a mobile phone; desktop browsers are supported as a secondary device.

## 3. General Constraints

- No account or login is required to view the directory.
- The directory does not collect personal data from visitors. It only shows contact information for active businesses.
- All interface text (buttons, labels, loading, empty, and error messages) is in Spanish. This spec, the code, and the API field names remain in English (per `docs/constitution.md`, principle 6).

## 4. User Stories

- **US-1.** As a resident, I want to see a list of businesses in my area, so that I can discover options I did not know about.
- **US-2.** As a visitor, I want to contact a business through WhatsApp from its card, so that I can ask questions or place an order quickly.
- **US-3.** As a user, I want to tell whether a business is in-store or delivery only, so that I know what to expect before contacting it.
- **US-4.** As a user, I want to see the newest businesses first, so that I notice recent additions.
- **US-5.** As a user, I want clear feedback and a way to retry when something fails, so that I am not left with a blank or broken screen.

## 5. Functional Requirements

Acceptance criteria use EARS notation (Easy Approach to Requirements Syntax).

### FR-1: Display the list of active businesses (US-1)

- **AC-1.1.** When a user opens the directory, the system shall display all active businesses in a single list, loaded with one request.
- **AC-1.2.** The system shall never display businesses that are marked as inactive.
- **AC-1.3.** While the list is loading, the system shall display a loading indicator with the text "Cargando…".

### FR-2: Business card content (US-1, US-3)

- **AC-2.1.** The system shall display, for each business, a card with its name, category, short location summary, and store type indicator.
- **AC-2.2.** While a business has a valid WhatsApp number, the system shall display a WhatsApp contact button on its card.
- **AC-2.3.** If a business has an invalid WhatsApp number, then the system shall not display the WhatsApp contact button on its card and shall still display the rest of the card.
- **AC-2.4.** The system shall not display any other business attribute on the card in this MVP.
- **AC-2.5.** A WhatsApp number is valid when, after removing spaces, dashes, parentheses, and a leading `+`, it has 8 to 15 digits and does not start with `0`. Numbers are stored with the country code (for example `573001234567`).

### FR-3: Store type indicator (US-3)

- **AC-3.1.** While a business operates from a physical store, the system shall display the label "En tienda" on its card.
- **AC-3.2.** While a business does not operate from a physical store, the system shall display the label "Solo domicilios" on its card.

### FR-4: Contact through WhatsApp (US-2)

- **AC-4.1.** When a user activates the WhatsApp button of a business, the system shall open a WhatsApp conversation addressed to that business's WhatsApp number, with a generic prefilled greeting in Spanish that does not include the business name: "Hola, te encontré en el directorio de Alameda del Río".
- **AC-4.2.** If WhatsApp is not installed on the user's device, then the system shall let the user continue the conversation through WhatsApp's web experience.

### FR-5: Ordering (US-4)

- **AC-5.1.** The system shall order businesses from the most recently created to the least recently created.
- **AC-5.2.** If two businesses share the same creation time, then the system shall order them alphabetically by business name, and then by business id, so the order is always the same.

### FR-6: Loading failures (US-5)

- **AC-6.1.** If loading the list fails, then the system shall automatically retry the load up to 2 times, about 1 second apart.
- **AC-6.2.** If all automatic retries fail, then the system shall display the error message "No pudimos cargar los negocios. Inténtalo de nuevo." and a "Reintentar" button.
- **AC-6.3.** When the user activates the "Reintentar" button, the system shall attempt to load the list again.
- **AC-6.4.** The system shall not display technical error details to the user.

### FR-7: Empty state (US-5)

- **AC-7.1.** If there are no active businesses, then the system shall display the message "Aún no hay negocios disponibles".

## 6. Non-Functional Requirements

- **NFR-1 Performance.** On a typical mobile connection, the list should be visible within about 3 seconds.
- **NFR-2 Responsiveness.** The directory shall be designed mobile-first, usable on small screens (down to 320 px wide), and shall also work on desktop browsers.
- **NFR-3 Accessibility.** The directory shall meet WCAG 2.1 level AA, including keyboard operation, accessible names for every button, and sufficient text contrast.
- **NFR-4 Resilience.** Temporary failures shall not leave the user on a blank screen. The user shall always see content, a loading state, an empty state, or an error with a retry action.
- **NFR-5 Data freshness.** Changes to business data shall appear the next time the list is loaded. Real-time updates are not required.

## 7. Edge Cases

| # | Situation | Expected behavior |
|---|---|---|
| EC-1 | There are no active businesses | Empty state message (FR-7) |
| EC-2 | The load fails | Two automatic retries, then error with "Reintentar" (FR-6) |
| EC-3 | The user loses connection while loading | Treated as a loading failure (FR-6) |
| EC-4 | A business name or location summary is very long | The card stays readable and does not break the layout |
| EC-5 | A business has an invalid WhatsApp number | The card is shown without the WhatsApp button (AC-2.3) |
| EC-6 | Two businesses have the same creation time | Alphabetical by name, then by id (AC-5.2) |

## 8. Out of Scope

- Pagination, "load more", and infinite scroll. The directory returns all active businesses in one request. This will be revisited when the number of businesses makes it necessary.
- Search by name or any other text.
- Filters, including by category, and any sort option other than the fixed order.
- A detail page for each business.
- Extended business attributes: description, logo, cover image, exact address, coordinates, email, Instagram, catalog link, opening hours, home delivery flag, payment methods, and verification status.
- Creating, editing, or removing businesses through the product. The team loads and changes businesses through reviewed, versioned SQL data migrations applied by the deployment process (spec 002 FR-7), not through the product.
- Business owner accounts and ownership claims.
- User accounts, login, favorites, reviews, and ratings.
- Maps and directions.
- Interface languages other than Spanish, and any translation or language-switching approach. It may be considered in a future spec.
- Analytics and usage tracking.

## 8a. Approved Dependencies

Approved by the project owner on 2026-10-23 and extended on 2026-10-24, in addition to the fixed stack. Infrastructure-related packages are approved in spec 002 section 9. Each is the minimum needed to build and test this feature.

| Package | Where | Why |
|---|---|---|
| `express`, `serverless-http` | backend | Express on Lambda; `serverless-http` converts API Gateway events |
| `@aws-sdk/client-rds-data` | backend | Queries Aurora through the RDS Data API (spec 002, I-4) |
| `typescript`, `eslint` with `typescript-eslint`, `vitest` | root / both | Strict typing, the `lint` script, and one shared test runner |
| `vite`, `@vitejs/plugin-react` | frontend | Build and dev server |
| `tailwindcss`, `@tailwindcss/vite` | frontend | Styling |
| `@tanstack/react-query` | frontend | Server state |
| `react`, `react-dom` | frontend | The UI library of the fixed stack |
| `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | frontend (dev) | Component and hook tests, realistic user interaction, and readable DOM assertions |
| `@types/node`, `@types/express`, `@types/react`, `@types/react-dom` | dev | Type definitions for strict TypeScript |
| `eslint-plugin-react-hooks` | frontend (dev) | Lint rules for correct hook usage |

Exact package names are confirmed against official documentation in the first task that uses them.

## 9. Completion Criteria

This feature is complete when all of the following are true:

1. Every functional requirement (FR-1 to FR-7) has its acceptance criteria verified by an automated test or a documented manual check.
2. The non-functional requirements are met.
3. All edge cases (EC-1 to EC-6) behave as described.
4. A user can open the directory, browse the businesses, and start a WhatsApp conversation with one of them.
5. This spec is marked `Status: Approved` by a human before planning starts.

## 10. Open Questions

None.
