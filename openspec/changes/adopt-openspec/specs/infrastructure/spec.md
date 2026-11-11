# Infrastructure

## Purpose

How the directory reaches the public: two environments (`dev` and `prod`) on AWS, with the frontend on Cloudflare Pages, all infrastructure described as code, a database that is never public, and a documented deployment run by a person. Ids in parentheses, such as (002 AC-2.1), name the acceptance criterion or decision of the archived spec that a scenario came from.

## ADDED Requirements

### Requirement: Environments
The system SHALL have two environments, `dev` and `prod`, each with its own full set of resources in one AWS account, in region `us-east-1`, separated by resource names and tags. `prod` is created from the same template when the directory launches.

#### Scenario: Separate resources (002 I-1)
- **WHEN** a resource is created for one environment
- **THEN** it is not shared with the other environment, and its name and tags identify its environment

#### Scenario: One template for both (002 AC-1.2)
- **WHEN** the template is deployed to `dev` or to `prod`
- **THEN** only parameters differ, for example the environment name, the allowed origin, and the database capacity

#### Scenario: Region (002 I-6)
- **WHEN** an AWS resource is created
- **THEN** it is in `us-east-1`

### Requirement: Infrastructure as code
The system SHALL define all AWS resources of both environments in an AWS SAM template stored in the repository, and SHALL NOT require resources to be created or changed by hand in the AWS console.

#### Scenario: Resources come from the template (002 AC-1.1, 002 I-2)
- **WHEN** an AWS resource of an environment exists
- **THEN** it is defined in the SAM template in the repository

#### Scenario: Manual steps are documented (002 AC-1.3, 002 AC-1.3a)
- **WHEN** something must be done by hand, such as a one-time account setup or creating the Cloudflare Pages project of an environment with Wrangler
- **THEN** that step is listed in the deployment documentation

#### Scenario: Recreating an environment (002 NFR-4)
- **WHEN** an environment is destroyed and created again from the template
- **THEN** the result is the same, apart from data

### Requirement: Backend deployment
The system SHALL deploy the backend as a Lambda function behind API Gateway, exposing `GET /businesses` over HTTPS. Lambda logs SHALL go to CloudWatch Logs with a retention of 30 days, where Lambda and API errors are visible.

#### Scenario: The API is reachable (002 AC-2.1)
- **WHEN** a client calls `GET /businesses` on the API URL of an environment over HTTPS
- **THEN** the Lambda function answers through API Gateway

#### Scenario: Logs and retention (002 AC-2.5, 002 NFR-5)
- **WHEN** the Lambda function writes a log or fails
- **THEN** the entry is in CloudWatch Logs and is kept for 30 days

### Requirement: Cross-origin access
The API SHALL allow cross-origin requests only from the frontend origin of the same environment, and never from `*` in `prod`.

#### Scenario: The frontend of the same environment (002 AC-2.4)
- **WHEN** a browser on the frontend origin of an environment calls that environment's API
- **THEN** the response allows that origin

#### Scenario: Another origin (002 AC-2.4, 002 EC-2)
- **WHEN** a browser on any other origin calls the API
- **THEN** the response allows no origin and the browser blocks the call

### Requirement: Least privilege and secrets
The repository SHALL contain no credentials, tokens, account IDs, or database passwords, and the application SHALL never read the database password. All database access SHALL go through the RDS Data API, controlled by IAM permissions and the Aurora-managed secret, and the Lambda role SHALL have only the permissions it needs.

#### Scenario: Lambda permissions (002 AC-2.3)
- **WHEN** the Lambda execution role is inspected
- **THEN** it can only write logs, call `rds-data:ExecuteStatement` on this environment's cluster, and call `secretsmanager:GetSecretValue` on this environment's database secret

#### Scenario: Database access path (002 AC-2.2, 002 I-4, 002 I-5)
- **WHEN** the Lambda function reads the database
- **THEN** it uses the RDS Data API over HTTPS, runs outside the VPC, and opens no database connection

