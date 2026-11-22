# Design: Finish the MVP rollout

## Context

Task 1.1 carries out the archived [plan 002](../archive/2026-10-23-002-infrastructure/plan.md) (template, parameters, deploy script, migrations) and the deployment guide in `infra/README.md`. Task 2.1 carries out the import of `import-businesses`. The decisions below only set the order of the work and where each step belongs.

## Goals / Non-Goals

**Goals:** `prod` serves the directory and lists the businesses the owner reviewed in `dev`.

**Non-Goals:** any template, script, or application change. If either task shows that one is needed, stop and propose a separate change.

## Decisions

| # | Decision | Alternatives discarded and why |
|---|---|---|
| D-1 | Follow the archived plan 002 and `infra/README.md` as written. Read them as the record of how the system was built, then check the current `infra/` files, which win if they differ. | Re-deciding the `prod` setup: it was approved on 2026-11-02 and `dev` already runs it. |
| D-2 | *Replaced by D-4 (2026-11-22).* The data no longer travels through a data migration, so it has no pull request of its own. | |
| D-3 | Task 1.1 starts only after `edit-opening-hours-with-natural-language` is merged and archived, and also creates that change's two `prod` parameters and runs its `prod` checks (owner's choice, 2026-11-14). Once that change is archived, `openspec/specs/business-editing/spec.md` describes the behavior, so `skip_specs: true` still holds. | (a) Deploying `prod` before that change is merged, then again with it: two `prod` deploys for one release. (b) Keeping the `prod` step in that change: it would hold that change's pull request open until `prod` exists. |
| D-4 | Task 2.1 imports into `prod` the file the owner reviewed in `dev`, with the command of `import-businesses`, and tasks 1.1 and 2.1 start only after that change is merged and archived (owner's choice, 2026-11-21, `import-businesses` proposal, conflict 2). The single `prod` deploy then already has the new columns, and the infrastructure spec describes the import, so `skip_specs: true` still holds. | (a) Moving the `prod` import into `import-businesses`: its pull request would stay open until `prod` exists, the reason of D-3. (b) Keeping the data migration: it would commit the real businesses to the public repository, which the revised "Business data loading" forbids. |

## Risks / Trade-offs

- **The import refuses a file** with an invalid value or a WhatsApp number without consent (business-import spec, "All or nothing", "Consent rules") → The fix is made in the pipeline, then imported into `dev` and reviewed again.
- **Personal data in `prod`** → A file with WhatsApp numbers waits for the data processing policy change (`import-businesses` design, "Risks"). Today's file has none.
- **`prod` costs start** → Expected and accepted in the archived spec 002 (NFR-3).
