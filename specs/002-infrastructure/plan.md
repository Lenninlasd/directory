# Plan 002: Hosting, Deployment, and Infrastructure

- **Status:** Approved (RDS Proxy removed, see spec I-4; revised 2026-10-24 with the owner's decisions in section 11)
- **Spec:** [spec.md](./spec.md) (Approved)
- **Created:** 2026-10-23

Scope: AWS resources, the SAM template, the deploy and migration process, and the deployment documentation. Application behavior is defined by spec 001 and is not changed here.

## 1. Technical Approach

```
Browser
  -> CloudFront (HTTPS) -> private S3 bucket (built React app, via Origin Access Control)
  -> API Gateway HTTP API  GET /businesses   (CORS: CloudFront origin of the same environment)
       -> Lambda "api" (in VPC, private subnets)
            -> Aurora PostgreSQL Serverless v2 cluster endpoint (IAM auth, TLS, private subnets)

Deploy command -> aws lambda invoke "migrate" (in VPC) -> Aurora   (schema changes)
```

One SAM template, `infra/template.yaml`, deployed once per environment with `sam deploy --config-env dev|prod`. Environments differ only by parameters (spec AC-1.2).

## 2. Verified AWS Facts (checked 2026-10-23)

Each fact was checked against the official AWS documentation. Sources are listed in section 12.

| # | Fact | Consequence |
|---|---|---|
| V-1 | RDS Proxy keeps an open connection to the database, so Aurora Serverless v2 never auto-pauses while a proxy exists. | This is why the proxy was removed (spec I-4). Without it, `dev` can scale to zero. |
| V-2 | Aurora PostgreSQL 17 is under standard support until 28 February 2030 (LTS 17.7). PostgreSQL 18 (18.3+) is available since June 2026 but has no LTS yet. PostgreSQL 13 and 12 are out of standard support. | Use PostgreSQL 17 (P-2). |
| V-3 | `gen_random_uuid()` is part of PostgreSQL core since version 13, so no extension is needed on 17. | Migration 001 can use it as planned. |
| V-4 | IAM database authentication needs it enabled on the cluster, `rds-db:connect` on the caller's role, and `GRANT rds_iam TO <user>` for each database user. TLS is required. (Documented for RDS Proxy; the same cluster-level requirements apply to direct connections.) | Used by the API and migration Lambdas (P-6). Direct-to-cluster IAM tokens are proven by the first deployment. |
| V-5 | Aurora can create and manage the master user password in Secrets Manager (`--manage-master-user-password`). | Provides the master credential for the bootstrap migration only (Q-2 of this plan). |
| V-6 | Lambda runtimes `nodejs22.x` (deprecation 30 April 2027) and `nodejs24.x` (deprecation 30 April 2028) are available. | Use `nodejs24.x` (P-3). |
| V-7 | A paused Aurora instance resumes in about 15 seconds, and after more than 24 hours paused it can take 30 seconds or more. AWS recommends client connection timeouts longer than that and retrying failed connections. | `dev` accepts a slow first request (P-1). `prod` never pauses. |

## 3. Decisions for Approval

| # | Decision | Alternatives and reason |
|---|---|---|
| P-1 | Aurora Serverless v2 capacity: `dev` minimum 0 ACU (auto-pause after 3600 s idle) and maximum 1 ACU. `prod` minimum 0.5 ACU (never pauses) and maximum 2 ACU. | Confirmed by the owner (no RDS Proxy). `dev` costs almost nothing when idle; its first request after a pause waits about 15 to 30 seconds, so `dev` uses a longer connect timeout and Lambda timeout (P-3) and `connect.ts` retries a failed connection up to 3 times (AWS recommendation). `prod` keeps 0.5 ACU so visitors never wait for a resume (NFR-1). |
| P-2 | Engine: Aurora PostgreSQL 17 (latest 17.x minor in `us-east-1` at deploy time), single writer instance, no reader instance | Long standard support (to 2030). PostgreSQL 18 is newer but has no LTS yet. One instance is enough for the expected load; Multi-AZ readers cost more and are not required by the spec. |
| P-3 | Lambda runtime `nodejs24.x`, architecture `arm64`, memory 256 MB, timeout 10 s in `prod` and 29 s in `dev` (API Gateway HTTP API allows at most 30 s) | Longest support window, lower price on arm64. Values to be tuned after the performance check. |
| P-4 | API Gateway **HTTP API** (not REST API) | Cheaper and simpler, supports CORS natively, and is enough for one `GET` route. SAM expresses it with `AWS::Serverless::HttpApi`. |
| P-5 | Connectivity: two private subnets in two Availability Zones, **no NAT gateway**. The API Lambda needs no internet access, because generating an IAM token (`@aws-sdk/rds-signer`) is a local signing operation. The migration Lambda reads the master secret only for the bootstrap migration, through a Secrets Manager interface VPC endpoint that exists only while `BootstrapMode` is `true` (P-10). | Avoids the NAT cost and the permanent endpoint cost. |
| P-6 | Database users: `app_user` (only `SELECT` on `businesses`, IAM auth) and `migrator` (schema changes, IAM auth). Both get `rds_iam`. Both connect to the cluster endpoint. | Least privilege (spec NFR-2, AC-5.2a). |
| P-7 | Frontend cache: hashed asset names with long cache, `index.html` not cached, plus a CloudFront invalidation of `/index.html` on deploy | Spec AC-4.5 |
| P-8 | SPA fallback: CloudFront custom error response, 403/404 from S3 returns `/index.html` with status 200 | Spec AC-4.3 |
| P-9 | Region `us-east-1` (spec I-6). Single AWS account (spec Q-7) | Resource names carry the environment, for example `alameda-dev-api`, and every resource is tagged `Environment` and `Project`. |
| P-10 | Template parameter `BootstrapMode` (`true` or `false`, default `false`). When `true`, the template creates the Secrets Manager VPC endpoint and gives the migration role `secretsmanager:GetSecretValue` on the master secret. The first deploy of an environment uses `true`; after the bootstrap migration succeeds, the next deploy uses `false`. | Near-zero ongoing cost for a one-time need. |
| P-11 | The migration Lambda accepts three actions: `migrate` (default), `seed` (refused unless `Environment` is `dev`), and `verify` (read-only report run as `migrator`: `has_table_privilege` for `app_user` on `businesses`, and whether connections use TLS). | Gives evidence for the privilege and TLS checks without any human database access. |
| P-12 | Connect timeout per environment: `dev` 25 s (covers an auto-pause resume), `prod` 5 s (never pauses, and must fit inside the 10 s Lambda timeout). Up to 3 connection retries in both. | Avoids a `prod` timeout longer than its Lambda timeout. |
| P-13 | CI: `.github/workflows/ci.yml` runs on pull requests to `main`: pnpm install with the frozen lockfile, lint, typecheck, test. No AWS credentials, no deploy (spec FR-8). | Constitution principle 4 |
| P-14 | Delivery: one branch and one pull request per milestone, one commit per task (AGENTS.md). | Owner decision 2026-10-24 |

## 4. Repository Layout (new files)

| File | Purpose |
|---|---|
| `infra/template.yaml` | SAM template: network, database, Lambdas, HTTP API, S3, CloudFront, log groups, IAM roles |
| `infra/samconfig.toml` | `dev` and `prod` deploy parameters. Contains no secrets and no account IDs. |
| `infra/README.md` | Deployment guide: prerequisites, one-time setup, deploy, migrate, rollback (spec AC-1.3, AC-6.1, AC-6.3) |
| `backend/src/handlers/migrate.ts` | Migration Lambda entry: calls the shared `runMigrations` logic and returns a summary |
| `backend/migrations/001_create_database_users.sql` | Creates the `app_user` and `migrator` roles and grants, and default privileges so tables created by `migrator` are readable by `app_user` (see R-4). Runs before `002_create_businesses.sql`. |
| `backend/seeds/dev_businesses.sql` | Sample rows for `dev` only. Approved (spec Q-9). Never run in `prod`. Idempotent (upsert), so a changed row can be applied again for the freshness check. |
| `backend/migrations/NNN_*.sql` (data) | Real business rows, added through reviewed data migrations (spec FR-7). The first one is written in M5 with data provided by the team. |
| `.github/workflows/ci.yml` | CI for tests (P-13) |
| `infra/deploy.sh` | Documented sequence: `sam build`, `sam deploy`, invoke migrate, build frontend, sync to S3, invalidate CloudFront |

The migration logic (read files in order, one transaction per file, record in `schema_migrations`) lives in `backend/src/migrations/runMigrations.ts` and is used only by the migration Lambda (plan 001, D-7). There is no command-line script, since no database is reachable from outside the VPC.

## 5. Template Resources

| Group | Resources |
|---|---|
| Network | VPC, two private subnets (two AZs), route table, security groups: `lambda-sg` (outbound to `db-sg`, and to the Secrets Manager endpoint while it exists), `db-sg` (inbound only from `lambda-sg`) |
| Database | `AWS::RDS::DBSubnetGroup`, `AWS::RDS::DBCluster` (aurora-postgresql 17, encrypted, IAM auth enabled, Serverless v2 scaling per P-1, managed master user secret, backup retention 7 days in `prod` and 1 day in `dev`, deletion protection in `prod`), one `AWS::RDS::DBInstance` (`db.serverless`) |
| Backend | `AWS::Serverless::Function` `api` and `migrate` (both in the VPC), a Secrets Manager interface VPC endpoint for `migrate` only when `BootstrapMode` is `true` (P-10), `AWS::Serverless::HttpApi` with the `GET /businesses` route and CORS, log groups with 30-day retention |
| IAM | Both roles: logs and the VPC network interface permissions every VPC Lambda needs. `api` role: `rds-db:connect` for `app_user` only. `migrate` role: `rds-db:connect` for `migrator`, and `secretsmanager:GetSecretValue` on the master secret only when `BootstrapMode` is `true`. |
| Frontend | Private S3 bucket (block all public access, encrypted), CloudFront distribution with Origin Access Control, HTTPS redirect, SPA fallback, response headers policy |
| Outputs | API URL, CloudFront domain, cluster endpoint name. Used by the deploy script. No secrets. |

## 6. Deployment Order (spec FR-6)

1. `sam build` and `sam deploy --config-env <env>` (creates or updates the stack).
2. Invoke the `migrate` Lambda and fail the deploy if it reports an error (EC-4). The new API code is already live at this point, so every migration must work with both the previous and the new backend (spec AC-5.3).
3. Build the frontend with `VITE_API_BASE_URL` set to the stack output (AC-4.4).
4. `aws s3 sync` of the build, then a CloudFront invalidation of `/index.html` (P-7).
5. Print the CloudFront URL.

Deploying to `prod` is a separate, explicit command with a confirmation prompt (AC-6.2).

**First deploy of an environment:** run with `BootstrapMode=true`, which applies the users migration as the master user and then the rest as `migrator`. Then deploy again with `BootstrapMode=false` to remove the endpoint and the secret permission. The README describes both steps.

**Rollback (AC-6.3).** Backend: redeploy the previous Git commit with the same command (SAM versions Lambda code through CloudFormation). Frontend: rebuild and sync the previous commit, then invalidate. Database migrations are forward-only; a bad migration is fixed by a new migration file, never by editing an applied one.

## 7. Backend Changes Required by This Plan

These are small and belong to the tasks of this spec, not to spec 001:

- `src/db/connect.ts` (plan 001) reads the cluster endpoint, port, database name, user, and connect timeout from environment variables set by the template, generates the IAM token with `@aws-sdk/rds-signer`, connects with TLS, and retries a failed connection up to 3 times (P-12, V-7).
- `src/handlers/migrate.ts` is new (section 4).
- The Lambda packages are built by the SAM esbuild builder (`sam build`), which needs `esbuild` installed as a backend dev dependency (approved in spec section 9). How `.sql` files are included in the bundle is verified in the SAM documentation in 002-T4.

## 8. Testing and Verification Strategy

Infrastructure cannot be unit tested like application code, so checks are scripted or documented (spec section 10, criterion 1). Authoring order for each infrastructure task: write the check first, see it fail, then add the resources.

| Check | Command or procedure | Covers |
|---|---|---|
| Template is valid | `sam validate --lint` | AC-1.1, AC-1.2 |
| Same template, two environments | Deploy `dev`, then `prod` with only parameter differences; diff of resolved parameters in the README | AC-1.2 |
| API reachable | `curl -i https://<api>/businesses` returns `200` and the contract of plan 001 section 3 | AC-2.1 |
| API contract after migration + seed | The response lists only the seeded active rows | spec 001 AC-1.2 |
| CORS | Request with `Origin: <cloudfront origin>` receives the allow header. Request with another origin does not. | AC-2.4, EC-2 |
| Least privilege | `verify` action (P-11) reports that `app_user` has `SELECT` and no `INSERT`, `UPDATE`, or `DELETE` on `businesses`. The `api` role policy lists only `app_user`. | AC-2.3, P-6 |
| Database is private | `nc` or `psql` from a laptop to the cluster endpoint times out. The cluster has `PubliclyAccessible: false`. | AC-3.1, AC-3.2 |
| Encryption | `describe-db-clusters` shows `StorageEncrypted: true`. The cluster parameter `rds.force_ssl` is `1`, and the `verify` action reports that its own connection uses TLS. | AC-3.3 |
| Backups and logs | `describe-db-clusters` shows 7 days in `prod`. `describe-log-groups` shows 30 days. | AC-3.4, AC-2.5 |
| Frontend over HTTPS | `curl -I http://<cloudfront>` redirects. The bucket URL directly returns `403`. | AC-4.1, AC-4.2 |
| SPA fallback | `curl -i https://<cloudfront>/anything` returns `200` and the app HTML | AC-4.3, EC-3 |
| Freshness | Deploy a changed frontend, reload, see the change without a manual cache clear | AC-4.5, EC-5 |
| Migration failure | On a throwaway branch (never merged), a deliberately broken migration deployed to `dev` rolls back and the deploy stops. Then redeploy `main`. | EC-4 |
| DB failure | Deploy `dev` with the API database user parameter set to a user that does not exist, call the API: response is `500 {"error":"internal_error"}` and the details appear only in CloudWatch. Then redeploy with the right user. | EC-1 |
| Rollback | Execute the README rollback once in `dev` | AC-6.3 |
| Performance | Run spec 001 manual check 5 in `prod` (including a cold start). In `dev`, record the time of the first request after a pause. | NFR-1 |
| CI | A pull request with a failing test is blocked; the same pull request with the fix passes | FR-8 |
| Data migration | A data migration adds a business; the API shows it after deploy | FR-7 |

## 9. Traceability

| Requirement | Covered by |
|---|---|
| FR-1 (AC-1.1 to 1.3) | Sections 4, 5, P-9, README |
| FR-2 (AC-2.1 to 2.5) | Section 5 (Backend, IAM), P-4, P-5, P-6 |
| FR-3 (AC-3.1 to 3.5) | Section 5 (Network, Database), P-1, P-2, V-2 |
| FR-4 (AC-4.1 to 4.5) | Section 5 (Frontend), P-7, P-8, section 6 |
| FR-5 (AC-5.1 to 5.3, 5.2a) | Sections 4, 6, 7, P-6 |
| FR-6 (AC-6.1 to 6.3) | Section 6, `infra/deploy.sh`, README |
| FR-7 (AC-7.1 to 7.3) | Section 4 (data migrations, seed), P-11 |
| FR-8 (AC-8.1, 8.2) | P-13, section 4 |
| NFR-1 | P-1, P-3, V-7, check "Performance" |
| NFR-2 | P-5, P-6, section 5 (IAM, Network) |
| NFR-3 | P-1, P-2 |
| NFR-4 | Section 6, same template for both environments |
| NFR-5 | Log groups in section 5, no alerting |
| EC-1 to EC-5 | Section 8 checks |

## 10. Risks

| # | Risk | Mitigation |
|---|---|---|
| R-1 | IAM tokens connecting directly to the cluster endpoint have not been proven in this project | First infrastructure task in `dev` proves connect, `rds_iam`, and TLS before anything else is built on it |
| R-2 | Without a proxy, many concurrent Lambda invocations can exhaust Aurora connections (plan 001, R-3) | Low traffic expected. Add RDS Proxy through a spec change if it appears (spec Q-8). Application code does not change; only the host changes. |
| R-3 | VPC-attached Lambda cold starts are slower than non-VPC ones, and `dev` resumes can take 15 to 30 s | Measure in the performance check. `prod` never pauses. Memory can be raised. Escalate through a spec change if NFR-1 fails. |
| R-4 | Creating database users and `GRANT rds_iam` must be versioned too | Put them in `001_create_database_users.sql`. Bootstrap: when the `migrator` role does not exist, the migration Lambda applies only this file as the master user, then reconnects as `migrator` for the rest |
| R-5 | Bootstrap needs the master user, which needs a Secrets Manager VPC endpoint | Resolved by P-10: the endpoint exists only while `BootstrapMode` is `true`. Someone could forget to switch it off; the README and the deploy script print a reminder while it is `true`. |
| R-6 | The IAM token used by Lambda expires after 15 minutes | One connection per invocation (plan 001, D-3) means a fresh token each time |
| R-7 | Exact versions of SAM CLI and AWS CLI affect the template | Record the versions used in `infra/README.md` (spec section 9) |
| R-8 | An accidental `sam delete` or stack replacement of the cluster in `prod` destroys data | `DeletionProtection` and a `Retain` deletion policy on the cluster in `prod`, and a final snapshot policy |

## 11. Decisions Taken (2026-10-23)

- **Q-1.** No RDS Proxy now. `dev` scales to zero, `prod` runs 0.5 to 2 ACU. The proxy may be added later through a spec change.
- **Q-2.** The very first role-creating migration runs in the migration Lambda with the Aurora-managed master secret, only when the `migrator` role does not exist. All later migrations run as `migrator`.
- **Q-4 (tasks).** The seed runs through the migration Lambda when invoked with `{"seed": true}` and only when `Environment` is `dev`. Local frontend development uses a Vite dev proxy, so CORS stays limited to the CloudFront origin in both environments.
- **Q-3.** `backend/seeds/dev_businesses.sql` is approved for `dev` only.

Added 2026-10-24:

- Business data is loaded through versioned data migrations (spec FR-7).
- Minimal CI for tests (spec FR-8, P-13). Continuous deployment stays out of scope.
- Migrations must be backward compatible instead of running before the stack update (spec AC-5.3).
- Packages `esbuild` and `@aws-sdk/client-secrets-manager` approved (spec section 9).
- One branch and pull request per milestone (P-14).
- Secrets Manager endpoint only during bootstrap (P-10).
- `verify` action and a configuration-based failure drill (P-11, section 8).
- No migration command-line script (section 4).

No open questions remain.

## 12. Sources Used

- Aurora Serverless v2 auto-pause: <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html>
- Aurora PostgreSQL release calendar: <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/aurorapostgresql-release-calendar.html>
- RDS Proxy end-to-end IAM: <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-iam-migration.html>
- Lambda runtimes: <https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html>

## 13. Constitution Check

1. **Stack Simplicity:** Complies. Only the fixed stack plus the approved S3 + CloudFront and SAM. RDS Proxy is deliberately left out to keep it simple. New tooling and the two backend packages are approved in spec section 9.
2. **Spec-Code Alignment:** Complies. Every part traces to an AC or NFR (section 9). Anything not covered by the spec is raised as a question (P-1, Q-2, Q-3).
3. **Separation of Concerns:** Complies. The migration Lambda is a thin handler over shared migration logic. Infrastructure holds no business rules.
4. **Testing Standard:** Complies. Unit tests run in CI on every pull request (P-13). Infrastructure checks are written first and documented in section 8, since unit tests do not apply to a template.
5. **Data Persistence:** Complies. All schema and data changes, including database users, are versioned SQL files applied by the migration mechanism. Versions and IAM behavior were checked against the AWS documentation (section 2).
6. **Language Standard:** Complies. Everything is in English. The infrastructure has no UI text.
