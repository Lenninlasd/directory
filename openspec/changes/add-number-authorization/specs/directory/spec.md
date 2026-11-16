# Spec Delta

## MODIFIED Requirements

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
