# Tasks 002: Hosting, Deployment, and Infrastructure

- **Status:** Draft
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
5. Tick the checkbox and commit with the task id, for example `Add Aurora cluster to template (002-T3)`.

Work happens on one branch and pull request per milestone (plan P-14). Every pull request must pass CI (002-T0).

Nothing is deployed to `prod` before M5. No account IDs, ARNs with account IDs, or secrets in any committed file.

## M1: Continuous integration

- [ ] **002-T0 CI workflow**
  - **Covers:** AC-8.1, AC-8.2, plan P-13, constitution principle 4
  - **When:** right after 001-T1, so the first pull request (M1) already runs CI.
  - **Do:** `.github/workflows/ci.yml` on pull requests to `main`: set up Node.js 24 and pnpm, `pnpm install --frozen-lockfile`, `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`. No AWS credentials, no deploy. Turn on branch protection for `main` requiring this check (documented in `infra/README.md` as a one-time manual step, AC-1.3).
  - **Checks first:** a pull request with a deliberately failing test shows a failed check and cannot be merged; after the fix the check passes.
  - **Done when:** checks pass.

## M2: API live in `dev`

Prerequisite: M1 of tasks 001 is done.

- [ ] **002-T1 Template skeleton and deploy configuration**
  - **Covers:** AC-1.1, AC-1.2, AC-1.3, plan R-7, spec section 9
  - **Do:** `infra/template.yaml` (SAM transform, `Environment` parameter with values `dev` and `prod`, `BootstrapMode` parameter (P-10), database user and connect timeout parameters (P-12), common tags `Project` and `Environment`), `infra/samconfig.toml` with `dev` and `prod` sections (`us-east-1`, stack names with the environment), `infra/README.md` with prerequisites (SAM CLI and AWS CLI versions used, AWS credentials setup, one-time manual steps if any).
  - **Checks first:** `sam validate --lint` passes; `samconfig.toml` contains no account ID or secret.
  - **Done when:** checks pass and `sam deploy --config-env dev` creates an empty stack.

- [ ] **002-T2 Network**
  - **Covers:** AC-3.1, AC-3.2, plan P-5, section 5 (Network)
  - **Do:** VPC, two private subnets in two Availability Zones, route table, security groups `lambda-sg` and `db-sg` (`db-sg` inbound 5432 only from `lambda-sg`). No internet gateway, no NAT.
  - **Checks first:** stack outputs or `describe-*` show two private subnets in different AZs; `db-sg` has exactly one inbound rule; no NAT gateway or internet gateway exists in the VPC.
  - **Done when:** deployed to `dev` and checks pass.

- [ ] **002-T3 Aurora PostgreSQL cluster**
  - **Covers:** AC-3.1, AC-3.3, AC-3.4, AC-3.5, NFR-3, plan P-1, P-2, R-8
  - **Do:** confirm the latest Aurora PostgreSQL 17.x minor in `us-east-1` (`aws rds describe-db-engine-versions`) and record it in the plan. DB subnet group, cluster (encrypted, IAM database authentication on, managed master user secret, not publicly accessible), one `db.serverless` instance. Scaling and backups per parameters: `dev` 0 to 1 ACU with auto-pause after 3600 s and 1-day backups; `prod` 0.5 to 2 ACU, 7-day backups, deletion protection, `Retain` deletion policy, final snapshot.
  - **Checks first:** `describe-db-clusters` shows engine version, `StorageEncrypted: true`, `IAMDatabaseAuthenticationEnabled: true`, scaling range per environment, backup retention per environment; the instance is not publicly accessible.
  - **Done when:** `dev` cluster is created and checks pass.

