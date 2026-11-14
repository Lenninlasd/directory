## MODIFIED Requirements

### Requirement: Infrastructure as code
The system SHALL define all AWS resources of both environments in an AWS SAM template stored in the repository, and SHALL NOT require resources to be created or changed by hand in the AWS console. The only exception is the secret values of "Least privilege and secrets", which a person stores with a documented command, since their values must not be in the repository.

#### Scenario: Resources come from the template (002 AC-1.1, 002 I-2)
- **WHEN** an AWS resource of an environment exists
- **THEN** it is defined in the SAM template in the repository

#### Scenario: Manual steps are documented (002 AC-1.3, 002 AC-1.3a)
- **WHEN** something must be done by hand, such as a one-time account setup or creating the Cloudflare Pages project of an environment with Wrangler
- **THEN** that step is listed in the deployment documentation

#### Scenario: Storing a secret value
- **WHEN** an environment needs its admin key or Anthropic API key stored or replaced
- **THEN** a person runs the command in the deployment documentation from their terminal, and the value is never written to a file in the repository

#### Scenario: Recreating an environment (002 NFR-4)
- **WHEN** an environment is destroyed and created again from the template
- **THEN** the result is the same, apart from data and the stored secret values

### Requirement: Backend deployment
The system SHALL deploy the backend as a Lambda function behind API Gateway, exposing `GET /businesses`, `POST /businesses/{id}/opening-hours/interpretation`, and `PUT /businesses/{id}/opening-hours` over HTTPS. Lambda logs SHALL go to CloudWatch Logs with a retention of 30 days, where Lambda and API errors are visible.

#### Scenario: The API is reachable (002 AC-2.1)
- **WHEN** a client calls `GET /businesses` on the API URL of an environment over HTTPS
- **THEN** the Lambda function answers through API Gateway

#### Scenario: The editing routes are reachable
- **WHEN** a browser on the frontend origin of an environment calls one of the two opening hours routes with an `Authorization` header and a JSON body
- **THEN** the Lambda function answers through API Gateway, and the cross-origin preflight allows that method and those headers

#### Scenario: Logs and retention (002 AC-2.5, 002 NFR-5)
- **WHEN** the Lambda function writes a log or fails
- **THEN** the entry is in CloudWatch Logs and is kept for 30 days

### Requirement: Least privilege and secrets
The repository SHALL contain no credentials, tokens, account IDs, or database passwords, and the application SHALL never read the database password. All database access SHALL go through the RDS Data API, controlled by IAM permissions and the Aurora-managed secret. The admin key and the Anthropic API key SHALL be encrypted SSM parameters per environment, read at run time. The Lambda role SHALL have only the permissions it needs.

#### Scenario: Lambda permissions (002 AC-2.3)
- **WHEN** the Lambda execution role is inspected
- **THEN** it can only write logs, call `rds-data:ExecuteStatement` on this environment's cluster, call `secretsmanager:GetSecretValue` on this environment's database secret, call `ssm:GetParameter` on this environment's two secret parameters, and call `kms:Decrypt` only through SSM and only for those two parameters

#### Scenario: Database access path (002 AC-2.2, 002 I-4, 002 I-5)
- **WHEN** the Lambda function reads the database
- **THEN** it uses the RDS Data API over HTTPS, runs outside the VPC, and opens no database connection

#### Scenario: Nothing secret in the repository (002 section 3, 002 NFR-2)
- **WHEN** the repository or the Lambda environment variables are inspected
- **THEN** they contain no credential, token, account ID, or password, and environment-specific values come from deploy-time parameters and environment variables

#### Scenario: Secret parameters
- **WHEN** the admin key or the Anthropic API key of an environment is inspected
- **THEN** it is an SSM `SecureString` parameter under that environment's path, the Lambda environment variables hold only the parameter names, and the other environment cannot read it

#### Scenario: Cloudflare authentication (002 section 3)
- **WHEN** the developer deploys the frontend
- **THEN** they authenticate with `wrangler login`, and no Cloudflare key is stored in files or environment variables

### Requirement: Business data loading
Business rows of every environment SHALL be added or changed only through versioned SQL data migrations in `backend/migrations/`, reviewed in a pull request and applied by the migration mechanism, like schema changes. The one exception is opening hours, which may also be changed through the editing routes of the business-editing spec.

#### Scenario: Adding or changing a business (002 AC-7.1)
- **WHEN** a business has to be added, changed, or deactivated
- **THEN** it is done with a data migration reviewed in a pull request, never by hand in the database

#### Scenario: Changing opening hours
- **WHEN** a business's opening hours change
- **THEN** they may be changed with a data migration or through the editing routes in admin mode, and in both cases they follow "Opening hours for writing"

#### Scenario: Only public business data (002 AC-7.2)
- **WHEN** a data migration is written
- **THEN** it contains only public business contact information, and no visitor data

#### Scenario: The `dev` seed (002 AC-7.3)
- **WHEN** the migration script runs in `prod`
- **THEN** the sample rows of `backend/seeds/dev_businesses.sql` are not applied, since the seed is separate from data migrations and is only for `dev`
