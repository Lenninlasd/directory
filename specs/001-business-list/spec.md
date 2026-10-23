# Spec 001: Business Directory Listing

- **Status:** Draft
- **Created:** 2026-10-23
- **Last updated:** 2026-10-23 (all open questions resolved)
- **Language:** English (per `docs/constitution.md`, principle 6)

## 1. Context and Objective

**Context.** Alameda del Río (Barranquilla, Colombia) is a residential area with many small businesses: shops inside shopping centers and home-based businesses that sell through delivery. Today there is no single place where people can discover them, so they depend on word of mouth and scattered chat groups.

**Objective.** Provide a public directory where anyone can browse the businesses of Alameda del Río and start a WhatsApp conversation with one of them in a few taps.

**Why it matters.** It reduces the effort for residents and visitors to find local businesses, and it gives business owners visibility without requiring them to manage anything yet. It is also the foundation for every later directory feature.

**Success looks like.** A person opens the directory, scrolls through the businesses, and reaches a WhatsApp chat with a business of their choice without creating an account.

## 2. Users

| User | Description | Needs in this MVP |
|---|---|---|
| Resident | Lives in Alameda del Río | Discover nearby businesses and contact them |
| Visitor | Does not live in the area | Discover businesses and contact them |
| Business owner (view only) | Owns a listed business | See how their business appears; cannot create, edit, or claim anything |

No user needs an account or login in this MVP. The primary device is a mobile phone; desktop browsers are supported as a secondary device.

## 3. User Stories

- **US-1.** As a resident, I want to see a list of businesses in my area, so that I can discover options I did not know about.
- **US-2.** As a visitor, I want to contact a business through WhatsApp from its card, so that I can ask questions or place an order quickly.
- **US-3.** As a user, I want to tell whether a business is in-store or delivery only, so that I know what to expect before contacting it.
- **US-4.** As a user, I want the list to keep loading as I scroll, so that I can browse many businesses without extra steps.
- **US-5.** As a user, I want to see the newest businesses first, so that I notice recent additions.
- **US-6.** As a user, I want clear feedback and a way to retry when something fails, so that I am not left with a blank or broken screen.
- **US-7.** As a business owner, I want to see my business in the public list, so that I can confirm customers can find it.

## 4. Functional Requirements

Acceptance criteria use EARS notation (Easy Approach to Requirements Syntax).

### FR-1: Display the list of active businesses (US-1, US-7)

- **AC-1.1.** When a user opens the directory, the system shall display the first batch of up to 50 active businesses.
- **AC-1.2.** The system shall never display businesses that are marked as inactive.
- **AC-1.3.** While the first batch is loading, the system shall display a loading indicator.
- **AC-1.4.** The system shall allow any user to view the directory without an account or login.

### FR-2: Business card content (US-1, US-3)

- **AC-2.1.** The system shall display, for each business, a card with its name, category, short location summary, and store type indicator.
- **AC-2.2.** While a business has a valid WhatsApp number, the system shall display a WhatsApp contact button on its card.
- **AC-2.3.** If a business has an invalid WhatsApp number, then the system shall not display the WhatsApp contact button on its card and shall still display the rest of the card.
- **AC-2.4.** The system shall not display any other business attribute on the card in this MVP.

### FR-3: Store type indicator (US-3)

- **AC-3.1.** While a business operates from a physical store, the system shall display the label "In-store" on its card.
- **AC-3.2.** While a business does not operate from a physical store, the system shall display the label "Delivery only" on its card.

### FR-4: Contact through WhatsApp (US-2)

- **AC-4.1.** When a user activates the WhatsApp button of a business, the system shall open a WhatsApp conversation addressed to that business's WhatsApp number, with a generic prefilled greeting in English that does not include the business name (for example, "Hi, I found you in the Alameda del Río directory").
- **AC-4.2.** If WhatsApp is not installed on the user's device, then the system shall let the user continue the conversation through WhatsApp's web experience.
- **AC-4.3.** When a user activates the WhatsApp button, the system shall keep the directory available so the user can return to the list at the same position.

### FR-5: Ordering (US-5)

- **AC-5.1.** The system shall order businesses from the most recently created to the least recently created.
- **AC-5.2.** The system shall keep the same order across all batches of a browsing session.
- **AC-5.3.** If two businesses share the same creation time, then the system shall order them alphabetically by business name.
- **AC-5.4.** If two businesses share the same creation time and the same name, then the system shall still apply one fixed, repeatable order.

### FR-6: Progressive loading with infinite scroll (US-4)

- **AC-6.1.** When the user scrolls close to the end of the loaded businesses and more businesses exist, the system shall automatically load the next batch of up to 50 businesses and append it to the list.
- **AC-6.2.** While the next batch is loading, the system shall display a loading indicator at the end of the list.
- **AC-6.3.** The system shall not display the same business more than once in the list.
- **AC-6.4.** When all businesses have been loaded, the system shall indicate that there are no more businesses to show.
- **AC-6.5.** The system shall not skip any active business when moving from one batch to the next.

### FR-7: Loading failures (US-6)