#### Scenario: Nothing secret in the repository (002 section 3, 002 NFR-2)
- **WHEN** the repository or the Lambda environment variables are inspected
- **THEN** they contain no credential, token, account ID, or password, and environment-specific values come from deploy-time parameters and environment variables

#### Scenario: Cloudflare authentication (002 section 3)
- **WHEN** the developer deploys the frontend
- **THEN** they authenticate with `wrangler login`, and no Cloudflare key is stored in files or environment variables

### Requirement: Private database
The system SHALL provision one Aurora PostgreSQL cluster per environment, in private subnets, that is never reachable from the public internet and accepts no direct network connections.

#### Scenario: No public access (002 AC-3.1, 002 AC-3.2)
- **WHEN** anything tries to connect to the database over the network
- **THEN** the connection is refused, because the cluster is in private subnets and its security group has no inbound rules

#### Scenario: Encryption (002 AC-3.3)
- **WHEN** data is stored or sent
- **THEN** storage is encrypted at rest and connections are encrypted in transit

#### Scenario: Backups (002 AC-3.4)
- **WHEN** `prod` is running
- **THEN** automated backups are kept for 7 days, and `dev` may keep them for less

#### Scenario: Engine version (002 AC-3.5)
- **WHEN** the engine version is chosen or changed
- **THEN** it is a version supported by Aurora PostgreSQL, verified against the official AWS documentation, and recorded in the design of that change

### Requirement: Database capacity and cost
Both environments SHALL use Aurora Serverless v2. `dev` SHALL use the minimum capacity available, including scaling to zero when idle. `prod` SHALL keep a minimum capacity above zero, so visitors never wait for the database to resume.

#### Scenario: Idle `dev` (002 NFR-3)
- **WHEN** `dev` receives no traffic
- **THEN** its database scales to zero

#### Scenario: A visit to `prod` (002 NFR-3)
- **WHEN** a visitor opens the directory in `prod` after a quiet period
- **THEN** the database answers without a resume wait

#### Scenario: Performance budget (002 NFR-1)
- **WHEN** the first load is measured on a throttled mobile connection, including a cold Lambda start
- **THEN** the infrastructure does not prevent the list from being visible in about 3 seconds

### Requirement: Frontend hosting
The system SHALL host the built frontend as static files on Cloudflare Pages, in one Pages project per environment, deployed by direct upload from the developer's machine. No AWS resource stores or serves the frontend. The site SHALL be served over HTTPS.

#### Scenario: HTTPS only (002 AC-4.2)
- **WHEN** a browser requests the site over HTTP
- **THEN** it is redirected to HTTPS

#### Scenario: One project per environment (002 AC-4.1, 002 I-3)
- **WHEN** the frontend of an environment is published
- **THEN** it goes to that environment's Pages project, with no Git integration

#### Scenario: API address at build time (002 AC-4.4)
- **WHEN** the frontend is built for an environment
- **THEN** the build receives that environment's API base URL as `VITE_API_BASE_URL`

#### Scenario: A new version is published (002 AC-4.5, 002 EC-5)
- **WHEN** a new frontend version is deployed while visitors have the old one cached
- **THEN** new visits get the new version without waiting for stale cache entries

### Requirement: Database migrations
The system SHALL provide a documented, repeatable way to apply `backend/migrations/*.sql` to the database of each environment: a script in the repository, run by the deploy command from the developer's machine, that applies them through the RDS Data API with the developer's AWS credentials.

#### Scenario: Running migrations (002 AC-5.1, 002 AC-5.2, 002 AC-5.2a)
- **WHEN** the deploy command runs for an environment
- **THEN** the pending migrations are applied in order through the Data API, without opening the database to the internet

#### Scenario: Compatibility with both backend versions (002 AC-5.3)
- **WHEN** a migration is written
- **THEN** it is compatible with both the previous and the new backend version (add first, remove in a later release), because migrations run right after the stack update

