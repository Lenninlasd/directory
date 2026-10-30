# Spec 002: Hosting, Deployment, and Infrastructure

- **Status:** Approved
- **Created:** 2026-10-23
- **Last updated:** 2026-10-27
- **Depends on:** [Spec 001](../001-business-list/spec.md) (Approved)

## 1. Context and Objective

**Context.** Spec 001 defines the business directory (frontend, one read-only API endpoint, one table) but explicitly leaves out where and how it runs. Without hosting, real users cannot reach it.

**Objective.** Define the AWS infrastructure, environments, and deployment process that make the directory of spec 001 reachable by the public, in two environments (`dev` and `prod`), with all infrastructure described as code.

**Success looks like.** A team member runs a documented deploy for an environment and gets a working public URL that serves the directory, backed by an Aurora PostgreSQL database that has the schema from spec 001 applied.

## 2. Users

| User | Needs |
|---|---|
| Development team | Reproducible deploys, a safe `dev` environment, and a separated `prod` environment |
| Directory visitors | Fast, reliable, HTTPS access (indirect user, see spec 001 NFR-1) |

## 3. General Constraints

- Everything in the stack is fixed by `docs/constitution.md`: Lambda + API Gateway, Aurora PostgreSQL, React frontend. This spec adds hosting for the frontend (S3 + CloudFront) and the IaC tool (AWS SAM).
- No credentials, tokens, account IDs, or database passwords in the repository. Environment-specific values come from deploy-time parameters and environment variables.
- The database is never reachable from the public internet.
- Lambda keeps no long-lived state between invocations (AGENTS.md). It holds no database connections: every query is an HTTPS call to the RDS Data API (I-4).
- Documentation, identifiers, and resource names are in English.

## 4. Decisions Taken

| # | Decision | Reason |
|---|---|---|
| I-1 | Two environments, `dev` and `prod`, each with its own full set of resources. Only `dev` is created at first; `prod` is created from the same template when the directory launches (M5). | Safe testing before production, without paying for `prod` before it has users |
| I-2 | IaC with AWS SAM (`template.yaml`) | Serverless-first; SAM covers Lambda, API Gateway, and plain CloudFormation resources for the rest |
| I-3 | Frontend hosting: private S3 bucket behind CloudFront | Static hosting, HTTPS, global caching |
| I-4 | All database access goes through the RDS Data API (HTTPS, managed by AWS). Lambda runs outside the VPC and opens no database connections. RDS Proxy is not used. | Removes Lambda VPC networking, connection handling, database users, and the migration Lambda. AWS manages connections, so connection exhaustion is not a concern. |
| I-5 | Access is controlled by IAM permissions on the Data API (`rds-data:*` actions on the cluster) plus the Aurora-managed master user secret in Secrets Manager (created and rotated by AWS), which the Data API reads on the caller's behalf. The application never reads the password. | No password in the application, the repository, or environment variables |
| I-6 | Primary region: `us-east-1` (confirmed, Q-1) | See section 4a |

### 4a. Region rationale

Candidate regions for users in Barranquilla: `us-east-1` (N. Virginia) and `sa-east-1` (São Paulo). Latency from Colombia to `us-east-1` is generally similar to or lower than to São Paulo, because international routes from the Caribbean coast mostly pass through the United States. `us-east-1` also has the widest service availability and lower prices. CloudFront serves the frontend from edge locations regardless of the origin region, so the region choice mainly affects the API and the database.

## 5. Functional Requirements

### FR-1: Infrastructure as code

- **AC-1.1.** The system shall define all AWS resources of both environments in a SAM template stored in the repository.
- **AC-1.2.** The same template shall be deployable to `dev` and `prod`, differing only by parameters (for example environment name, allowed origin, database capacity).
- **AC-1.3.** The system shall not require resources to be created or changed manually in the AWS console. If something must be done manually (for example a one-time account setup), it shall be listed in the deployment documentation.

### FR-2: Backend deployment

