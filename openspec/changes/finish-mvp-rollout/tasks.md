# Tasks: Finish the MVP rollout

Carried over from the archived [tasks 002](../archive/2026-10-23-002-infrastructure/tasks.md) with their original ids. Task 1.1 gained the steps of design D-3 and D-4, and task 2.1 was rewritten on 2026-11-22 (design D-4). Ids such as AC-1.2 and NFR-4 refer to the archived spec 002; the same ids appear in scenario names of `openspec/specs/infrastructure/spec.md`. How to work an infrastructure task is described at the top of the archived task list.

## 1. Production deploy (002-T10)

- [ ] 1.1 Create the `alameda-prod` Pages project once and set its URL in the `prod` section of `infra/samconfig.toml`. Then `infra/deploy.sh prod` (confirmation required). Never seed. Re-run the 002-T6 checks and the HTTPS checks of 002-T7 against `prod`. Run spec 001 manual check 5 against `prod`. Covers spec 002 completion criteria 2, 4, 5; AC-1.2, AC-6.2, NFR-4. Verify: `prod` serves the directory over HTTPS, the database is not reachable over the network, deletion protection is on, and results are recorded.
  - Starts only after `import-businesses` is merged and archived (design D-4), so `prod` is created with its migrations.
  - Opening hours editing (moved from task 6.5 of `edit-opening-hours-with-natural-language`, design D-3): before the deploy, the owner creates `/alameda/prod/admin-key` and `/alameda/prod/anthropic-api-key` with new values, never the `dev` ones (`infra/README.md`, "Secret parameters"), and sets a monthly spend limit for the `prod` Anthropic key. Verify: `?admin` and a save work in `prod`, the `dev` admin key gets `401` from `prod`, and the `prod` admin key gets `401` from `dev`.

## 2. Initial business data (002-T11)

- [ ] 2.1 Import into `prod` the file the owner approved in `dev` (`import-businesses`, task 5.3), as `infra/README.md` describes (design D-4). Starts after task 1.1.
  - First the dry run, `node backend/scripts/import-businesses.ts prod <file>`: it reports that the file matches the last `dev` import, and lists any business whose hours were edited in `dev`.
  - Then `--apply`, typing `prod` to confirm. The owner repeats the listed hours edits in `prod` admin mode.
  - Covers infrastructure spec "Business data loading" and business-import spec "Review in dev before prod".
  - Verify: `GET /businesses` in `prod` lists the imported businesses in "Business order", with no seed rows and no private field. Results are recorded with counts only.

## Workflow follow-up

- Archive this change when the owner says so, after both tasks are done.
