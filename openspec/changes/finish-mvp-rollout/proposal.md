# Proposal: Finish the MVP rollout

## Why

The directory runs in `dev`, but nobody can use it yet: `prod` has not been created and the database holds only sample rows. These are the last two open tasks of the archived spec 002, carried over by `adopt-openspec` so they are not buried in the archive.

## What Changes

- Create and deploy the `prod` environment from the existing template (milestone M5 of the archived tasks 001).
- Load the real businesses into `prod` with the import command of `import-businesses`, using the file the owner reviewed in `dev`. Nothing is committed.
- Create the two `prod` secret parameters of `edit-opening-hours-with-natural-language` before the first `prod` deploy, and check opening hours editing in `prod` (moved from that change's task 6.5 on 2026-11-14).

Out of scope: any change to the directory behavior, the API, or the template. Nothing from the "Deliberate exclusions" requirements is added.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The behavior is already described by `openspec/specs/infrastructure/spec.md` (Environments, Deployment process, Private database), `openspec/specs/directory/spec.md` (Business list API, Business order), `openspec/specs/business-editing/spec.md`, and, once `import-businesses` is archived, its `business-import` spec and the revised "Business data loading". The change sets `skip_specs: true`.

## Impact

- **Infrastructure:** a new `prod` stack and the `alameda-prod` Cloudflare Pages project. Costs start for `prod` (Aurora keeps a minimum capacity above zero). Two `prod` SSM parameters, created by hand, and Anthropic API spending for `prod` edits.
- **Data:** none committed. The file is imported from outside the repository.
- **Code:** none, apart from the `prod` URL in `infra/samconfig.toml`.
