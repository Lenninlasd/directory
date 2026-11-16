# Spec Delta

## MODIFIED Requirements

### Requirement: Screen layout
The screen SHALL have a header that stays visible while scrolling, with the title "Negocios en Alameda del Río" as plain text. While the list is loaded and not empty, the header SHALL also hold the search field, and below it the screen SHALL show, in this order, the category filter, the featured section, and the full list. In every state, the floating button of "Add a business button" in the owner-contact spec SHALL stay at the bottom of the screen without covering the end of the content.

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

#### Scenario: Floating button
- **WHEN** the screen is shown in any state and the form address is valid
- **THEN** the floating button stays at the bottom of the screen while scrolling, outside the main landmark, and the last content of the page can be fully seen above it
