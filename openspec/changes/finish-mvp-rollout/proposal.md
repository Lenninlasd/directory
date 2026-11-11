# Proposal: Finish the MVP rollout

## Why

The directory runs in `dev`, but nobody can use it yet: `prod` has not been created and the database holds only sample rows. These are the last two open tasks of the archived spec 002, carried over by `adopt-openspec` so they are not buried in the archive.

## What Changes

- Create and deploy the `prod` environment from the existing template (milestone M5 of the archived tasks 001).
- Load the real businesses provided by the team with one data migration, in its own pull request.

Out of scope: any change to the directory behavior, the API, or the template. Nothing from the "Deliberate exclusions" requirements is added.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The behavior is already described by `openspec/specs/infrastructure/spec.md` (Environments, Deployment process, Private database, Business data loading) and `openspec/specs/directory/spec.md` (Business list API, Business order). The change sets `skip_specs: true`.

## Impact

- **Infrastructure:** a new `prod` stack and the `alameda-prod` Cloudflare Pages project. Costs start for `prod` (Aurora keeps a minimum capacity above zero).
- **Data:** a new data migration in `backend/migrations/`.
- **Code:** none, apart from that migration and the `prod` URL in `infra/samconfig.toml`.
