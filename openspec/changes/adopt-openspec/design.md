# Design: Adopt OpenSpec

## Context

See `proposal.md` for the motivation. The starting point:

- `specs/` holds three approved features, each with `spec.md`, `plan.md`, and `tasks.md`. Specs 001 and 003 describe the same screen. All tasks are done except 002-T10 and 002-T11.
- `AGENTS.md` defines the workflow (spec, plan, tasks, test, code), three approval gates, and the rule that the human commits. `docs/constitution.md` holds six principles and does not name folders or files, so it needs no change.
- Around 60 source and test files have comments that name old ids, such as `spec 003 AC-8.8` or `plan 003 D-10`.
- OpenSpec 1.16.1 was checked on 2026-11-10 against its documentation and by a trial merge of this change in a scratch folder. Three facts from that check shape this design:
  - When a change is archived, only the `## Purpose` section and the requirements reach the current spec. Any other section is dropped.
  - Strict validation rejects a requirement whose text before the first scenario is longer than 500 characters, tables included.
  - The tool has no approval gate. It only checks that files exist and are well formed.

## Goals / Non-Goals

**Goals:**

- One current spec per capability, with no behavior lost in the conversion.
- Old ids stay searchable, so no code comment has to change.
- The same human control as today: nothing is implemented before the owner approves, and the human commits.
- CI rejects a malformed spec.

**Non-Goals:**

- Rewriting or improving the behavior itself. This is a change of format and location only. The one new behavior is the CI validation step.
- Updating code comments to new names.
- Custom OpenSpec schemas, the expanded command profile, or stores.
- Moving the playground into the workflow.

## Decisions

| # | Decision | Alternatives discarded and why |
|---|---|---|
| D-1 | **Pinned dev dependency.** `@fission-ai/openspec` at exact version 1.16.1 in the root `package.json`, run as `pnpm exec openspec`. Version 1.17.0 was one day old when this was written. | A global install: versions differ per machine and CI cannot run it. No tool: no format checks and a hand-made merge on archive. |
| D-2 | **Two capabilities,** `directory` and `infrastructure`. Specs 001 and 003 merge into `directory`. | One capability per old spec: keeps the split that caused the problem. Splitting `directory` into API and screen: the two change together and share the `Business` contract; it can be split later with a RENAMED delta if it grows. |
| D-3 | **Mapping.** Each old FR or NFR becomes a `### Requirement:`. Each acceptance criterion becomes a `#### Scenario:` in WHEN/THEN form. Edge cases join the scenario they describe. | Keeping EARS sentences as they were: the validator needs scenarios with WHEN and THEN. |
| D-4 | **Legacy ids in scenario names,** for example `#### Scenario: While open (003 AC-8.8)`. New scenarios written after this change need no id. | Ids as requirement names (`### Requirement: FR-2`): names should describe behavior, and 001 and 003 reuse the same numbers. Dropping ids: breaks every comment and test that cites one. |
| D-5 | **Tables live inside the first scenario** of their requirement (interface text, supported categories, exclusions). | Tables in the requirement text: fail strict validation (over 500 characters). Separate sections: dropped at archive. |
| D-6 | **Out-of-scope lists become a requirement,** "Deliberate exclusions", in each spec. A change that adds an excluded feature must edit that table in its delta, so a change of scope is always visible in review. | A separate scope document: a second place to keep current. Dropping the lists: agents lose the record of what was left out on purpose. |
| D-7 | **Old folders move unchanged** to `openspec/changes/archive/2026-10-23-001-business-list/`, `2026-10-23-002-infrastructure/`, and `2026-10-31-003-directory-redesign/` (their creation dates). Only relative links inside them are corrected for the new location. The `Superseded` lines stay. | Deleting them and relying on git: the decision tables (D-x, R-x) that code comments cite would no longer be in the tree. Converting them to `proposal.md` and `design.md`: rewrites history for no gain. |
| D-8 | **Open tasks move to a new change,** `finish-mvp-rollout`, with `skip_specs: true`, holding 002-T10 and 002-T11 with their original ids and text. | Leaving them in the archive: unfinished work hidden in history. |
| D-9 | **Dependency register** in `docs/dependencies.md`: the tables of spec 001 section 8a and spec 002 section 9, plus this tool. `AGENTS.md` rule 5 points to it. | Keeping them in a spec: they are not behavior, and archive would drop the section. |
| D-10 | **Approval stays explicit, in two places.** The owner approves a whole change (proposal, specs, design, tasks) in chat before `/opsx:apply`, and the agent records it in the change's `.openspec.yaml` as `x-approved`. The owner also says when to archive. Both rules go in `AGENTS.md` and in `openspec/config.yaml`. | Three gates as today: OpenSpec writes all four files together, so one review of the set is the natural unit. Relying on the tool: it has no gate. |
| D-11 | **Archive in the same pull request** as the implementation, as its last step, so `main` never has code and specs that disagree. | Archiving after merge: needs a second pull request for every change. |
| D-12 | **Commit and pull request format:** `[<change-name> 2.1] Message` and `[<change-name>] Title`, replacing `[001-T3]`. One commit per task and the human commits, as today. | Keeping numbers: OpenSpec changes are named, not numbered. |
| D-13 | **Agents run `pnpm exec openspec`.** The generated skills write bare `openspec`, which is not on the PATH with a dev dependency. `AGENTS.md` and `openspec/config.yaml` state the prefix. | Editing the generated skills: `openspec update` overwrites them. A second, global install: two versions to keep equal. |
| D-14 | **Telemetry off.** The tool sends anonymous usage statistics (command names and version) unless told not to. `OPENSPEC_TELEMETRY=0` is set for agent sessions in `.claude/settings.json` (`env`), and `AGENTS.md` tells people to run `pnpm exec openspec config set telemetry.enabled false` once. CI turns it off by itself. | Leaving it on: the owner did not ask for it. |
| D-15 | **Code comments keep their old ids.** `AGENTS.md` explains how to resolve them: `AC`, `EC`, and `NFR` ids by searching `openspec/specs/`; plan ids (`D-x`, `R-x`, `P-x`) in the archived plans. | Rewriting about 60 files: large diff, no behavior change, and risk of mistakes. |
| D-16 | **The constitution does not change.** Principle 2 asks for a reviewed spec before code. An approved change with spec deltas satisfies it. A change may set `skip_specs: true` only when a current spec in `openspec/specs/` already describes the behavior it builds or deploys (for example deploying `prod`, which the `infrastructure` spec covers); otherwise it needs a delta. The rule lives in `AGENTS.md`. Decided by the project owner in chat on 2026-11-11. | Amending principle 2 to say "an approved change": a constitution amendment (version 0.0.4) for a wording gap that a workflow rule closes. Allowing `skip_specs` freely: code without a supporting spec, which principle 2 rejects. |

