# Spec 002: Hosting, Deployment, and Infrastructure

- **Status:** Approved
- **Created:** 2026-10-23
- **Last updated:** 2026-10-23 (RDS Proxy removed, I-4 and I-5 revised)
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
- Lambda keeps no long-lived state between invocations (AGENTS.md). Each invocation opens and closes its own connection. RDS Proxy is not used in this version (see I-4).
- Documentation, identifiers, and resource names are in English.

## 4. Decisions Taken

| # | Decision | Reason |
|---|---|---|
| I-1 | Two environments: `dev` and `prod`, each with its own full set of resources | Safe testing before production |
| I-2 | IaC with AWS SAM (`template.yaml`) | Serverless-first; SAM covers Lambda, API Gateway, and plain CloudFormation resources for the rest |
| I-3 | Frontend hosting: private S3 bucket behind CloudFront | Static hosting, HTTPS, global caching |
| I-4 | Lambda connects directly to the Aurora cluster endpoint. RDS Proxy is not used now and may be added later through a spec change. (Changed 2026-10-23, was: through RDS Proxy.) | RDS Proxy has a high fixed cost compared with the expected load and prevents Aurora Serverless v2 from pausing. Traffic is low (plan 001, R-3). |
| I-5 | The API Lambda and the migration Lambda authenticate to Aurora with IAM database authentication (plan 001, R-2). The Aurora-managed master user secret in Secrets Manager (rotated by AWS) exists only for the first role-creating migration (Q-4) and is never read by the API Lambda. | No password in the application, the repository, or environment variables |
| I-6 | Primary region: `us-east-1` (see Open Questions Q-1 to confirm) | See section 4a |

### 4a. Region rationale

Candidate regions for users in Barranquilla: `us-east-1` (N. Virginia) and `sa-east-1` (São Paulo). Latency from Colombia to `us-east-1` is generally similar to or lower than to São Paulo, because international routes from the Caribbean coast mostly pass through the United States. `us-east-1` also has the widest service availability and lower prices. CloudFront serves the frontend from edge locations regardless of the origin region, so the region choice mainly affects the API and the database. To be validated by a latency measurement from Barranquilla before `prod` is created.

## 5. Functional Requirements

### FR-1: Infrastructure as code

- **AC-1.1.** The system shall define all AWS resources of both environments in a SAM template stored in the repository.
- **AC-1.2.** The same template shall be deployable to `dev` and `prod`, differing only by parameters (for example environment name, allowed origin, database capacity).
- **AC-1.3.** The system shall not require resources to be created or changed manually in the AWS console. If something must be done manually (for example a one-time account setup), it shall be listed in the deployment documentation.

### FR-2: Backend deployment

- **AC-2.1.** The system shall deploy the backend Lambda function (spec 001, plan section 4) behind API Gateway, exposing `GET /businesses` over HTTPS.
- **AC-2.2.** The Lambda function shall run inside the VPC and reach the database only through the cluster endpoint, using IAM authentication and TLS.
- **AC-2.3.** The Lambda execution role shall have only the permissions it needs: write logs and connect to the database with IAM authentication as the application database user.
- **AC-2.4.** The API shall allow cross-origin requests only from the frontend origin of the same environment (CORS), never from `*` in `prod`.
- **AC-2.5.** Lambda logs shall go to CloudWatch Logs with a defined retention period of 30 days.

### FR-3: Database

- **AC-3.1.** The system shall provision an Aurora PostgreSQL cluster per environment, in private subnets, with no public access.
- **AC-3.2.** The database shall accept connections only from the API Lambda and the migration Lambda (FR-5), through security groups.
- **AC-3.3.** Storage shall be encrypted at rest and connections encrypted in transit.
- **AC-3.4.** `prod` shall keep automated backups with a defined retention period of 7 days. `dev` may use a shorter one.
- **AC-3.5.** The engine version shall be a version supported by Aurora PostgreSQL, verified against the official AWS documentation before the template is written. The version chosen shall be recorded in the plan.

### FR-4: Frontend hosting

- **AC-4.1.** The system shall store the built frontend in a private S3 bucket that is reachable only through CloudFront.
- **AC-4.2.** CloudFront shall serve the site over HTTPS and redirect HTTP to HTTPS.
- **AC-4.3.** CloudFront shall serve the frontend entry page for unknown paths, so the single-page app loads on any URL.
- **AC-4.4.** The frontend build shall receive the API base URL of its environment (`VITE_API_BASE_URL`) at build time.
- **AC-4.5.** Deploying a new frontend version shall make it visible to users without waiting for stale cache entries (cache invalidation or versioned asset names).

### FR-5: Database migrations