- [ ] **002-T4 Database users migration and migration Lambda**
  - **Covers:** AC-5.1, AC-5.2, AC-5.2a, EC-4, plan P-6, R-4, R-5
  - **Do:**
    - `backend/migrations/001_create_database_users.sql`: creates `app_user` and `migrator`, grants `rds_iam` to both, lets `migrator` create objects in the schema, gives `migrator` ownership of `schema_migrations`, and sets `ALTER DEFAULT PRIVILEGES FOR ROLE migrator GRANT SELECT ON TABLES TO app_user` (Q-1).
    - `backend/src/handlers/migrate.ts`: thin handler over `runMigrations` (001-T6) with actions `migrate`, `seed`, and `verify` (P-11). If the `migrator` role does not exist, it reads the master secret with `@aws-sdk/client-secrets-manager`, applies only `001_create_database_users.sql` as the master user, and reconnects as `migrator` with IAM for the rest (Q-2). If bootstrap is needed but `BootstrapMode` is off, it fails with a clear message. Returns a summary of applied files.
    - Template: `migrate` function in the VPC, its role (`rds-db:connect` for `migrator`; `secretsmanager:GetSecretValue` on the master secret only when `BootstrapMode` is `true`), Secrets Manager interface VPC endpoint only when `BootstrapMode` is `true`, log group with 30-day retention.
    - Bundle the `.sql` files into the Lambda package (verify how in the SAM esbuild documentation).
    - Document the two-step first deploy (`BootstrapMode=true`, then `false`) in `infra/README.md`.
  - **Tests first (unit, fake client and fake secret reader):** bootstrap path reads the secret and applies only the users migration as master; normal path never reads the secret; summary lists applied files; a failing migration returns an error result; `verify` runs only read-only queries and reports privileges and TLS; an unknown action is rejected.
  - **Checks first:** invoking `migrate` in `dev` applies both migrations; a second invocation applies none and does not read the secret; `businesses` is owned by `migrator`; `verify` reports `SELECT` only for `app_user`; after redeploying with `BootstrapMode=false`, the endpoint and the secret permission are gone and `migrate` still works; IAM policy grants nothing beyond the listed actions.
  - **Done when:** unit tests and checks pass.

- [ ] **002-T5 Connection timeout and retry**
  - **Covers:** plan P-1, V-7, section 7; spec 001 NFR-1
  - **Do:** extend `backend/src/db/connect.ts` (001-T8): connect timeout from an environment variable (`dev` 25 s, `prod` 5 s, P-12), retry a failed connection up to 3 times for transient errors, never retry authentication errors.
  - **Tests first (fake client factory):** succeeds on the 2nd attempt after one transient failure; gives up after 3 retries; does not retry an authentication error; the configured timeout is passed to the client.
  - **Done when:** tests pass.

- [ ] **002-T6 API Lambda, HTTP API, CORS, and logs**
  - **Covers:** AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.5, NFR-5, plan P-3, P-4, R-1
  - **Do:** `api` function (`nodejs24.x`, `arm64`, 256 MB, timeout 29 s in `dev` and 10 s in `prod`, in the VPC, environment variables for host, port, database, user; no secrets), `AWS::Serverless::HttpApi` with `GET /businesses`, CORS limited to the CloudFront origin of the same environment (Q-3; the local frontend uses a Vite proxy, so no `localhost` origin), log groups with 30-day retention, role with logs, VPC network interface permissions, and `rds-db:connect` for `app_user` only.
  - **Checks first:** `curl -i https://<api>/businesses` returns `200` and `{"businesses":[]}` (proves direct IAM connection, R-1); a request with a non-allowed `Origin` gets no `Access-Control-Allow-Origin`; log group retention is 30 days; the role policy has no other database user and no secret access.
  - **Done when:** checks pass in `dev`.

- [ ] **002-T7 Seed data for `dev`**
  - **Covers:** spec Q-9; spec 001 AC-1.2, AC-2.3, AC-5.2, EC-4, EC-5, EC-6 (data for manual checks)
  - **Do:** `backend/seeds/dev_businesses.sql` with invented businesses: at least one inactive, one with an invalid number, one with no number, one with a very long name and location, two with the same `created_at` and names that differ only in accents or case, both store types. Idempotent upsert (safe to run twice, and a changed row is updated). Run by invoking the migration Lambda with the `seed` action; the handler refuses unless `Environment` is `dev` (Q-4). Add a unit test for the refusal in `prod`.
  - **Checks first:** `curl` returns only active rows, in the order of spec 001 FR-5, with `null` for the invalid and missing numbers; attempting to seed `prod` is refused.
  - **Done when:** checks pass in `dev`.

- [ ] **002-T8 Security checks**
  - **Covers:** AC-2.3, AC-3.1, AC-3.2, AC-3.3, NFR-2, spec completion criterion 4
  - **Do:** document and run the checks of plan section 8 for privacy, least privilege, and TLS.
  - **Checks first:** connection from a laptop to the cluster endpoint times out; the `verify` action reports `SELECT` only for `app_user` and a TLS connection; the cluster parameter `rds.force_ssl` is `1` (add it to the cluster parameter group if the default is different).
  - **Done when:** all checks pass and results are recorded in `infra/README.md`.

## M4: Frontend hosting and deployment

Prerequisite: M3 of tasks 001 is done.

- [ ] **002-T9 S3 bucket and CloudFront**
  - **Covers:** AC-4.1, AC-4.2, AC-4.3, EC-3, plan P-7, P-8
  - **Do:** private bucket (block public access, encrypted), CloudFront distribution with Origin Access Control, HTTP to HTTPS redirect, error responses 403 and 404 returning `/index.html` with `200`, cache behavior per P-7. CORS of 002-T6 now references the CloudFront domain.
  - **Checks first:** `curl -I http://<cloudfront>` redirects to HTTPS; direct bucket URL returns `403`; `https://<cloudfront>/anything` returns `200` with the app HTML.
  - **Done when:** checks pass in `dev`.

