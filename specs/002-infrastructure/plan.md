# Plan 002: Hosting, Deployment, and Infrastructure

- **Status:** Approved (approved by the project owner in chat on 2026-10-24)
- **Spec:** [spec.md](./spec.md) (Approved)
- **Created:** 2026-10-23

Scope: AWS resources, the SAM template, the deploy and migration process, CI, and the deployment documentation. Application behavior is defined by spec 001 and is not changed here.

## 1. Technical Approach

```
Browser
  -> CloudFront (HTTPS) -> private S3 bucket (built React app, via Origin Access Control)
  -> API Gateway HTTP API  GET /businesses   (CORS: CloudFront origin of the same environment)
       -> Lambda "api" (no VPC)
            -> RDS Data API (HTTPS, IAM)  -> Aurora PostgreSQL Serverless v2 (private subnets, no inbound rules)

Developer machine: infra/deploy.sh -> backend/scripts/migrate.ts -> RDS Data API -> Aurora
```

One SAM template, `infra/template.yaml`, deployed once per environment with `sam deploy --config-env dev|prod`. Environments differ only by parameters (spec AC-1.2).

## 2. Verified AWS Facts (checked 2026-10-23 and 2026-10-24)

Each fact was checked against the official AWS documentation. Sources are listed in section 11.

| # | Fact | Consequence |
|---|---|---|
| V-1 | Aurora Serverless v2 can scale to 0 ACU and auto-pause when there are no connections. RDS Proxy would prevent this. | `dev` can pause (P-1). No proxy. |
| V-2 | Aurora PostgreSQL 17 is under standard support until 28 February 2030 (LTS 17.7). PostgreSQL 13 and 12 are out of standard support. | Use PostgreSQL 17 (P-2). |
| V-3 | `gen_random_uuid()` is part of PostgreSQL core since version 13. | The `businesses` migration can use it. |
| V-4 | The RDS Data API supports Aurora PostgreSQL Serverless v2 from version 17.4 in `us-east-1`. It runs queries on the writer instance only, has a 1 MiB response limit, and is not available on T instance classes. | One `db.serverless` writer is enough. A few hundred businesses are far below 1 MiB. |
| V-5 | The HTTP endpoint is disabled by default and is enabled per cluster (`EnableHttpEndpoint`). `ExecuteStatement` takes the cluster ARN, a secret ARN, the SQL, and named parameters. Calls without a transaction commit automatically. `BeginTransaction`, `CommitTransaction`, and `RollbackTransaction` exist for explicit transactions. | Parameterized queries (AGENTS.md) and one transaction per migration file are both possible. |
| V-6 | When the instance is paused, a Data API call fails with `DatabaseResumingException` and resumes the instance; the caller should wait a few seconds and retry. Resume typically takes about 15 seconds, and 30 seconds or more after 24 hours paused. | No retry (P-12): in `dev` the first request after a pause fails and a later one succeeds. `prod` never pauses. |
| V-7 | Access is authorized with IAM: `rds-data:*` actions on the cluster ARN plus `secretsmanager:GetSecretValue` on the database secret. Aurora can create and rotate the master user secret (`ManageMasterUserPassword`). | No database users to create, no bootstrap step. |
| V-8 | Lambda runtime `nodejs24.x` is available until 30 April 2028. | Use `nodejs24.x` (P-3). |

## 3. Decisions

| # | Decision | Reason |
|---|---|---|
| P-1 | Aurora Serverless v2 capacity: `dev` 0 to 1 ACU (auto-pause after 3600 s idle); `prod` 0.5 to 2 ACU (never pauses). | `dev` costs almost nothing when idle; `prod` visitors never wait for a resume (NFR-1). |
| P-2 | Aurora PostgreSQL 17 (latest 17.x minor in `us-east-1` at deploy time, at least 17.4 for the Data API), one `db.serverless` writer, no readers. **Chosen: 17.11** (latest 17.x in `us-east-1` on 2026-10-26 per `aws rds describe-db-engine-versions`, Serverless v2 minimum capacity 0 supported; recorded in 002-T2). | Long support; the Data API uses the writer only. |
| P-3 | Lambda `nodejs24.x`, `arm64`, 256 MB, timeout 10 s in both environments, **not in a VPC** | No VPC networking needed with the Data API. |
| P-4 | API Gateway HTTP API (not REST API) | Cheaper and simpler, native CORS, one route. |
| P-5 | Network for the database only: a VPC with two private subnets in two Availability Zones (required by the DB subnet group) and a database security group with **no inbound rules**. No NAT, no internet gateway, no VPC endpoints. | The database is unreachable over the network; only the Data API reaches it (AC-3.2). |
| P-6 | One database credential: the Aurora-managed master user secret, used only through the Data API. No `app_user` or `migrator` roles. | No bootstrap problem. Trade-off in R-2. |
| P-7 | Frontend cache: hashed asset names with long cache, `index.html` not cached, CloudFront invalidation of `/index.html` on deploy | AC-4.5 |
| P-9 | Region `us-east-1`, single AWS account; names carry the environment (for example `alameda-dev-api`) and every resource is tagged `Environment` and `Project` | Spec I-1, I-6 |
| P-10 | Migrations and seed run from the developer's machine with `node backend/scripts/migrate.ts <env> [--seed]`, through the Data API, using the developer's AWS credentials. Node.js 24 runs TypeScript files directly by stripping types, so no extra tool is needed (to confirm in 001-T6). | No migration Lambda, no bundled `.sql` files. |
| P-11 | Migration files hold exactly one SQL statement each. The runner runs each file in its own Data API transaction and records it in `schema_migrations` in the same transaction. | Avoids depending on multi-statement support in the Data API, and keeps every file atomic. |
| P-12 | Data API calls go through one small wrapper that passes named parameters and supports transactions. It does **not** retry: a `DatabaseResumingException` fails the request. | Simpler code. Only `dev` pauses (P-1); its first request after a pause shows the error screen, and "Reintentar" or re-running the migration script works once the database is awake. |
| P-13 | CI: `.github/workflows/ci.yml` on pull requests to `main`: pnpm install with the frozen lockfile, lint, typecheck, test. No AWS credentials, no deploy. | Spec FR-8, constitution 4 |
| P-14 | Delivery: one branch and one pull request per milestone, one commit per task | Owner decision 2026-10-24 |