- **AC-2.1.** The system shall deploy the backend Lambda function (spec 001, plan section 4) behind API Gateway, exposing `GET /businesses` over HTTPS.
- **AC-2.2.** The Lambda function shall reach the database only through the RDS Data API (HTTPS).
- **AC-2.3.** The Lambda execution role shall have only the permissions it needs: write logs, `rds-data:ExecuteStatement` on this environment's cluster, and `secretsmanager:GetSecretValue` on this environment's database secret.
- **AC-2.4.** The API shall allow cross-origin requests only from the frontend origin of the same environment (CORS), never from `*` in `prod`.
- **AC-2.5.** Lambda logs shall go to CloudWatch Logs with a defined retention period of 30 days.

### FR-3: Database

- **AC-3.1.** The system shall provision an Aurora PostgreSQL cluster per environment, in private subnets, with no public access.
- **AC-3.2.** The database shall accept no direct network connections: its security group has no inbound rules, and all access goes through the Data API.
- **AC-3.3.** Storage shall be encrypted at rest and connections encrypted in transit.
- **AC-3.4.** `prod` shall keep automated backups with a defined retention period of 7 days. `dev` may use a shorter one.
- **AC-3.5.** The engine version shall be a version supported by Aurora PostgreSQL, verified against the official AWS documentation before the template is written. The version chosen shall be recorded in the plan.

### FR-4: Frontend hosting

- **AC-4.1.** The system shall store the built frontend in a private S3 bucket that is reachable only through CloudFront.
- **AC-4.2.** CloudFront shall serve the site over HTTPS and redirect HTTP to HTTPS.
- **AC-4.4.** The frontend build shall receive the API base URL of its environment (`VITE_API_BASE_URL`) at build time.
- **AC-4.5.** Deploying a new frontend version shall make it visible to users without waiting for stale cache entries (cache invalidation or versioned asset names).

### FR-5: Database migrations

- **AC-5.1.** The system shall provide a documented, repeatable way to run `backend/migrations/*.sql` against the database of each environment, using the in-repo script defined in plan 001 (D-7).
- **AC-5.2.** The migration mechanism shall reach the private database without opening it to the internet.
- **AC-5.2a.** The migration mechanism is a script in the repository, run by the deploy command from the developer's machine, that applies migrations through the RDS Data API with the developer's AWS credentials.
- **AC-5.3.** Migrations run right after the stack update, so every migration shall be compatible with both the previous and the new backend version (add first, remove in a later release).

### FR-6: Deployment process

- **AC-6.1.** A documented command sequence shall deploy the backend, run migrations, build the frontend, and publish it for a chosen environment.
- **AC-6.2.** Deploying to `prod` shall require an explicit action by a human; it shall never happen as a side effect of a `dev` deploy.
- **AC-6.3.** Deployment documentation shall explain how to roll back to the previous backend and frontend version.

### FR-7: Business data loading

- **AC-7.1.** Business rows for every environment shall be added or changed only through versioned SQL data migrations in `backend/migrations/`, reviewed in a pull request and applied by the migration mechanism (FR-5), like schema changes.
- **AC-7.2.** Data migrations shall contain only public business contact information (spec 001 section 2 fields). No visitor data.
- **AC-7.3.** The `dev` seed (Q-9) is separate from data migrations and shall never run in `prod`.

### FR-8: Continuous integration

- **AC-8.1.** On every pull request to `main`, a CI workflow shall run `pnpm install --frozen-lockfile`, `pnpm -r lint`, `pnpm -r typecheck`, and `pnpm -r test`, and a failure shall block the merge.
- **AC-8.2.** CI shall have no AWS credentials and shall not deploy.

## 6. Non-Functional Requirements