- **AC-5.1.** The system shall provide a documented, repeatable way to run `backend/migrations/*.sql` against the database of each environment, using the in-repo script defined in plan 001 (D-7).
- **AC-5.2.** The migration mechanism shall reach the private database without opening it to the internet (mechanism chosen in Q-4).
- **AC-5.2a.** The migration mechanism is a migration Lambda in the VPC, deployed by the same template and invoked by the deploy command. It shall use a database user that can change the schema, separate from the read-only user of the API Lambda (AC-2.3).
- **AC-5.3.** Migrations shall run before the new backend version receives traffic when a migration is part of the release.

### FR-6: Deployment process

- **AC-6.1.** A documented command sequence shall deploy the backend, run migrations, build the frontend, and publish it for a chosen environment.
- **AC-6.2.** Deploying to `prod` shall require an explicit action by a human; it shall never happen as a side effect of a `dev` deploy.
- **AC-6.3.** Deployment documentation shall explain how to roll back to the previous backend and frontend version.

## 6. Non-Functional Requirements

- **NFR-1 Performance.** The infrastructure shall not prevent spec 001 NFR-1 (list visible in about 3 seconds on a typical mobile connection). Cold-start plus connection time is measured with spec 001 manual check 5.
- **NFR-2 Security.** Least-privilege IAM, no public database, TLS everywhere, no secrets in the repository or in Lambda environment variables.
- **NFR-3 Cost.** Expected traffic is low. Database capacity in `dev` shall be the minimum available, including scaling to zero when idle. The choice for `prod` shall be justified in the plan.
- **NFR-4 Reproducibility.** Destroying and recreating an environment from the template shall give the same result, apart from data.
- **NFR-5 Observability.** Errors from Lambda and the API shall be visible in CloudWatch. No alerting is required in this MVP.

## 7. Edge Cases

| # | Situation | Expected behavior |
|---|---|---|
| EC-1 | The database is unreachable or rejects a connection | The API returns `500 { "error": "internal_error" }` (spec 001 AC-6.4); details only in logs |
| EC-2 | A browser from a different origin calls the API | The browser blocks it (AC-2.4) |
| EC-3 | A user opens a deep link such as `/anything` | CloudFront serves the app (AC-4.3) |
| EC-4 | A migration fails halfway | The transaction rolls back (plan 001, section 2) and the release stops |
| EC-5 | A new frontend is deployed while users have the old one cached | New visitors get the new version (AC-4.5) |

## 8. Out of Scope

- A custom domain name and TLS certificate (the default CloudFront and API Gateway URLs are used until a later spec). Q-3 asks to confirm.
- A CI/CD pipeline (GitHub Actions or other). Deployment is run by a human from a terminal in this MVP.
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

No new npm packages are introduced by this spec. Tooling that is not a project dependency shall be documented with its required version in the deployment documentation.

## 10. Completion Criteria

1. Every functional requirement (FR-1 to FR-6) is verified by a documented manual check or an automated check, since infrastructure cannot be unit tested like application code.
2. `dev` and `prod` each serve the directory of spec 001 over HTTPS from their own URL.
3. The spec 001 manual checks (inactive rows, WhatsApp, layout, accessibility, performance, freshness) pass in `dev`.
4. The database is confirmed unreachable from the public internet.
5. Deployment, migration, and rollback are documented and have been executed at least once in `dev`.
6. This spec is marked `Status: Approved` by a human before planning starts.

## 11. Open Questions

Resolved on 2026-10-23:

- **Q-1.** Region is `us-east-1` (I-6 confirmed). Latency from Barranquilla is still measured before `prod` is created.
- **Q-2.** Aurora Serverless v2 in both environments. `dev` scales to zero when idle. `prod` keeps a minimum capacity above zero so users never wait for a resume (details in the plan).
- **Q-3.** No custom domain for the first release (stays out of scope, section 8).
- **Q-5.** CloudWatch log retention is 30 days. `prod` backup retention is 7 days. `dev` uses the minimum.
- **Q-7.** One AWS account holds both environments, separated by resource names and tags.

- **Q-4.** Migrations run through a migration Lambda in the VPC invoked by the deploy command (AC-5.2a). The same mechanism may run the `dev` seed script once it is approved in a task list.
- **Q-6.** Obsolete: RDS Proxy is not used now (I-4). The only managed secret is the Aurora master user secret needed for the bootstrap migration (I-5, Q-4).
- **Q-8.** RDS Proxy is deferred. It is added later through a spec change if connection exhaustion appears (decided 2026-10-23).
- **Q-9.** `backend/seeds/dev_businesses.sql` (sample rows, `dev` only, never run in `prod`) is approved as a deliverable.