- [ ] **002-T10 Deploy script**
  - **Covers:** AC-4.4, AC-4.5, AC-5.3, AC-6.1, AC-6.2, EC-5, plan section 6
  - **Do:** `infra/deploy.sh <env>`: `sam build`, `sam deploy`, invoke `migrate` and stop on error, build the frontend with `VITE_API_BASE_URL` from the stack output, `aws s3 sync`, invalidate `/index.html`, print the URL. `prod` asks for typed confirmation. The script reads no secrets.
  - **Checks first:** a full `dev` run ends with a working URL; a changed frontend is visible after reload without clearing the cache; running for `prod` without confirmation aborts before any change.
  - **Done when:** checks pass in `dev`.

- [ ] **002-T11 Failure and rollback checks**
  - **Covers:** EC-1, EC-4, AC-6.3
  - **Do:** document rollback in `infra/README.md` (plan section 6) and run the failure drills in `dev`.
  - **Checks first:** on a throwaway branch that is never merged, a deliberately broken migration deployed to `dev` rolls back and stops the deploy, and the API keeps serving (then redeploy `main`); deploying `dev` with the API database user parameter set to a non-existent user makes the API return `500 {"error":"internal_error"}` with details only in CloudWatch (then redeploy with the right user); a rollback to the previous commit restores the previous backend and frontend.
  - **Done when:** all three drills pass and are recorded.

- [ ] **002-T12 Performance and freshness in `dev`**
  - **Covers:** NFR-1, spec 001 NFR-1 and NFR-5, plan R-3
  - **Do:** measure the first request after a `dev` pause, and a warm request, on a throttled mobile profile. Freshness: change a row in the seed, run the `seed` action, reload, and see the change. Record the numbers in `infra/README.md`.
  - **Done when:** results are recorded. A `prod`-like warm load meets about 3 s, or a spec change is proposed.

## M5: Production

- [ ] **002-T13 Region latency check**
  - **Covers:** I-6, section 4a
  - **Do:** measure latency from Barranquilla (or a nearby vantage point) to the `dev` API in `us-east-1`. Record it.
  - **Done when:** recorded, and `us-east-1` is confirmed or a spec change is proposed before `prod` is created.

- [ ] **002-T14 Production deploy**
  - **Covers:** spec completion criteria 2, 4, 5; AC-1.2, AC-6.2, NFR-4
  - **Do:** first deploy with `BootstrapMode=true`, then redeploy with `false` (P-10). Run `infra/deploy.sh prod` (confirmation required). Do not seed. Re-run the security checks of 002-T8 and the HTTPS checks of 002-T9 against `prod`. Run spec 001 manual check 5 (performance) against `prod`.
  - **Done when:** `prod` serves the directory over HTTPS, the database is unreachable from the internet, deletion protection is on, the Secrets Manager endpoint is gone, and results are recorded.

- [ ] **002-T15 Initial business data**
  - **Covers:** AC-7.1, AC-7.2, plan "Data migration" check
  - **Do:** a data migration (next free number in `backend/migrations/`) with the real businesses provided by the team: name, category, location summary, store type, WhatsApp number with country code, active flag. Reviewed in its own pull request. Compatible with the deployed backend (AC-5.3).
  - **Checks first:** after deploy, `GET /businesses` in `dev` and `prod` lists the new businesses in the FR-5 order; invalid numbers come back as `null` and are reported to the team for correction.
  - **Done when:** checks pass in both environments.

## Open Questions

All resolved by the project owner on 2026-10-23 and 2026-10-24:

- **Q-1.** Users migration first (`001_create_database_users.sql`), then `002_create_businesses.sql`. `app_user` gets `SELECT` through default privileges on tables created by `migrator`.
- **Q-2.** The migration Lambda uses the master secret only when the `migrator` role does not exist, and only for the users migration.
- **Q-3.** CORS allows only the CloudFront origin in both environments. Local frontend development uses a Vite dev proxy.
- **Q-4.** Seed runs through the migration Lambda `seed` action, refused unless `Environment` is `dev`.
- **Q-5.** Real business data is loaded through data migrations (spec FR-7, 002-T15).
- **Q-6.** CI runs tests on every pull request (spec FR-8, 002-T0).
- **Q-7.** Secrets Manager endpoint exists only while `BootstrapMode` is `true` (plan P-10).
- **Q-8.** Privilege and TLS evidence come from the `verify` action; the database failure drill uses a wrong user parameter instead of a migration.
