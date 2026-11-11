# Tasks: Adopt OpenSpec

## 1. Tool setup

- [x] 1.1 Add `@fission-ai/openspec` 1.16.1 as an exact dev dependency at the repository root (approved by the owner in chat on 2026-11-10). Verify: `pnpm exec openspec --version` prints `1.16.1` and `pnpm-lock.yaml` contains it.
- [x] 1.2 Run `openspec init --tools claude`. Verify: `openspec/config.yaml`, six skills in `.claude/skills/`, and six commands in `.claude/commands/opsx/` exist.
- [ ] 1.3 Write `openspec/config.yaml`: project context (read `AGENTS.md` and the constitution first, English artifacts and Spanish UI text, `pnpm exec openspec`, approval before apply, the human commits) and rules per artifact (design D-10, D-13). Verify: `pnpm exec openspec instructions proposal --change adopt-openspec` prints the context.
- [ ] 1.4 Turn telemetry off for agent sessions: add `"env": { "OPENSPEC_TELEMETRY": "0" }` to `.claude/settings.json`, keeping the existing deny rules (design D-14). Verify: the file is valid JSON and the five deny rules are unchanged.

## 2. History and open work

- [ ] 2.1 Move `specs/001-business-list/`, `specs/002-infrastructure/`, and `specs/003-directory-redesign/` to `openspec/changes/archive/` with the date prefixes of design D-7, and correct the relative links inside them. Remove the empty `specs/` folder. Verify: a script finds no relative Markdown link in the archive that points to a missing file.
- [ ] 2.2 Create the change `finish-mvp-rollout` with `skip_specs: true`, a short proposal, and a task list holding 002-T10 and 002-T11 with their original text (design D-8). Verify: `pnpm exec openspec validate finish-mvp-rollout --strict` passes and `pnpm exec openspec list` shows it with 2 open tasks.

## 3. Documentation

- [ ] 3.1 Create `docs/dependencies.md` from spec 001 section 8a and spec 002 section 9, and add the OpenSpec CLI with today's date (design D-9). Verify: every package in the root, `backend/`, and `frontend/` `package.json` files appears in it.
- [ ] 3.2 Rewrite the workflow parts of `AGENTS.md` as described in design.md: repository layout, hard boundaries 1, 2, and 5, the workflow, the removal of "When a spec changes earlier behavior", commit and pull request format (design D-12), how to resolve legacy ids (design D-15), and the telemetry note for people. Verify: `AGENTS.md` no longer names `specs/<NNN-feature-name>/`, and every path it names exists.
- [ ] 3.3 Update `infra/README.md`, `playground/README.md`, and `playground/AGENTS.md` where they name `specs/` or a spec by number as a location. Verify: `grep -rn "specs/" --include="*.md"` outside `openspec/` and `node_modules/` returns only `openspec/specs/` paths.

## 4. Continuous integration

- [ ] 4.1 Add the root script `"spec:validate": "openspec validate --all --strict"` and a CI step that runs `pnpm spec:validate` after the tests. Verify: `pnpm spec:validate` passes locally, and fails when a `#### Scenario:` heading in a change is changed to three hashes.

## 5. Final check

- [ ] 5.1 Run `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, and `pnpm spec:validate`. Verify: all pass, and `git status` shows no change under `frontend/src`, `backend/src`, or `infra/template.yaml`.

## Workflow follow-up

- Archive this change when the owner says so: `pnpm exec openspec archive adopt-openspec --yes`.
- Verify the result: `pnpm exec openspec list --specs` shows `directory` with 25 requirements and `infrastructure` with 13, and `pnpm spec:validate` still passes.