- **AC-7.1.** If loading the first batch or a subsequent batch fails, then the system shall automatically retry the load up to 2 times, about 1 second apart.
- **AC-7.2.** If all automatic retries fail, then the system shall display an error message and a "Retry" button.
- **AC-7.3.** When the user activates the "Retry" button, the system shall attempt to load the failed batch again.
- **AC-7.4.** If a subsequent batch fails to load, then the system shall keep the already loaded businesses visible and usable, and shall display the error message and "Retry" button at the end of the list.
- **AC-7.5.** The system shall not display technical error details to the user.

### FR-8: Empty state (US-6)

- **AC-8.1.** If there are no active businesses, then the system shall display a message stating that no businesses are available yet.

### FR-9: Interface language

- **AC-9.1.** The system shall display all interface text in English, including buttons, labels, loading, empty, and error messages.

## 5. Non-Functional Requirements

- **NFR-1 Performance.** On a typical mobile connection, the first batch shall be visible within 3 seconds and each next batch within 2 seconds.
- **NFR-2 Scalability.** The directory shall remain usable with more than 200 businesses and with fast growth. The time to show the first batch shall not increase noticeably as the total number of businesses grows.
- **NFR-3 Responsiveness.** The directory shall be designed mobile-first, usable on small screens (down to 320 px wide), and shall also work on desktop browsers.
- **NFR-4 Accessibility.** The directory shall meet WCAG 2.1 level AA, including keyboard operation, accessible names for every button, and sufficient text contrast. Infinite scroll shall not make any content or control unreachable for keyboard or assistive technology users.
- **NFR-5 Resilience.** Temporary failures shall not leave the user on a blank screen. The user shall always see content, a loading state, an empty state, or an error with a retry action.
- **NFR-6 Data freshness.** Changes to business data shall appear the next time the list is loaded. Real-time updates are not required.
- **NFR-7 Privacy.** The directory shall not collect personal data from visitors in this MVP. It shall only show business contact information for active businesses.
- **NFR-8 Verifiability.** Every requirement in this spec shall be verifiable through automated tests or a documented manual check.

## 6. Edge Cases

| # | Situation | Expected behavior |
|---|---|---|
| EC-1 | There are no active businesses | Empty state message (FR-8) |
| EC-2 | There are fewer than 50 active businesses | All are shown; end-of-list indication appears; no extra load is attempted |
| EC-3 | The total number of active businesses is an exact multiple of 50 | The last load returns nothing new and the end-of-list indication appears; no error is shown |
| EC-4 | A business is added or deactivated while the user is scrolling | The list never shows duplicates or breaks; the change may appear on the next load (NFR-6) |
| EC-5 | The first batch fails | Two automatic retries, then error with "Retry" (FR-7) |
| EC-6 | A later batch fails | Loaded businesses stay visible; error with "Retry" appears at the end of the list (AC-7.4) |
| EC-7 | The user loses connection while scrolling | Treated as a loading failure (FR-7) |
| EC-8 | The user scrolls very fast | Only one batch load is in progress at a time; no duplicated batches |
| EC-9 | A business name or location summary is very long | The card stays readable and does not break the layout |
| EC-10 | A business has an invalid WhatsApp number | The card is shown without the WhatsApp button (AC-2.3) |
| EC-11 | The user returns to the directory after opening WhatsApp | The list is still available at the same position (AC-4.3) |
| EC-12 | Two businesses have the same creation time | Alphabetical by name; if names also match, one fixed repeatable order (AC-5.3, AC-5.4) |

## 7. Out of Scope

- Search by name or any other text.
- Filters, including by category, and any sort option other than the fixed order.
- A detail page for each business.
- Extended business attributes: description, logo, cover image, exact address, coordinates, email, Instagram, catalog link, opening hours, home delivery flag, payment methods, and verification status.
- Creating, editing, or removing businesses through the product. The initial businesses are loaded directly by the team, outside the product.
- Business owner accounts and ownership claims.
- User accounts, login, favorites, reviews, and ratings.
- Maps and directions.
- Interface languages other than English.
- Analytics and usage tracking.

## 8. Completion Criteria

This feature is complete when all of the following are true:

1. Every functional requirement (FR-1 to FR-9) has its acceptance criteria verified by an automated test or a documented manual check.
2. Every non-functional requirement is verified against its target.
3. All edge cases (EC-1 to EC-12) are covered and behave as described.
4. No [NEEDS CLARIFICATION] item remains open.
5. A user can open the directory, scroll through businesses, and start a WhatsApp conversation with one of them.
6. This spec is marked `Status: Approved` by a human before planning starts.

## 9. Open Questions and Decisions

**Open questions:** none.

**Decisions taken during clarification:**

| Topic | Decision |
|---|---|
| Spec and interface language | English everywhere, including EARS criteria |
| Batch size | 50 businesses |
| Automatic retries | 2 retries, about 1 second apart |
| Tie-break for equal creation time | Alphabetical by name |
| Store type labels | "In-store" and "Delivery only" |
| WhatsApp message | Generic prefilled greeting in English, no business name |
| Primary device | Mobile-first, desktop secondary |
| Performance targets | 3 s first batch, 2 s next batches (proposed values kept; no preference given) |
| Accessibility | WCAG 2.1 AA |
| Inactive businesses | Never shown |
| Failure of a later batch | Loaded businesses stay visible; error at the end of the list |
| Initial data | Loaded directly by the team, outside the product |
| Invalid WhatsApp number | WhatsApp button hidden on that card |