## 4. Repository Layout (new files)

| File | Purpose |
|---|---|
| `infra/template.yaml` | SAM template: database network, Aurora, API Lambda, HTTP API, S3, CloudFront, log group, IAM role |
| `infra/samconfig.toml` | `dev` and `prod` deploy parameters. No secrets, no account IDs. |
| `infra/deploy.sh` | Deploy sequence (section 6) |
| `infra/README.md` | Prerequisites, deploy, migrate, seed, rollback, verification results |
| `backend/scripts/migrate.ts` | Command line: reads stack outputs (cluster ARN, secret ARN), runs `runMigrations` (plan 001) through the Data API; `--seed` runs the seed, refused unless the environment is `dev` |
| `backend/migrations/001_create_businesses.sql` | The `businesses` table (plan 001 section 2) |
| `backend/migrations/NNN_*.sql` (data) | Real business rows (spec FR-7), one `INSERT` per file, written in M5 with data from the team |
| `backend/seeds/dev_businesses.sql` | Sample rows for `dev` only, one upsert statement (spec AC-7.3) |
| `.github/workflows/ci.yml` | CI (P-13) |

## 5. Template Resources

| Group | Resources |
|---|---|
| Network | VPC, two private subnets (two AZs), `db-sg` with no inbound rules |
| Database | `AWS::RDS::DBSubnetGroup`; `AWS::RDS::DBCluster` (aurora-postgresql 17, encrypted, `EnableHttpEndpoint: true`, `ManageMasterUserPassword: true`, Serverless v2 scaling per P-1, backup retention 7 days in `prod` and 1 day in `dev`, deletion protection and `Retain` policy in `prod`); one `AWS::RDS::DBInstance` (`db.serverless`, not publicly accessible) |
| Backend | `AWS::Serverless::Function` `api` (no VPC; environment variables: cluster ARN, secret ARN, database name), `AWS::Serverless::HttpApi` with `GET /businesses` and CORS for the CloudFront origin, log group with 30-day retention |
| IAM | `api` role: logs, `rds-data:ExecuteStatement` on the cluster ARN only, `secretsmanager:GetSecretValue` on the master secret only |
| Frontend | Private S3 bucket (block public access, encrypted), CloudFront with Origin Access Control, HTTPS redirect, cache behavior per P-7 |
| Outputs | API URL, CloudFront domain, bucket name, distribution id, cluster ARN, secret ARN (an ARN is not a secret) |

## 6. Deployment Order (spec FR-6)

1. `sam build` and `sam deploy --config-env <env>`.
2. `node backend/scripts/migrate.ts <env>`; stop on error (EC-4). The new API code is already live, so every migration must work with both the previous and the new backend (spec AC-5.3).
3. Build the frontend with `VITE_API_BASE_URL` from the stack output (AC-4.4).
4. `aws s3 sync`, then invalidate `/index.html` (P-7).
5. Print the CloudFront URL.

`prod` requires a typed confirmation (AC-6.2). The developer's AWS credentials need permission to deploy the stack and to call the Data API for the migration step; the README lists them.

**Rollback (AC-6.3).** Redeploy the previous Git commit with the same command. Migrations are forward-only; a bad migration is fixed by a new file.

## 7. Backend Changes Required by This Plan

- `backend/src/db/dataApi.ts` (plan 001): the Data API wrapper of P-12, used by the repository and by `runMigrations`.
- `backend/scripts/migrate.ts` (P-10).
- `esbuild` is a backend dev dependency (spec section 9). `backend/Makefile` runs it with `pnpm exec` for the SAM makefile builder (`BuildMethod: makefile`), so the bundle uses the versions in `pnpm-lock.yaml`. SAM's esbuild builder is not used because it runs `npm install`, which ignores `pnpm-lock.yaml`.

## 8. Verification

