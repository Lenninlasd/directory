# Plan 002: Hosting, Deployment, and Infrastructure

- **Status:** Approved (approved by the project owner in chat on 2026-10-24; frontend hosting change approved on 2026-11-02)
- **Spec:** [spec.md](./spec.md) (Approved)
- **Created:** 2026-10-23
- **Last updated:** 2026-11-02

Scope: AWS resources, the Cloudflare Pages projects, the SAM template, the deploy and migration process, CI, and the deployment documentation. Application behavior is defined by spec 001 and is not changed here.

## 1. Technical Approach

```
Browser
  -> Cloudflare Pages (HTTPS, alameda-<env>.pages.dev) -> built React app
  -> API Gateway HTTP API  GET /businesses   (CORS: Pages origin of the same environment)
       -> Lambda "api" (no VPC)
            -> RDS Data API (HTTPS, IAM)  -> Aurora PostgreSQL Serverless v2 (private subnets, no inbound rules)

Developer machine: infra/deploy.sh -> backend/scripts/migrate.ts -> RDS Data API -> Aurora
                   infra/deploy.sh -> wrangler pages deploy -> Cloudflare Pages
```

One SAM template, `infra/template.yaml`, deployed once per environment with `sam deploy --config-env dev|prod`. Environments differ only by parameters (spec AC-1.2).

## 2. Verified AWS Facts (checked 2026-10-23 and 2026-10-24)

Each fact was checked against the official AWS documentation. Sources are listed in section 10.

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

### Verified Cloudflare Pages Facts (checked 2026-11-02)

| # | Fact | Consequence |
|---|---|---|
| C-1 | Direct Upload: `wrangler pages project create` creates a project, served at `<project>.pages.dev`; `wrangler pages deploy <dir>` uploads a folder, and a deploy to the production branch is served at that URL. A Direct Upload project cannot switch to Git integration later. | Deploy from the developer's machine (P-14). No continuous deployment, as the spec requires. |
| C-2 | Pages sends an `ETag` and `Cache-Control: public, max-age=0, must-revalidate` by default. A new deploy does not purge older files from the CDN at once; they can stay up to one week. | `index.html` is revalidated on every visit. Hashed asset names make old cached files harmless (P-7). |
| C-3 | A `_headers` file in the build output sets response headers per path, with `*` as a splat. | `frontend/public/_headers` (copied by Vite to `dist/`) sets the long cache for `/assets/*` (P-7). |
| C-4 | Without a top-level `404.html`, Pages treats the site as a single-page app and serves `/` for any unknown path. | Accepted; routing is out of scope (spec section 8). |
| C-5 | Any successful production deployment can be restored from the dashboard (Deployments, Rollback to this deployment). | Frontend rollback (section 6). |
| C-6 | Free plan: 20,000 files per site, 25 MiB per file. | The built frontend is far below both. |

The documentation does not state that `pages.dev` redirects HTTP to HTTPS. 002-T7 checks it with `curl` (R-8).

## 3. Decisions

