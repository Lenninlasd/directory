# Design: Finish the MVP rollout

## Context

Both tasks carry out a design that already exists and is built: the archived [plan 002](../archive/2026-10-23-002-infrastructure/plan.md) (template, parameters, deploy script, migrations) and the deployment guide in `infra/README.md`. This change adds no new decision.

## Goals / Non-Goals

**Goals:** `prod` serves the directory, and both environments list the real businesses.

**Non-Goals:** any template, script, or application change. If either task shows that one is needed, stop and propose a separate change.

## Decisions

| # | Decision | Alternatives discarded and why |
|---|---|---|
| D-1 | Follow the archived plan 002 and `infra/README.md` as written. Read them as the record of how the system was built, then check the current `infra/` files, which win if they differ. | Re-deciding the `prod` setup: it was approved on 2026-11-02 and `dev` already runs it. |
| D-2 | The data migration keeps its own pull request (archived 002-T11). | One pull request for both tasks: a data mistake would block the `prod` deploy, or the reverse. |

## Risks / Trade-offs

- **Real WhatsApp numbers are invalid** → The API returns `null` for them (directory spec, "WhatsApp number validity"); the task reports each one to the team.
- **`prod` costs start** → Expected and accepted in the archived spec 002 (NFR-3).
