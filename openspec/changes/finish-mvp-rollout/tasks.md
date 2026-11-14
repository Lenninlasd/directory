# Tasks: Finish the MVP rollout

Carried over from the archived [tasks 002](../archive/2026-10-23-002-infrastructure/tasks.md) with their original ids and text. Ids such as AC-1.2 and NFR-4 refer to the archived spec 002; the same ids appear in scenario names of `openspec/specs/infrastructure/spec.md`. How to work an infrastructure task is described at the top of the archived task list.

## 1. Production deploy (002-T10)

- [ ] 1.1 Create the `alameda-prod` Pages project once and set its URL in the `prod` section of `infra/samconfig.toml`. Then `infra/deploy.sh prod` (confirmation required). Never seed. Re-run the 002-T6 checks and the HTTPS checks of 002-T7 against `prod`. Run spec 001 manual check 5 against `prod`. Covers spec 002 completion criteria 2, 4, 5; AC-1.2, AC-6.2, NFR-4. Verify: `prod` serves the directory over HTTPS, the database is not reachable over the network, deletion protection is on, and results are recorded.
  - Opening hours editing (moved from task 6.5 of `edit-opening-hours-with-natural-language`, design D-3): before the deploy, the owner creates `/alameda/prod/admin-key` and `/alameda/prod/anthropic-api-key` with new values, never the `dev` ones (`infra/README.md`, "Secret parameters"), and sets a monthly spend limit for the `prod` Anthropic key. Verify: `?admin` and a save work in `prod`, the `dev` admin key gets `401` from `prod`, and the `prod` admin key gets `401` from `dev`.

## 2. Initial business data (002-T11)

- [ ] 2.1 Write a data migration (next free number, one `INSERT` statement) with the real businesses provided by the team: name, category, location summary, store type, WhatsApp number with country code, active flag. Own pull request. Compatible with the deployed backend (AC-5.3). Covers AC-7.1, AC-7.2, and the "Data migration" check of the archived plan 002. Checks first: after deploy, `GET /businesses` in `dev` and `prod` lists them in the FR-5 order; any number returned as `null` is reported to the team for correction. Verify: the checks pass in both environments.

## Workflow follow-up

- Archive this change when the owner says so, after both tasks are done.
