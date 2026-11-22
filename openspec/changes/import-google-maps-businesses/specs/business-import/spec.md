# Spec Delta

## Purpose

Loads the businesses that the Google Maps pipeline hands off into the database of one environment. Their values are never committed to the public repository, their private fields never reach a visitor, and the owner reviews them in `dev` before they reach `prod`.

## ADDED Requirements

### Requirement: Import command
A person SHALL load businesses into one environment with a command run from their machine. It reads the pipeline's handoff file from a path outside the repository and writes through the RDS Data API with that person's AWS credentials. Without the apply option, the command SHALL only check the file and print its plan, and SHALL write nothing.

#### Scenario: Dry run
- **WHEN** the command runs for `dev` or `prod` without the apply option
- **THEN** it checks the file and prints how many businesses would be added, changed, deactivated, reactivated, and left unchanged, with the names of the businesses in each group except the unchanged one
- **AND** nothing is written to the database

#### Scenario: Applying a valid file
- **WHEN** the command runs with the apply option and the file passes every check
- **THEN** its plan is written, and the command prints the same counts and names as the dry run

#### Scenario: Wrong arguments
- **WHEN** the environment is not `dev` or `prod`, the file path is missing, or the file cannot be read
- **THEN** the command prints the usage or the reason, exits with a non-zero code, and reads and writes nothing in any environment

#### Scenario: The same file twice
- **WHEN** the same file is applied twice to the same environment
- **THEN** the second run changes no business and reports every business as unchanged

### Requirement: Handoff file
The command SHALL accept only a JSON file of the form `{ "generatedAt", "source", "count", "businesses" }`, where `generatedAt` is a date `YYYY-MM-DD`, `source` is `google_maps`, and `count` is the number of businesses. Each business SHALL have exactly the fields of the first scenario, each following its rule. A file of any other shape SHALL be refused.

#### Scenario: Fields of a business
- **WHEN** a business of the file is checked
- **THEN** it has exactly the fields of this table, and each value follows its rule

| Field | Rule |
|---|---|
| `name`, `category`, `locationSummary` | Text that is not empty after trimming |
| `hasPhysicalStore` | `true` or `false` |
| `whatsappNumber` | `null`, or valid under "WhatsApp number validity" of the directory spec, and only with consent ("Consent rules") |
| `websiteUrl` | `null`, or valid under "Website validity" of the directory spec |
| `openingHours` | A week valid under "Opening hours for writing" of the business-editing spec, `[]` included |
| `mapsUrl`, `instagramUrl`, `description` | `null`, or valid under "Maps link validity", "Instagram link validity", and "Description validity" of the directory spec |
| `private` | An object with exactly the fields below |
| `private.googlePlaceId` | Text that is not empty, and unique in the file |
| `private.latitude`, `private.longitude` | Numbers from -90 to 90 and from -180 to 180 |
| `private.coordinatesSource` | Text that is not empty |
| `private.sourceType` | `storefront`, `company`, `link`, `owner_published`, or `private_group` |
| `private.sourceCategory` | `null` or text |
| `private.activityScore` | A whole number from 0 to 100 |
| `private.activityAsOf` | A date `YYYY-MM-DD` |
| `private.lastVerifiedAt`, `private.consentedAt` | `null` or a date `YYYY-MM-DD` |
| `private.consentChannel` | `null`, `whatsapp`, `in_person`, `phone_call`, or `email` |
| `private.adminNotes` | `null` or text |

#### Scenario: An unknown or missing field
- **WHEN** the file, a business, or its `private` object has a field that is not listed, or lacks one that is
- **THEN** the file is refused

#### Scenario: Wrong date, source, or count
- **WHEN** `generatedAt` is not a date `YYYY-MM-DD`, `source` is not `google_maps`, or `count` differs from the number of businesses
- **THEN** the file is refused

#### Scenario: A repeated place id
- **WHEN** two businesses of the file have the same `googlePlaceId`
- **THEN** the file is refused

### Requirement: All or nothing
The command SHALL check the whole file before it writes anything. If any business breaks a rule, the command SHALL refuse the file, list every problem with the business's position in the file, its place id, and the field, and write nothing. A valid file SHALL be written in one transaction, so a failure while writing leaves the database as it was.

#### Scenario: One invalid business
- **WHEN** one business of the file breaks a rule and the others are valid
- **THEN** no business is written, and the problem is listed with the position, place id, and field of that business, without the invalid value

#### Scenario: A failure while writing
- **WHEN** the database fails after some businesses of a valid file were written
- **THEN** the transaction rolls back, the database is as it was before the command ran, and the command exits with a non-zero code

### Requirement: Consent rules
A business SHALL have both `consentedAt` and `consentChannel` when its `whatsappNumber` is not `null` or its `sourceType` is `private_group`. Otherwise the file SHALL be refused. A phone number seen on Google Maps or in a photo is not consent.

#### Scenario: A WhatsApp number without consent
- **WHEN** a business has a `whatsappNumber` and lacks `consentedAt` or `consentChannel`
- **THEN** the file is refused

#### Scenario: A private group source without consent
- **WHEN** a business has `sourceType` `private_group` and lacks `consentedAt` or `consentChannel`
- **THEN** the file is refused