Checks are written first and recorded in `infra/README.md`. Failure cases (EC-1, EC-4) are covered by unit tests rather than drills against `dev`.

| Check | Procedure | Covers |
|---|---|---|
| Template valid | `sam validate --lint` | AC-1.1, AC-1.2 |
| API reachable | `curl -i https://<api>/businesses` returns `200` and the plan 001 contract | AC-2.1, AC-2.2 |
| Seeded data | After `migrate.ts dev --seed`, only active rows, FR-5 order, invalid numbers as `null` | spec 001 AC-1.2, AC-2.3, FR-5 |
| CORS | Allowed origin gets the header; another origin does not | AC-2.4, EC-2 |
| Least privilege | The `api` role policy lists only the three permissions of section 5, scoped to this environment's ARNs | AC-2.3 |
| Database private | Cluster and instance are not publicly accessible; `db-sg` has no inbound rules | AC-3.1, AC-3.2 |
| Encryption | `StorageEncrypted: true`; the Data API is HTTPS only | AC-3.3 |
| Backups and logs | 7-day backups in `prod`; 30-day log retention | AC-3.4, AC-2.5 |
| Frontend HTTPS | HTTP redirects; direct bucket URL returns `403` | AC-4.1, AC-4.2 |
| Frontend freshness | Changed frontend visible after reload | AC-4.5, EC-5 |
| Rollback | Documented in the README (no drill) | AC-6.3 |
| Performance | Spec 001 manual check 5 in `prod`; first request after a `dev` pause recorded | NFR-1 |
| CI | A pull request with a failing test is blocked | FR-8 |
| Data migration | A data migration adds a business; the API shows it | FR-7 |

## 9. Traceability

| Requirement | Covered by |
|---|---|
| FR-1 | Sections 4, 5, P-9, README |
| FR-2 | Section 5 (Backend, IAM), P-3, P-4, P-12 |
| FR-3 | Section 5 (Network, Database), P-1, P-2, P-5, P-6 |
| FR-4 | Section 5 (Frontend), P-7, section 6 |
| FR-5 | P-10, P-11, section 6 |
| FR-6 | Section 6, `infra/deploy.sh`, README |
| FR-7 | Section 4 (data migrations, seed), P-10 |
| FR-8 | P-13 |
| NFR-1 | P-1, P-3, P-12, check "Performance" |
| NFR-2 | P-5, P-6, section 5 (IAM) |
| NFR-3 | P-1, P-2, P-5 (no NAT, no endpoints) |
| NFR-4 | Section 6, same template for both environments |
| NFR-5 | Log group in section 5 |
| EC-1, EC-4 | Unit tests of the endpoint (plan 001) and of `runMigrations` |
| EC-2, EC-5 | Section 8 |

## 10. Risks

| # | Risk | Mitigation |
|---|---|---|
| R-1 | Data API result types differ from a native driver (for example how `TIMESTAMPTZ` and `UUID` come back) | 001-T5 checks the documented formats, and the repository converts explicitly; covered by unit tests with sample responses. |
| R-2 | The API role uses the master credential through the Data API, so a bug could in principle write data. There is no read-only database user. | The repository runs one constant `SELECT` with no user input, and the IAM policy allows only `ExecuteStatement` (no transactions). A read-only user can be added later through a spec change. |
| R-3 | `dev` resume takes 15 to 30 s, and the first request after a pause fails | Accepted for `dev` (P-12). `prod` never pauses. |
| R-4 | Node.js type stripping may not support every TypeScript syntax used in `migrate.ts` | Keep the script to erasable syntax; confirm in 001-T6. Fallback: run it after `tsc` compilation. |
| R-5 | Accidental deletion of the `prod` cluster | Deletion protection, `Retain` policy, final snapshot |
| R-6 | SAM CLI and AWS CLI versions affect the template | Record versions in `infra/README.md` |

## 11. Sources Used

- Aurora Serverless v2 auto-pause: <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html>
- Aurora PostgreSQL release calendar: <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/aurorapostgresql-release-calendar.html>
- Data API regions and engines: <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.Data_API.html>
- Data API limitations: <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.limitations.html>
- Data API `ExecuteStatement`: <https://docs.aws.amazon.com/rdsdataservice/latest/APIReference/API_ExecuteStatement.html>
- Data API access: <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.access.html>
- Lambda runtimes: <https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html>

## 12. Constitution Check

1. **Stack Simplicity:** Complies. Fixed stack plus approved S3, CloudFront, SAM, and GitHub Actions. The Data API is part of Aurora; its client package is approved in spec 001 section 8a.
2. **Spec-Code Alignment:** Complies. Every part traces to an AC or NFR (section 9).
3. **Separation of Concerns:** Complies. Infrastructure holds no business rules; the migration script is a thin command over `runMigrations`.
4. **Testing Standard:** Complies. Unit tests run in CI on every pull request (P-13); infrastructure checks are documented in section 8.
5. **Data Persistence:** Complies. Schema and data changes are versioned SQL files, one statement each, applied by `runMigrations`. Queries are parameterized through the Data API.
6. **Language Standard:** Complies. Everything is in English.
