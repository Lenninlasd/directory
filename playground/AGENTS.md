# AGENTS.md (playground)

Rules for AI coding agents working inside `playground/`. They replace the root `AGENTS.md` here. The SDD workflow, the approval gates, the testing standard, and the architecture and styling rules do not apply. How to run the playground is in `README.md`.

## Rules

- **Stay inside `playground/`.** A playground task never changes files outside this folder. If a design needs a product change, stop and propose a spec in `specs/` instead.
- **Self-contained.** Never import from `frontend/`, `backend/`, or any other folder. Copy what is needed into `src/`, and accept that copies drift.
- **No new packages.** `package.json` keeps the same dependencies and version ranges as `frontend/package.json`. Never add a package only for the playground.
- **pnpm only**, run from inside `playground/`. It is its own pnpm project, not part of the root workspace.
- **Type check before finishing:** `pnpm typecheck`. There is no lint, test, or build script.
- **Spanish UI text, English code**, comments, and identifiers.

## Security (same as the root AGENTS.md)

- Never commit secrets: no credentials, tokens, account IDs, or API URLs in code. The `dev` API origin lives only in the uncommitted `.env.development.local`.
- Example data must never reach a real site or person: use `example.com` for websites and invalid WhatsApp numbers (prefix `570`).
- The human commits. Never run `git commit`, `git push`, `git merge`, `git rebase`, or `git reset`. When done, report the files changed, the type check result, and a suggested commit message like `[playground] Add map view`.