| # | Decision | Reason |
|---|---|---|
| P-1 | Aurora Serverless v2 capacity: `dev` 0 to 1 ACU (auto-pause after 3600 s idle); `prod` 0.5 to 2 ACU (never pauses). | `dev` costs almost nothing when idle; `prod` visitors never wait for a resume (NFR-1). |
| P-2 | Aurora PostgreSQL 17 (latest 17.x minor in `us-east-1` at deploy time, at least 17.4 for the Data API), one `db.serverless` writer, no readers. **Chosen: 17.11** (latest 17.x in `us-east-1` on 2026-10-26 per `aws rds describe-db-engine-versions`, Serverless v2 minimum capacity 0 supported; recorded in 002-T2). | Long support; the Data API uses the writer only. |
| P-3 | Lambda `nodejs24.x`, `arm64`, 256 MB, timeout 10 s in both environments, **not in a VPC** | No VPC networking needed with the Data API. |
| P-4 | API Gateway HTTP API (not REST API) | Cheaper and simpler, native CORS, one route. |
| P-5 | Network for the database only: a VPC with two private subnets in two Availability Zones (required by the DB subnet group) and a database security group with **no inbound rules**. No NAT, no internet gateway, no VPC endpoints. | The database is unreachable over the network; only the Data API reaches it (AC-3.2). |
| P-6 | One database credential: the Aurora-managed master user secret, used only through the Data API. No `app_user` or `migrator` roles. | No bootstrap problem. Trade-off in R-2. |
| P-7 | Frontend cache: files under `assets/` (hashed names from Vite) get `Cache-Control: public, max-age=31536000, immutable` through `frontend/public/_headers`; `index.html` keeps the Pages default (`max-age=0, must-revalidate`). No purge on deploy. | AC-4.5, C-2, C-3 |
| P-9 | Region `us-east-1`, single AWS account; names carry the environment (for example `alameda-dev-api`) and every resource is tagged `Environment` and `Project` | Spec I-1, I-6 |
| P-10 | Migrations and seed run from the developer's machine with `node backend/scripts/migrate.ts <env> [--seed]`, through the Data API, using the developer's AWS credentials. Node.js 24 runs TypeScript files directly by stripping types, so no extra tool is needed. | No migration Lambda, no bundled `.sql` files. |
| P-11 | Migration files hold exactly one SQL statement each. The runner runs each file in its own Data API transaction and records it in `schema_migrations` in the same transaction. | Avoids depending on multi-statement support in the Data API, and keeps every file atomic. |
| P-12 | Data API calls go through one small wrapper that passes named parameters and supports transactions. It does **not** retry: a `DatabaseResumingException` fails the request. | Simpler code. Only `dev` pauses (P-1); its first request after a pause shows the error screen, and "Reintentar" or re-running the migration script works once the database is awake. |
| P-13 | CI: `.github/workflows/ci.yml` on pull requests to `main`: pnpm install with the frozen lockfile, lint, typecheck, test. No AWS credentials, no deploy. | Spec FR-8, constitution 4 |
| P-14 | Frontend hosting: one Cloudflare Pages project per environment (`alameda-dev`, `alameda-prod`), production branch `main`, created once with Wrangler (spec AC-1.3a). Deploys use `pnpm dlx wrangler@4.151.1 pages deploy frontend/dist --project-name alameda-<env> --branch main`, authenticated with `wrangler login`. The template parameter `FrontendOrigin` holds the project's `https://` URL, set per environment in `infra/samconfig.toml`; the API CORS allows only that origin. | Spec I-3, AC-2.4, AC-4.1. The URL is a parameter because Cloudflare may add a suffix when the project name is taken. |

## 4. Repository Layout (new files)

| File | Purpose |
|---|---|
| `infra/template.yaml` | SAM template: database network, Aurora, API Lambda, HTTP API, log group, IAM role |
| `infra/samconfig.toml` | `dev` and `prod` deploy parameters, including `FrontendOrigin`. No secrets, no account IDs. |
| `frontend/public/_headers` | Cache headers for `/assets/*` (P-7) |
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
| Backend | `AWS::Serverless::Function` `api` (no VPC; environment variables: cluster ARN, secret ARN, database name), `AWS::Serverless::HttpApi` with `GET /businesses` and CORS for the `FrontendOrigin` parameter, log group with 30-day retention |
| IAM | `api` role: logs, `rds-data:ExecuteStatement` on the cluster ARN only, `secretsmanager:GetSecretValue` on the master secret only |
| Frontend | None on AWS; hosted on Cloudflare Pages (P-14) |
| Parameters | `Environment`, `DatabaseName`, `FrontendOrigin` (pattern `https://[a-z0-9.-]+`) |
| Outputs | API URL, frontend URL (`FrontendOrigin`), cluster ARN, secret ARN (an ARN is not a secret) |

## 6. Deployment Order (spec FR-6)

1. `sam build` and `sam deploy --config-env <env>`.
2. `node backend/scripts/migrate.ts <env>`; stop on error (EC-4). The new API code is already live, so every migration must work with both the previous and the new backend (spec AC-5.3).
3. Build the frontend with `VITE_API_BASE_URL` from the stack output (AC-4.4).
4. `pnpm dlx wrangler@4.151.1 pages deploy frontend/dist --project-name alameda-<env> --branch main` (P-14).
5. Print the frontend URL.

`prod` requires a typed confirmation (AC-6.2). The developer's AWS credentials need permission to deploy the stack and to call the Data API for the migration step; the README lists them. The developer runs `wrangler login` once before the first deploy.

