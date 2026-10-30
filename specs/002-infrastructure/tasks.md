# Tasks 002: Hosting, Deployment, and Infrastructure

- **Status:** Approved (approved by the project owner in chat on 2026-10-24)
- **Spec:** [spec.md](./spec.md) (Approved)
- **Plan:** [plan.md](./plan.md) (Approved)
- **Related:** [Tasks 001](../001-business-list/tasks.md) (application; milestones are shared, see the execution order there)
- **Created:** 2026-10-23

## How to work a task

Infrastructure cannot be unit tested like application code (spec section 10, criterion 1). For each task:

1. Write the **Checks first**: commands or steps with the expected result, added to `infra/README.md` under "Verification".
2. Run them and confirm they fail (resource missing or wrong).
3. Add the minimum template or script change.
4. Run `sam validate --lint`, deploy to `dev`, and run the checks again. Backend code changes also need `pnpm -r lint`, `pnpm -r typecheck`, and `pnpm -r test`.
5. Tick the checkbox and commit with the task id, for example `Add Aurora cluster to template (002-T2)`.

Work happens on one branch and pull request per milestone (plan P-14). Every pull request must pass CI (002-T0). Nothing is deployed to `prod` before M5. No account IDs or secrets in any committed file.

## M1: Continuous integration

- [x] **002-T0 CI workflow**
  - **Covers:** AC-8.1, AC-8.2, plan P-13, constitution principle 4
  - **When:** right after 001-T1, so the first pull request already runs CI.
  - **Do:** `.github/workflows/ci.yml` on pull requests to `main`: Node.js 24 and pnpm, `pnpm install --frozen-lockfile`, `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`. No AWS credentials, no deploy. Branch protection on `main` requiring this check (one-time manual step, documented in `infra/README.md`, AC-1.3).
  - **Checks first:** a pull request with a deliberately failing test is blocked; after the fix it passes.
  - **Done when:** checks pass.

## M2: API live in `dev`

Prerequisite: M1 of tasks 001 is done.

- [x] **002-T1 Template skeleton and deploy configuration**
  - **Covers:** AC-1.1, AC-1.2, AC-1.3, plan R-6, spec section 9
  - **Do:** `infra/template.yaml` (SAM transform; parameters `Environment` (`dev`/`prod`), database name; tags `Project` and `Environment`), `infra/samconfig.toml` (`dev` and `prod`, `us-east-1`), `infra/README.md` (SAM CLI and AWS CLI versions, credentials setup, the AWS permissions a developer needs).
  - **Checks first:** `sam validate --lint` passes; `samconfig.toml` has no account ID or secret.
  - **Done when:** `sam deploy --config-env dev` creates an empty stack.

- [x] **002-T2 Aurora cluster with the Data API**
  - **Covers:** AC-3.1, AC-3.2, AC-3.3, AC-3.4, AC-3.5, NFR-3, plan P-1, P-2, P-5, P-6, R-5
  - **Do:** confirm the latest Aurora PostgreSQL 17.x minor in `us-east-1` (at least 17.4) with `aws rds describe-db-engine-versions` and record it in the plan. VPC with two private subnets, `db-sg` with no inbound rules, DB subnet group, cluster (encrypted, `EnableHttpEndpoint: true`, `ManageMasterUserPassword: true`, scaling and backups per environment, deletion protection and `Retain` in `prod`), one `db.serverless` instance not publicly accessible. Outputs: cluster ARN, secret ARN.
  - **Checks first:** `describe-db-clusters` shows the engine version, `StorageEncrypted: true`, the Data API enabled, the scaling range and backup retention per environment; the instance is not publicly accessible; `db-sg` has no inbound rules; `aws rds-data execute-statement --sql "select 1"` with your credentials succeeds.
  - **Done when:** checks pass in `dev`.

- [x] **002-T3 Migration script**
  - **Covers:** AC-5.1, AC-5.2, AC-5.2a, EC-4, plan P-10, P-11, R-4
  - **Do:** `backend/scripts/migrate.ts <env> [--seed]`: reads the cluster ARN and secret ARN from the stack outputs, runs `runMigrations` (001-T6) through `dataApi.ts` (001-T8), prints the applied files. `--seed` is refused unless the environment is `dev`. Confirm that Node.js 24 runs it directly (type stripping); otherwise compile with `tsc` first and document that.
  - **Tests first (unit, fake wrapper):** `--seed` refused for `prod`; unknown environment rejected; output lists applied files; a failing migration exits with a non-zero code.
  - **Checks first:** `node backend/scripts/migrate.ts dev` applies `001_create_businesses.sql`; a second run applies nothing; `schema_migrations` lists the file.
  - **Done when:** tests and checks pass.