#### Scenario: A migration fails halfway (002 EC-4)
- **WHEN** a migration fails
- **THEN** its transaction rolls back and the release stops

### Requirement: Deployment process
A documented command sequence SHALL deploy the backend, run migrations, build the frontend, and publish it for a chosen environment. Deployment is run by a person from a terminal.

#### Scenario: Deploying an environment (002 AC-6.1)
- **WHEN** a team member runs the documented deploy for an environment
- **THEN** the backend is deployed, migrations run, and the frontend is built and published, giving a working public URL

#### Scenario: Production is explicit (002 AC-6.2)
- **WHEN** `dev` is deployed
- **THEN** `prod` does not change, and deploying to `prod` needs an explicit action by a person

#### Scenario: Rolling back (002 AC-6.3)
- **WHEN** a release has to be undone
- **THEN** the deployment documentation explains how to return to the previous backend and frontend version

### Requirement: Business data loading
Business rows of every environment SHALL be added or changed only through versioned SQL data migrations in `backend/migrations/`, reviewed in a pull request and applied by the migration mechanism, like schema changes.

#### Scenario: Adding or changing a business (002 AC-7.1)
- **WHEN** a business has to be added, changed, or deactivated
- **THEN** it is done with a data migration reviewed in a pull request, never by hand in the database

#### Scenario: Only public business data (002 AC-7.2)
- **WHEN** a data migration is written
- **THEN** it contains only public business contact information, and no visitor data

#### Scenario: The `dev` seed (002 AC-7.3)
- **WHEN** the migration script runs in `prod`
- **THEN** the sample rows of `backend/seeds/dev_businesses.sql` are not applied, since the seed is separate from data migrations and is only for `dev`

### Requirement: Continuous integration
On every pull request to `main`, a CI workflow SHALL install with the frozen lockfile and run lint, type check, tests, and the validation of the OpenSpec specs and changes. A failure SHALL block the merge. CI SHALL have no AWS credentials and SHALL NOT deploy.

#### Scenario: Checks on a pull request (002 AC-8.1)
- **WHEN** a pull request to `main` is opened or updated
- **THEN** CI runs `pnpm install --frozen-lockfile`, `pnpm -r lint`, `pnpm -r typecheck`, and `pnpm -r test`, and a failure blocks the merge

#### Scenario: Specs are validated
- **WHEN** a pull request to `main` is opened or updated
- **THEN** CI runs `openspec validate --all --strict`, and a spec or change with a format error blocks the merge

#### Scenario: No deployment from CI (002 AC-8.2)
- **WHEN** the CI workflow runs
- **THEN** it has no AWS credentials and deploys nothing

### Requirement: Deliberate exclusions
The infrastructure SHALL NOT include the items in the table of the first scenario. Each was left out on purpose, and a change that adds one SHALL remove it from this table.

#### Scenario: Excluded items (002 section 8)
- **WHEN** an environment is inspected
- **THEN** none of the items in this table exists

| Excluded | Notes |
|---|---|
| A custom domain name and TLS certificate | The default `pages.dev` and API Gateway URLs are used. |
| Routing for more than one page | The directory is a single page. |
| Continuous deployment | A person deploys from a terminal. CI only runs checks. |
| Alerting, dashboards, distributed tracing | Errors are visible in CloudWatch. |
| Web Application Firewall, rate limiting, DDoS-specific configuration | AWS defaults only. |
| Multi-region deployment, disaster recovery beyond automated backups | |
| Caching of API responses | |
| Cost budgets and billing alarms | |
| RDS Proxy, and a Lambda inside the VPC | The Data API replaces both (002 I-4). |

#### Scenario: A change proposes an excluded item
- **WHEN** a change adds an item from the table
- **THEN** the same change removes its row from the table and specifies the new behavior as requirements