**Rollback (AC-6.3).** Redeploy the previous Git commit with the same command. The frontend can also be restored alone from the Pages dashboard (C-5). Migrations are forward-only; a bad migration is fixed by a new file.

## 7. Backend Build

`esbuild` is a backend dev dependency (spec section 9). `backend/Makefile` runs it with `pnpm exec` for the SAM makefile builder (`BuildMethod: makefile`), so the bundle uses the versions in `pnpm-lock.yaml`. SAM's esbuild builder is not used because it runs `npm install`, which ignores `pnpm-lock.yaml`.

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
| Frontend HTTPS | `https://<project>.pages.dev/` serves the app; the `http://` URL redirects to `https://` | AC-4.1, AC-4.2 |
| Frontend cache headers | A file under `assets/` has the `immutable` header; `index.html` has `max-age=0` | P-7 |
| Frontend freshness | Changed frontend visible after reload | AC-4.5, EC-5 |
| Rollback | Documented in the README (no drill) | AC-6.3 |
| Performance | Spec 001 manual check 5 in `prod`; first request after a `dev` pause recorded | NFR-1 |
| CI | A pull request with a failing test is blocked | FR-8 |
| Data migration | A data migration adds a business; the API shows it | FR-7 |

## 9. Risks

| # | Risk | Mitigation |
|---|---|---|
| R-1 | Data API result types differ from a native driver (for example how `TIMESTAMPTZ` and `UUID` come back) | 001-T5 checks the documented formats, and the repository converts explicitly; covered by unit tests with sample responses. |
| R-2 | The API role uses the master credential through the Data API, so a bug could in principle write data. There is no read-only database user. | The repository runs one constant `SELECT` with no user input, and the IAM policy allows only `ExecuteStatement` (no transactions). A read-only user can be added later through a spec change. |
| R-3 | `dev` resume takes 15 to 30 s, and the first request after a pause fails | Accepted for `dev` (P-12). `prod` never pauses. |
| R-5 | Accidental deletion of the `prod` cluster | Deletion protection, `Retain` policy, final snapshot |
| R-6 | SAM CLI, AWS CLI, and Wrangler versions affect the template and the deploy | Record versions in `infra/README.md`; Wrangler is pinned in the deploy command |
| R-7 | `wrangler login` gives the developer's machine broad access to the Cloudflare account | Accepted for a one-person project (spec section 3). A Pages-only API token can replace it through a spec change. |
| R-8 | The HTTP to HTTPS redirect on `pages.dev` is not stated in the Pages documentation | 002-T7 checks it; if it fails, propose a spec change before continuing. |

## 10. Sources Used

- Aurora Serverless v2 auto-pause: <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html>
- Aurora PostgreSQL release calendar: <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/aurorapostgresql-release-calendar.html>
- Data API regions and engines: <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.Data_API.html>
- Data API limitations: <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.limitations.html>
- Data API `ExecuteStatement`: <https://docs.aws.amazon.com/rdsdataservice/latest/APIReference/API_ExecuteStatement.html>
- Data API access: <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.access.html>
- Lambda runtimes: <https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html>
- Pages Direct Upload: <https://developers.cloudflare.com/pages/get-started/direct-upload/>
- Pages headers: <https://developers.cloudflare.com/pages/configuration/headers/>
- Pages serving and caching: <https://developers.cloudflare.com/pages/configuration/serving-pages/>
- Pages rollbacks: <https://developers.cloudflare.com/pages/configuration/rollbacks/>
- Pages limits: <https://developers.cloudflare.com/pages/platform/limits/>

## 11. Constitution Check

All six principles are met:

1. **Stack Simplicity:** fixed stack plus Cloudflare Pages, Wrangler, SAM, and GitHub Actions (spec section 9); the Data API client is approved in spec 001 section 8a.
2. **Spec-Code Alignment:** every part traces to an AC or NFR (see each task's **Covers** line).
3. **Separation of Concerns:** no business rules in infrastructure; `migrate.ts` is a thin command over `runMigrations`.
4. **Testing Standard:** unit tests in CI on every pull request (P-13); infrastructure checks in section 8.
5. **Data Persistence:** schema and data changes are versioned one-statement SQL files; queries are parameterized.
6. **Language Standard:** everything is in English.
