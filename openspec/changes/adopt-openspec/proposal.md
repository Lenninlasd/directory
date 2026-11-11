# Proposal: Adopt OpenSpec

## Why

The numbered folders in `specs/` are records of changes, not a description of the product as it is today. Spec 003 replaced parts of spec 001, so the current behavior of one screen is spread over two specs, and the plans and task lists of spec 001 describe files that no longer exist. Every new spec makes this worse, and an agent that reads an old plan can restore behavior that was replaced. OpenSpec keeps one current spec per capability and archives each finished change, which removes the problem at its source. The directory redesign (M6) has just merged, so no feature work is in flight.

## What Changes

- **Tool:** add the OpenSpec CLI as a pinned dev dependency (`@fission-ai/openspec` 1.16.1) and its Claude Code skills and commands. Approved by the project owner in chat on 2026-11-10.
- **Current specs:** convert the three approved specs into two current specs in OpenSpec's Requirement and Scenario format:
  - `directory`: specs 001 and 003, merged (the API for the list, and the whole directory screen).
  - `infrastructure`: spec 002 (hosting, deployment, database, CI).
- **Ids kept:** every scenario carries the id of the acceptance criterion it came from, for example `(003 AC-8.8)`, so references in tests and code comments still resolve.
- **History:** move `specs/001-business-list/`, `specs/002-infrastructure/`, and `specs/003-directory-redesign/` unchanged into `openspec/changes/archive/`. The `specs/` folder is removed. **BREAKING** for links that point into `specs/`.
- **Open work:** carry the two unfinished tasks (002-T10, 002-T11) into a new active change, `finish-mvp-rollout`, so they are not buried in the archive.
- **Dependency register:** move the approved dependency tables (spec 001 section 8a, spec 002 section 9) to `docs/dependencies.md`, the one place where approved packages and tools are recorded.
- **Workflow:** rewrite the workflow parts of `AGENTS.md` for OpenSpec: propose, human approval, apply, archive. The rule "When a spec changes earlier behavior" is removed, because the archive step now does that job. The constitution does not change; a change may skip spec deltas only when a current spec already describes the behavior it builds or deploys, so constitution principle 2 (a reviewed spec before code) still holds (design D-16).
- **CI:** validate the specs on every pull request (`openspec validate --all --strict`). This is the only behavior change, and it is in the `infrastructure` spec.

## Capabilities

### New Capabilities

- `directory`: the public business directory: the read-only list API, and the screen where people browse, search, filter by category, open a business, and start a WhatsApp conversation.
- `infrastructure`: how the directory runs: environments, infrastructure as code, the private database, frontend hosting, migrations and business data, the deployment process, and continuous integration.

### Modified Capabilities

None. No OpenSpec spec exists yet.

## Impact

- **Product code:** none. No file in `frontend/src`, `backend/src`, or `infra/template.yaml` changes. Code comments that name old ids (`spec 003 AC-8.8`, `plan 003 D-10`) stay as they are.
- **Dependencies:** one new dev dependency at the repository root, recorded in `pnpm-lock.yaml`. It runs only on developer machines and in CI, never in the Lambda or the frontend bundle.
- **Documentation:** `AGENTS.md`, `infra/README.md`, `playground/README.md`, and `playground/AGENTS.md` change where they name `specs/` or the old workflow.
- **CI:** one more step in `.github/workflows/`.
- **People and agents:** new work starts with `/opsx:propose` instead of a new numbered folder. Old pull requests and commit messages keep their `[001-T3]` style ids, which stay searchable in the archive.