- [x] **002-T4 API Lambda, HTTP API, CORS, and logs**
  - **Covers:** AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.5, NFR-5, plan P-3, P-4, P-12, R-2
  - **Do:** `api` function (`nodejs24.x`, `arm64`, 256 MB, timeout 10 s, no VPC, environment variables `DATA_API_CLUSTER_ARN`, `DATA_API_SECRET_ARN`, `DATABASE_NAME`), built by the SAM makefile builder (`backend/Makefile` runs esbuild with `pnpm exec`, plan section 7). `AWS::Serverless::HttpApi` with `GET /businesses` and CORS for the CloudFront origin of the same environment (until 002-T7 exists, no browser origin is allowed; test with `curl`). Log group with 30-day retention. Role: logs, `rds-data:ExecuteStatement` on the cluster ARN, `secretsmanager:GetSecretValue` on the secret ARN, nothing else.
  - **Checks first:** `curl -i https://<api>/businesses` returns `200` and `{"businesses":[]}`; a request with a non-allowed `Origin` gets no `Access-Control-Allow-Origin`; log retention is 30 days; the role policy has exactly the three permissions.
  - **Done when:** checks pass in `dev`.

- [x] **002-T5 Seed data for `dev`**
  - **Covers:** AC-7.3; spec 001 AC-1.2, AC-2.3, FR-5, EC-4, EC-5, EC-6
  - **Do:** `backend/seeds/dev_businesses.sql`, one `INSERT ... ON CONFLICT (id) DO UPDATE` statement with fixed ids and invented businesses: at least one inactive, one invalid number, one without a number, one very long name and location, two with the same `created_at` and names differing only in accents or case, both store types.
  - **Checks first:** after `node backend/scripts/migrate.ts dev --seed`, `curl` returns only active rows in the FR-5 order with `null` for the invalid and missing numbers; running the seed twice gives the same result.
  - **Done when:** checks pass in `dev`.

- [x] **002-T6 Security checks**
  - **Covers:** AC-2.3, AC-3.1, AC-3.2, AC-3.3, NFR-2, spec completion criterion 4
  - **Do:** run and record the "Least privilege", "Database private", and "Encryption" checks of plan section 8.
  - **Done when:** all pass and results are in `infra/README.md`.

## M4: Frontend hosting and deployment

Prerequisite: M3 of tasks 001 is done.

- [ ] **002-T7 S3 bucket and CloudFront**
  - **Covers:** AC-4.1, AC-4.2, plan P-7
  - **Do:** private bucket (block public access, encrypted), CloudFront with Origin Access Control, HTTP to HTTPS redirect, cache behavior per P-7. The API CORS now allows the CloudFront domain.
  - **Checks first:** `curl -I http://<cloudfront>` redirects; direct bucket URL returns `403`; `https://<cloudfront>/` returns the app HTML; CORS allows the CloudFront origin.
  - **Done when:** checks pass in `dev`.

- [ ] **002-T8 Deploy script**
  - **Covers:** AC-4.4, AC-4.5, AC-5.3, AC-6.1, AC-6.2, EC-5, plan section 6
  - **Do:** `infra/deploy.sh <env>`: `sam build`, `sam deploy`, `node backend/scripts/migrate.ts <env>` (stop on error), frontend build with `VITE_API_BASE_URL` from the stack output, `aws s3 sync`, invalidate `/index.html`, print the URL. Typed confirmation for `prod`. Reads no secrets.
  - **Checks first:** a full `dev` run ends with a working URL; a changed frontend is visible after reload; `prod` without confirmation aborts before any change.
  - **Done when:** checks pass in `dev`.

- [ ] **002-T9 Rollback documentation, performance, and freshness**
  - **Covers:** AC-6.3, NFR-1, spec 001 NFR-5
  - **Do:** write the rollback section of `infra/README.md` (no drill). Run the "Performance" check of plan section 8 once in `dev` (warm request, and the first request after a pause). Freshness: change a seed row, re-run the seed, reload, see the change.
  - **Done when:** results are recorded; a missed performance target leads to a spec change proposal.

## M5: Production (only when the directory launches, spec I-1)

- [ ] **002-T10 Production deploy**
  - **Covers:** spec completion criteria 2, 4, 5; AC-1.2, AC-6.2, NFR-4
  - **Do:** `infra/deploy.sh prod` (confirmation required). Never seed. Re-run the 002-T6 checks and the HTTPS checks of 002-T7 against `prod`. Run spec 001 manual check 5 against `prod`.
  - **Done when:** `prod` serves the directory over HTTPS, the database is not reachable over the network, deletion protection is on, and results are recorded.

- [ ] **002-T11 Initial business data**
  - **Covers:** AC-7.1, AC-7.2, plan "Data migration" check
  - **Do:** a data migration (next free number, one `INSERT` statement) with the real businesses provided by the team: name, category, location summary, store type, WhatsApp number with country code, active flag. Own pull request. Compatible with the deployed backend (AC-5.3).
  - **Checks first:** after deploy, `GET /businesses` in `dev` and `prod` lists them in the FR-5 order; any number returned as `null` is reported to the team for correction.
  - **Done when:** checks pass in both environments.