- **NFR-1 Performance.** The infrastructure shall not prevent spec 001 NFR-1 (list visible in about 3 seconds on a typical mobile connection). Cold-start plus connection time is measured with spec 001 manual check 5.
- **NFR-2 Security.** Least-privilege IAM, no public database, TLS everywhere, no secrets in the repository or in Lambda environment variables.
- **NFR-3 Cost.** Expected traffic is low. Database capacity in `dev` shall be the minimum available, including scaling to zero when idle. The choice for `prod` shall be justified in the plan.
- **NFR-4 Reproducibility.** Destroying and recreating an environment from the template shall give the same result, apart from data.
- **NFR-5 Observability.** Errors from Lambda and the API shall be visible in CloudWatch. No alerting is required in this MVP.

## 7. Edge Cases

| # | Situation | Expected behavior |
|---|---|---|
| EC-1 | The database is unreachable or rejects a request | The API returns `500 { "error": "internal_error" }` (spec 001 AC-6.4); details only in logs (verified by unit tests) |
| EC-2 | A browser from a different origin calls the API | The browser blocks it (AC-2.4) |
| EC-4 | A migration fails halfway | The transaction rolls back (plan 001, section 2) and the release stops (verified by unit tests) |
| EC-5 | A new frontend is deployed while users have the old one cached | New visitors get the new version (AC-4.5) |

## 8. Out of Scope

- A custom domain name and TLS certificate (the default CloudFront and API Gateway URLs are used until a later spec). Confirmed in Q-3.
- Routing for more than one page (the directory is a single page; unknown paths are not redirected to it).
- Continuous deployment. Deployment is run by a human from a terminal in this MVP. (CI for tests is in scope, FR-8.)
- Alerting, dashboards, and distributed tracing.
- Web Application Firewall, rate limiting, and DDoS-specific configuration beyond AWS defaults.
- Multi-region deployment and disaster recovery beyond automated backups.
- Caching of API responses.
- Cost budgets and billing alarms.
- Any change to the application behavior defined in spec 001.

## 9. New Dependencies (require approval)

| Tool | Where | Why |
|---|---|---|
| AWS SAM CLI | developer machine (not an npm package, not in the lockfile) | Build and deploy the template |
| AWS CLI | developer machine | Upload the frontend to S3, invalidate CloudFront, authenticate |
| GitHub Actions | repository (`.github/workflows/`) | CI for tests (FR-8) |
| `esbuild` (npm, dev) | backend | Bundles the Lambda, run through `pnpm exec` by the SAM makefile builder (plan section 7) |

Approved by the project owner on 2026-10-24. Tooling that is not a project dependency shall be documented with its required version in the deployment documentation.

## 10. Completion Criteria

1. Every functional requirement (FR-1 to FR-8) is verified by a documented manual check or an automated check, since infrastructure cannot be unit tested like application code.
2. `dev` and `prod` each serve the directory of spec 001 over HTTPS from their own URL.
3. The spec 001 manual checks (inactive rows, WhatsApp, layout, accessibility, performance, freshness) pass in `dev`.
4. The database is confirmed unreachable from the public internet.
5. Deployment and migration have been executed at least once in `dev`, and rollback is documented.
6. This spec is marked `Status: Approved` by a human before planning starts.

## 11. Open Questions

Resolved on 2026-10-23:

- **Q-1.** Region is `us-east-1` (I-6 confirmed). No separate latency measurement.
- **Q-2.** Aurora Serverless v2 in both environments. `dev` scales to zero when idle. `prod` keeps a minimum capacity above zero so users never wait for a resume (details in the plan).
- **Q-3.** No custom domain for the first release (stays out of scope, section 8).
- **Q-5.** CloudWatch log retention is 30 days. `prod` backup retention is 7 days. `dev` uses the minimum.
- **Q-7.** One AWS account holds both environments, separated by resource names and tags.

- **Q-4.** Migrations run through a script that uses the RDS Data API, invoked by the deploy command (AC-5.2a). The same script runs the `dev` seed.
- **Q-6.** Obsolete: RDS Proxy is not used (I-4). The only secret is the Aurora-managed master user secret, read by the Data API (I-5).
- **Q-8.** RDS Proxy is not needed: the Data API manages connections.
- **Q-9.** `backend/seeds/dev_businesses.sql` (sample rows, `dev` only, never run in `prod`) is approved as a deliverable.
