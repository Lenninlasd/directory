# Spec Delta

## MODIFIED Requirements

### Requirement: Business data loading
Business rows of every environment SHALL be added or changed only through versioned SQL data migrations in `backend/migrations/`, reviewed in a pull request and applied by the migration mechanism, like schema changes. The exceptions are opening hours, which may also be changed through the editing routes of the business-editing spec, and WhatsApp numbers, which are set only through those routes.

#### Scenario: Adding or changing a business (002 AC-7.1)
- **WHEN** a business has to be added, changed, or deactivated
- **THEN** it is done with a data migration reviewed in a pull request, never by hand in the database

#### Scenario: Changing opening hours
- **WHEN** a business's opening hours change
- **THEN** they may be changed with a data migration or through the editing routes in admin mode, and in both cases they follow "Opening hours for writing"

#### Scenario: Only public business data (002 AC-7.2)
- **WHEN** a data migration is written
- **THEN** it contains only public business contact information, no visitor data, and no WhatsApp number

#### Scenario: The `dev` seed (002 AC-7.3)
- **WHEN** the migration script runs in `prod`
- **THEN** the sample rows of `backend/seeds/dev_businesses.sql` are not applied, since the seed is separate from data migrations and is only for `dev`

#### Scenario: Setting a WhatsApp number
- **WHEN** a business's WhatsApp number or its authorization changes
- **THEN** it is set through the WhatsApp number routes of the business-editing spec, never in a migration, since the repository is public
