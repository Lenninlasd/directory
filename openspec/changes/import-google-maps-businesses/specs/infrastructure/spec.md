# Spec Delta

## MODIFIED Requirements

### Requirement: Business data loading
Business rows of every environment SHALL be added, changed, or deactivated only with the import command of the business-import spec, run by a person from their machine, and reviewed in `dev` before `prod`. No business values SHALL be committed to the repository. The one exception is opening hours, which may also be changed through the editing routes of the business-editing spec.

#### Scenario: Adding or changing a business (002 AC-7.1)
- **WHEN** a business has to be added, changed, or deactivated
- **THEN** it is changed in the pipeline's handoff file and loaded with the import command, never by hand in the database and never with a committed data migration

#### Scenario: Changing opening hours
- **WHEN** a business's opening hours change
- **THEN** they may be changed through the editing routes in admin mode, following "Opening hours for writing", or arrive with the next import, as defined in "Opening hours edited in admin mode" of the business-import spec

#### Scenario: Only public business data (002 AC-7.2)
- **WHEN** a file is committed to the repository
- **THEN** the only business data it holds is invented and public in form, for tests and the `dev` seed: never a value of a real business, never a private field value, and no visitor data

#### Scenario: Review before prod
- **WHEN** businesses are loaded into `prod`
- **THEN** they come from the file last imported into `dev`, as defined in "Review in dev before prod" of the business-import spec

#### Scenario: The `dev` seed (002 AC-7.3)
- **WHEN** the migration script runs in `prod`
- **THEN** the sample rows of `backend/seeds/dev_businesses.sql` are not applied, since the seed is separate from data migrations and is only for `dev`
