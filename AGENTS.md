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
- Methodology: Spec-Driven Development (SDD). Specs are the source of truth, code is derived from them.

## Repository layout

- `docs/constitution.md` — non-negotiable principles.
- `specs/<NNN-feature-name>/` — `spec.md`, `plan.md`, `tasks.md` for each feature.
- `frontend/` — React + TypeScript app (Tailwind CSS, TanStack Query).
- `backend/` — Lambda/Express handlers, services (business logic), repositories (SQL).
- `backend/migrations/` — versioned, explicit SQL migrations.
- `playground/` — design sandbox outside the SDD workflow (see "Playground" below).
- `pnpm-workspace.yaml` and `pnpm-lock.yaml` at the repository root. Always commit the lockfile.

## Hard boundaries (never violate)

1. **No spec, no code.** Never write or modify source code, tests, migrations, or configuration unless an approved Markdown spec in `specs/` covers the change. If none exists, stop and ask for one.
2. **Approval is explicit.** A spec, plan, or task list is approved only when a human says so in the chat or marks `Status: Approved` in the file. Never self-approve.
3. **English everywhere except the UI.** All code, comments, identifiers, specs, commit messages, PR text, logs, and API field names must be in English, regardless of the language used in the chat. Only user interface text (labels, buttons, loading, empty, and error messages) is written in Spanish. Translation or multi-language support is out of scope until an approved spec adds it.
4. **No scope creep.** Implement only what the approved spec and tasks describe. Propose extras as spec changes instead of coding them.
5. **No heavy abstractions.** No ORMs, no DI frameworks, no generic repositories, no global state libraries, no UI component libraries. Do not add any library beyond the stack listed above without an approved spec that justifies it.
   - First decide whether the library is necessary: prefer the standard library or a few lines of code, and do not add a package that only makes tests or types slightly nicer.
   - If it is necessary, stop and ask the human before installing. Say what the package does, which task needs it, and what the alternative without it would be.
   - Only after approval, install it and record it in the dependency table of the spec in the same change, with the date.
6. **pnpm only.** Never use `npm` or `yarn`, and never commit `package-lock.json` or `yarn.lock`.
7. **Never commit secrets.** No credentials, tokens, or account IDs in code, tests, or specs. Use environment variables and IAM roles.

## Workflow: Spec -> Plan -> Tasks -> Test -> Code

Follow these steps in order. Do not skip ahead, and stop at each approval gate.

1. **Spec** — Write or update `specs/<NNN-feature>/spec.md`: goal, user stories, acceptance criteria, API contract, data model, out-of-scope. **Gate: human approval.**
2. **Plan** — Before writing, read the feature's `spec.md` (it must be `Status: Approved`). Write `plan.md`: technical approach within the fixed stack, files to touch, data flow, risks. **Gate: human approval.**
3. **Tasks** — Before writing, read the approved `spec.md` and `plan.md`. Write `tasks.md`: small, ordered, verifiable tasks, each linked to an acceptance criterion. **Gate: human approval.**
4. **Test** — For each task, write the automated tests first (business rules and API endpoint). Run them and confirm they fail for the right reason.
5. **Code** — Write the minimum code to make the tests pass. Run lint, type check, and the full test suite. Mark the task done in `tasks.md`.

Every PR must link to its spec, and each commit should reference a task.

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
- Build: `pnpm -r build`
- Add a dependency (only when a spec approves it): `pnpm --filter <package> add <name>`

Run lint, type check, and tests before finishing any task, and fix failures before reporting completion.

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

- Commit messages in English, imperative mood, referencing the task, for example: `[001-T3] Add businesses list endpoint`.
- One branch and one pull request per milestone, one commit per task (see the milestone table in `specs/001-business-list/tasks.md`).
- PR title format: `[001-business-list] <Short title>`.
- PR description must link the spec and list which acceptance criteria it satisfies.
- A PR that violates `docs/constitution.md` or this file is rejected.

### Git: the human commits

- The agent may create and switch branches, and may stage files (`git add`).
- The agent never runs `git commit`, `git push`, `git merge`, `git rebase`, or `git reset`. The project settings (`.claude/settings.json`) also block these commands.
- When a task is done, the agent stops and reports: the files changed, the checks it ran, and a suggested commit message (English, imperative, with the task id, for example `[001-T3] Add WhatsApp number rule`).
- The human reviews the diff (`git diff --staged`) and commits.

## Playground

`playground/` is a design sandbox and a black box for this file: the SDD workflow and the rules above do not apply inside it, except the security rules (never commit secrets). Its own rules and instructions are in `playground/README.md`.

## When in doubt

Stop and ask. Ambiguity belongs in the spec, not in the code.