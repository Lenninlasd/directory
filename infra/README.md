# Infrastructure and Deployment

Deployment guide for spec 002. Sections are added as the tasks in `specs/002-infrastructure/tasks.md` are completed.

## One-time manual setup

### Branch protection for `main` (002-T0)

CI runs on every pull request to `main` (`.github/workflows/ci.yml`). To make a failing check block the merge:

1. GitHub repository → **Settings** → **Branches** (or **Rules** → **Rulesets**).
2. Add a rule for `main`: require a pull request before merging, and require the status check **`test`** (the CI job) to pass.

## Verification

### CI (002-T0, spec AC-8.1, AC-8.2)

| Check | Expected | Result |
|---|---|---|
| Pull request with a deliberately failing test | Check `test` fails and the merge is blocked | Pending |
| Same pull request after the fix | Check `test` passes | Pending |
| Workflow has no AWS credentials and no deploy step | `ci.yml` only installs, lints, type checks, and tests | Pending |