#### Scenario: A WhatsApp number with consent
- **WHEN** a business has a `whatsappNumber`, a `consentedAt`, and a `consentChannel`
- **THEN** it is accepted, and the API returns its number as defined in "WhatsApp number validity"

### Requirement: Private fields stay private
The fields under `private` SHALL be stored with the business. They SHALL never be returned by the API, written to the logs, or printed by the command, except the place id, which identifies a refused business and is already public in its Maps link.

#### Scenario: The API
- **WHEN** a client calls `GET /businesses`
- **THEN** no business in the response has a private field (directory spec, "Business list API")

#### Scenario: The command output
- **WHEN** the command prints a plan or a list of problems
- **THEN** it shows no coordinates, source, score, date, consent channel, or admin note

### Requirement: Matching stored businesses
The command SHALL match each business of the file to a stored one by its place id. A new place id SHALL be added as an active business. A known one SHALL be updated and made active. A stored business whose place id is not in the file SHALL be deactivated, never deleted. Stored businesses without a place id, such as the `dev` seed, SHALL never be changed.

#### Scenario: A new business
- **WHEN** the file has a place id that no stored business has
- **THEN** the business is added as active, with its creation time set once

#### Scenario: A known business
- **WHEN** the file has the place id of a stored business
- **THEN** the stored business takes the file's public and private fields and becomes active, and its id and creation time do not change

#### Scenario: A business missing from the file
- **WHEN** a stored business has a place id that is not in the file
- **THEN** it becomes inactive, keeps all its fields, and is no longer returned by the API

#### Scenario: A business that comes back
- **WHEN** an inactive stored business has a place id that is in the file again
- **THEN** it is updated and becomes active, with its first creation time

#### Scenario: Businesses without a place id
- **WHEN** the database has businesses without a place id, such as the rows of `backend/seeds/dev_businesses.sql`
- **THEN** the command neither changes nor deactivates them

#### Scenario: Order after the first import
- **WHEN** one import adds several businesses
- **THEN** they share their creation time, so "Business order" of the directory spec lists them alphabetically by name

### Requirement: Opening hours edited in admin mode
On a later import, the command SHALL replace a business's opening hours only while they are still the hours the previous import wrote. Hours changed since then through the editing routes of the business-editing spec SHALL be kept, and the command SHALL list those businesses in its plan.

#### Scenario: Hours not edited
- **WHEN** a stored business still has the hours the previous import wrote
- **THEN** the import replaces them with the hours in the file

#### Scenario: Hours edited in admin mode
- **WHEN** a stored business's hours were changed in admin mode after the previous import, and differ from the hours in the file
- **THEN** the import keeps them, and the plan lists the business as having edited hours

#### Scenario: The edit matches the file
- **WHEN** hours edited in admin mode are the same as the hours in the file
- **THEN** the business is not listed, and later imports replace its hours again as usual

### Requirement: Import record
Each applied import SHALL be recorded in the environment's database with the SHA-256 of the file, the file's `generatedAt`, the counts of its plan, and the time it was applied. The record SHALL hold no business values.

#### Scenario: An applied import
- **WHEN** a file is applied to an environment
- **THEN** that environment has a new import record with the file's SHA-256, its `generatedAt`, the counts, and the time

#### Scenario: A dry run
- **WHEN** the command runs without the apply option
- **THEN** no import record is added

### Requirement: Review in dev before prod
The command SHALL apply a file to `prod` only when its SHA-256 equals that of the last import applied to `dev`, and only after the person types `prod` to confirm. Both checks SHALL happen before anything is written.

#### Scenario: The file reviewed in dev
- **WHEN** a person applies to `prod` the file last applied to `dev`
- **THEN** the command shows the plan, asks the person to type `prod`, and applies the file only if they do

#### Scenario: Another file
- **WHEN** a person applies to `prod` a file whose SHA-256 differs from the last `dev` import, or `dev` has no import yet
- **THEN** the command refuses it before asking for confirmation, and writes nothing

#### Scenario: Confirmation not given
- **WHEN** the person types anything other than `prod`
- **THEN** the command stops, and `prod` does not change

#### Scenario: A dry run against prod
- **WHEN** the command runs for `prod` without the apply option
- **THEN** it prints the plan and whether the file matches the last `dev` import, and asks nothing

### Requirement: Deliberate exclusions
The import SHALL NOT include the items in the table of the first scenario. Each was left out on purpose, and a change that adds one SHALL remove it from this table.

#### Scenario: Excluded items
- **WHEN** the import is used
- **THEN** none of the items in this table is available

| Excluded | Notes |
|---|---|
| Deleting businesses | Deactivation keeps the consent record, which is the evidence of an authorization. |
| Importing only the valid part of a file | The whole file is refused ("All or nothing"). |
| Imports from other sources, such as the WhatsApp/TSV pipeline | The two pipelines stay separate. |
| Scheduled or automatic imports | A person runs each import. |
| An undo command | A previous or corrected file is imported instead. |
| Photos, logos, or other images from the pipeline | Their reuse is not cleared. |
| Storing Google ratings or reviews | A rating will be read live from the Places API, never stored. |
| Using the coordinates | They are only stored. |

#### Scenario: A change proposes an excluded item
- **WHEN** a change adds an item from the table
- **THEN** the same change removes its row from the table and specifies the new behavior as requirements