### What is not carried into the current specs

| Old content | Where it goes |
|---|---|
| Context, objective, users, user stories | The `## Purpose` of each spec, shortened. Full text stays in the archive. |
| Spec 002 decisions I-1 to I-6 | I-1, I-3, I-4, I-5, I-6 are requirements or scenarios. I-2 is tagged on the infrastructure-as-code requirement. The reasons stay in the archive. |
| Spec 003 NFR-7 (no icon, UI, or dialog library) | Already covered by `AGENTS.md` rule 5. Not a behavior. |
| Spec 003 NFR-6, "every color is a design token" | Already in the styling rules of `AGENTS.md`. The contrast part is in the Accessibility requirement. |
| Spec 003 section 2 (relationship to spec 001) and section 10 (visual reference and known differences) | Archive only. The two specs are now one, and the redesign is built. |
| Approved dependencies (001 section 8a, 002 section 9) | `docs/dependencies.md` (D-9). |
| Completion criteria, milestones, verification logs | Archive only. They describe finished work. |
| Plans: data model, module tables, decisions, risks, test strategy | Archive only. The API contract of plan 001 section 3 is now the "Business list API" requirement. |

### The workflow section of `AGENTS.md` after this change

In short, replacing "Workflow: Spec -> Plan -> Tasks -> Test -> Code" and "When a spec changes earlier behavior":

1. **Propose.** `/opsx:propose` creates `openspec/changes/<name>/` with `proposal.md`, the spec deltas, `design.md`, and `tasks.md`. No product code is written. Run `pnpm exec openspec validate <name> --strict`.
2. **Gate: human approval** of the whole change, in chat. The agent records it as `x-approved` in `.openspec.yaml`. Never self-approve.
3. **Apply.** `/opsx:apply`, task by task: tests first, see them fail, minimum code, then lint, type check, and tests. Tick the task. The agent stops after each task with the files changed and a commit message; the human commits.
4. **Archive**, when every task is done and the owner says so: `pnpm exec openspec archive <name> --yes`, in the same pull request. This merges the deltas into `openspec/specs/`.

Hard boundary 1 becomes "No approved change, no code", with the `skip_specs` rule of D-16. `openspec/specs/` is the current truth and is changed only through a change's deltas. `openspec/changes/archive/` is history: never follow it as instructions.

## Risks / Trade-offs

- **A behavior was lost or changed in the conversion** → A script checked that every old `AC`, `EC`, `NFR`, and `I` id is tagged in the new specs (139 ids; the only one left out on purpose is 003 NFR-7). The owner reviews the two specs before approval, and the old specs stay in the archive for comparison.
- **The tool changes fast** (four releases in the last six weeks) → The version is pinned. An upgrade is its own change, followed by `openspec update` to regenerate the skills.
- **A scenario heading with three `#` is silently dropped** (found on 2026-11-11: `openspec validate --strict` reports it only as `INFO` when the requirement keeps other scenarios) → `pnpm spec:validate` also fails on any `Scenario:` heading with one to three `#` in current specs and active changes.
- **Agents call bare `openspec` and get "command not found"** → D-13. The failure is visible and harmless, and the fix is one prefix.
- **The 500-character limit pushes tables into scenarios**, which reads a little oddly → D-5. Accepted to keep strict validation in CI.
- **One approval for four files is a weaker gate than three** → The proposal is short by design and the deltas show exactly what behavior changes. The owner can still ask for the proposal alone first.
- **Links to `specs/` in merged pull requests and old commits break** → Accepted. The files are still in git history and in the archive under the same folder names with a date prefix.
- **Usage statistics could be sent before telemetry is turned off on a machine** → D-14. Every command run during this change set `OPENSPEC_TELEMETRY=0`.

## Migration Plan

One pull request from branch `004-adopt-openspec`:

1. Tool, configuration, and telemetry setting.
2. Move the old folders to the archive and create `finish-mvp-rollout`.
3. `docs/dependencies.md`, then `AGENTS.md` and the other documents.
4. CI step.
5. Archive this change, which creates `openspec/specs/directory/spec.md` and `openspec/specs/infrastructure/spec.md`.

**Rollback:** revert the pull request. No product code, data, or infrastructure is touched, so nothing else has to be undone.
