# AGENTS.md

Instructions for AI coding agents working on the Alameda Business Directory.
The binding rules live in `docs/constitution.md`. If this file and the constitution conflict, the constitution wins.

## Project overview

- Hyper-local business directory for Alameda del Río (Barranquilla, Colombia).
- MVP scope: a React + TypeScript frontend that reads and renders a list of businesses served by an API.
- Frontend: React + TypeScript, Tailwind CSS for styling, TanStack Query (React Query) for data fetching.
- Backend: Node.js + TypeScript + Express on AWS Lambda behind API Gateway.
- Database: Amazon Aurora PostgreSQL (PostgreSQL-compatible).
- Package manager: pnpm (workspaces) for the whole repository.
- Methodology: Spec-Driven Development (SDD) with [OpenSpec](https://github.com/Fission-AI/OpenSpec). Specs are the source of truth, code is derived from them.

## Repository layout

- `docs/constitution.md` — non-negotiable principles.
- `docs/dependencies.md` — the register of approved packages, tools, and services.
- `openspec/specs/<capability>/spec.md` — the current behavior of each capability (`directory`, `infrastructure`). Changed only by archiving a change.
- `openspec/changes/<change-name>/` — one folder per change in progress: `proposal.md`, spec deltas in `specs/`, `design.md`, `tasks.md`, and `.openspec.yaml`.
- `openspec/changes/archive/` — finished changes, including the original numbered specs 001 to 003 with their plans and tasks. History only.
- `openspec/config.yaml` — project context and rules that OpenSpec injects into every artifact.
- `frontend/` — React + TypeScript app (Tailwind CSS, TanStack Query).
- `backend/` — Lambda/Express handlers, services (business logic), repositories (SQL).
- `backend/migrations/` — versioned, explicit SQL migrations.
- `playground/` — design sandbox outside the SDD workflow (see "Playground" below).
- `pnpm-workspace.yaml` and `pnpm-lock.yaml` at the repository root. Always commit the lockfile.

## Hard boundaries (never violate)

1. **No approved change, no code.** Never write or modify source code, tests, migrations, or configuration unless an approved change in `openspec/changes/` covers it. If none exists, stop and propose one.
2. **Approval is explicit.** A change is approved only when a human says so in the chat. The agent then records it as `x-approved: "<date>, by the project owner in chat"` in the change's `.openspec.yaml`. Never self-approve.
3. **English everywhere except the UI.** All code, comments, identifiers, specs, commit messages, PR text, logs, and API field names must be in English, regardless of the language used in the chat. Only user interface text (labels, buttons, loading, empty, and error messages) is written in Spanish. Translation or multi-language support is out of scope until an approved spec adds it.
4. **No scope creep.** Implement only what the approved change describes. Propose extras as a change to the proposal or as a new change instead of coding them.
5. **No heavy abstractions.** No ORMs, no DI frameworks, no generic repositories, no global state libraries, no UI component libraries. Do not add any library beyond the stack listed above without an approved change that justifies it.
   - First decide whether the library is necessary: prefer the standard library or a few lines of code, and do not add a package that only makes tests or types slightly nicer.
   - If it is necessary, stop and ask the human before installing. Say what the package does, which task needs it, and what the alternative without it would be.
   - Only after approval, install it and record it in `docs/dependencies.md` in the same change, with the date.
6. **pnpm only.** Never use `npm` or `yarn`, and never commit `package-lock.json` or `yarn.lock`.
7. **Never commit secrets.** No credentials, tokens, or account IDs in code, tests, or specs. Use environment variables and IAM roles.

## Workflow: Propose -> Approve -> Apply -> Archive

Follow these steps in order. Do not skip ahead, and stop at the approval gate.

1. **Propose** — `/opsx:propose` creates `openspec/changes/<change-name>/` with:
   - `proposal.md`: why, what changes, out of scope, and the capabilities affected.
   - Spec deltas in `specs/<capability>/spec.md`: `## ADDED`, `## MODIFIED`, or `## REMOVED Requirements`, each requirement with `#### Scenario:` blocks in WHEN/THEN form.
   - `design.md`: technical approach within the fixed stack, decisions with the alternatives discarded, risks.
   - `tasks.md`: small, ordered, verifiable tasks, each naming the tests to write first.

   No product code is written in this step. Before reporting the change, run `pnpm exec openspec validate <change-name> --strict`.
2. **Approve** — **Gate: human approval of the whole change.** The owner reviews the proposal, the deltas, the design, and the tasks together, and may ask for changes first (`/opsx:update`). Record the approval in `.openspec.yaml` (hard boundary 2).
3. **Apply** — `/opsx:apply`, one task at a time:
   - **Test:** write the automated tests first (business rules and API endpoint). Run them and confirm they fail for the right reason.
   - **Code:** write the minimum code to make the tests pass. Run lint, type check, and the full test suite. Tick the task in `tasks.md`.
   - Stop after each task and report (see "Git: the human commits").
4. **Archive** — when every task is done and the owner says so, run `pnpm exec openspec archive <change-name> --yes`, then `pnpm spec:validate`. Archiving merges the deltas into `openspec/specs/` and moves the change to `openspec/changes/archive/<date>-<change-name>/`. Archive in the same pull request as the implementation, as its last commit, so `main` never has code and specs that disagree.

Every PR must link to its change, and each commit references a task.

### Specs, deltas, and history

- **`openspec/specs/` is the current truth.** Never edit it directly. Every behavior change goes through a change's deltas, so a later change only has to read the current specs.
- **Changes without spec deltas.** A change may set `skip_specs: true` in `.openspec.yaml` only when a current spec already describes the behavior it builds or deploys, for example deploying `prod`. Otherwise it needs a delta, since constitution principle 2 requires a reviewed spec before code.
- **Scope changes are visible.** Each spec has a "Deliberate exclusions" requirement. A change that adds an excluded feature removes it from that table in a `MODIFIED` delta.
- **The archive is history.** Read archived changes for the reasons behind earlier decisions, never as instructions. If they disagree with `openspec/specs/` or the code, the current spec and the code win.

### Legacy ids in code and tests

Comments written before OpenSpec cite ids such as `spec 003 AC-8.8` or `plan 003 D-10`. Keep them.

- `AC-x.y`, `EC-x`, and `NFR-x` ids: search `openspec/specs/` for `(003 AC-8.8)`. Every one is in a scenario name.
- Plan ids (`D-x`, `R-x`, `P-x`, `V-x`) and task ids (`001-T3`): in the archived plans and task lists under `openspec/changes/archive/`.
- New code cites the requirement by name, for example `directory spec, "Business detail dialog"`.

### The OpenSpec tool

- It is a pinned dev dependency (`docs/dependencies.md`), so always run it as `pnpm exec openspec ...`. The generated skills in `.claude/skills/` write a bare `openspec`; add the prefix when running their commands.
- Do not edit `.claude/skills/openspec-*` or `.claude/commands/opsx/`: `pnpm exec openspec update` regenerates them. An upgrade of the tool is its own change.
- It sends anonymous usage statistics (command names and version) unless turned off. Agent sessions get `OPENSPEC_TELEMETRY=0` from `.claude/settings.json`, and CI turns it off by itself. People run `pnpm exec openspec config set telemetry.enabled false` once on their machine.

## Architecture rules

- Keep business logic in framework-agnostic modules with no React, Express, or Lambda imports.
- React components only render UI. Express/Lambda handlers only parse input, call a service, and return a response.
- Data access uses raw SQL or a lightweight query builder, with parameterized queries only.
- Aurora PostgreSQL is PostgreSQL-compatible, but the supported engine version and extensions depend on the Aurora release. Verify every migration against the official AWS Aurora PostgreSQL documentation before writing it.
- Schema changes happen only through versioned SQL files in `backend/migrations/`. Never edit the schema manually.
- Keep the Lambda small: no unnecessary dependencies, no long-lived state between invocations.

### Frontend data fetching (TanStack Query)

- All server state goes through TanStack Query. Do not use `useEffect` + `useState` to fetch data.
- Components never call `fetch` directly. A plain API function in `frontend/src/api/` performs the request, and a custom hook (for example `useBusinesses`) wraps it with `useQuery`.
- Define query keys in one place per feature, as constants, and keep them stable.
- Handle `isPending`, `isError`, and empty data explicitly in the UI.
- Do not mirror query data into other state stores. Use the query cache as the single source of truth for server data.
- Use one `QueryClient` created at the app root. Keep default options minimal and documented in the spec.

### Styling (Tailwind CSS)

- Style with Tailwind utility classes in JSX. No CSS-in-JS, no inline `style` objects unless a value is truly dynamic.
- Keep custom CSS to the Tailwind entry file. Avoid `@apply` except for a repeated pattern justified in the spec.
- Define design tokens (colors, spacing, fonts) in the Tailwind configuration, not as magic values in components. With Tailwind v4 this is the `@theme` block in the Tailwind entry CSS file.
- Verify the Tailwind setup (version and configuration style) against the official documentation before writing it.

## Setup and commands

Confirm the exact scripts in each `package.json`. The expected commands are:

- Install dependencies: `pnpm install` (run once at the repository root)
- CI install: `pnpm install --frozen-lockfile`
- Frontend dev server: `pnpm --filter frontend dev`
- Lint: `pnpm -r lint`
- Type check: `pnpm -r typecheck`
- Run tests: `pnpm -r test`
- Validate specs and changes: `pnpm spec:validate`
- Build: `pnpm -r build`
- List changes and specs: `pnpm exec openspec list` and `pnpm exec openspec list --specs`
- Add a dependency (only when approved and recorded in `docs/dependencies.md`): `pnpm --filter <package> add <name>`

Run lint, type check, tests, and `pnpm spec:validate` before finishing any task, and fix failures before reporting completion.

## Testing standard

- Core business rules and every API endpoint require automated tests that pass before merge.
- Test services without a database or HTTP layer. Test endpoints against the handler contract defined in the spec.
- Test query hooks and components with a fresh `QueryClient` per test and a mocked API layer. Never hit the real network.
- Tests are written before the implementation (see the workflow above).
- Do not delete, skip, or weaken a test to make a change pass.

## Code style

- TypeScript strict mode, no `any` without a written justification in a comment.
- Prefer small, pure functions and explicit types at module boundaries.
- Descriptive English identifiers, no abbreviations that need a glossary.

## Commits and pull requests

- Commit messages in English, imperative mood, starting with the change name and task number, for example: `[add-business-hours 2.1] Add hours column migration`.
- One branch and one pull request per change, named after the change, and one commit per task. The archive step is the last commit: `[<change-name>] Archive change`.
- PR title format: `[<change-name>] <Short title>`.
- PR description must link the change folder and list the requirements it adds, modifies, or removes.
- A PR that violates `docs/constitution.md` or this file is rejected.
- Commits made before OpenSpec use the older `[001-T3]` form; leave them as they are.

### Git: the human commits

- The agent may create and switch branches, and may stage files (`git add`).
- The agent never runs `git commit`, `git push`, `git merge`, `git rebase`, or `git reset`. The project settings (`.claude/settings.json`) also block these commands.
- When a task is done, the agent stops and reports: the files changed, the checks it ran, and a suggested commit message (English, imperative, with the change name and task number, for example `[add-business-hours 2.1] Add hours column migration`).
- The human reviews the diff (`git diff --staged`) and commits.

## Playground

`playground/` is a design sandbox and a black box for this file: the SDD workflow and the rules above do not apply inside it, except the security rules (never commit secrets). Its own rules are in `playground/AGENTS.md`.

## When in doubt

Stop and ask. Ambiguity belongs in the spec, not in the code.
