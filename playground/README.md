# Playground

A sandbox for exploring UI designs for the Alameda directory. It is committed and shared, but it is not part of the product: the SDD workflow does not apply here (`docs/constitution.md`, principle 2), and it is never deployed.

## Run it

It is its own pnpm project, separate from the repository workspace.

1. Create `playground/.env.development.local` (uncommitted) with the `dev` API origin:

   ```
   DEV_API_URL=<dev API origin>
   ```

2. Install and start:

   ```sh
   cd playground
   pnpm install
   pnpm dev
   ```

3. Open http://localhost:5174 and pick a view from the menu (☰). The menu's "Datos de ejemplo" switch adds made-up businesses, photos, websites, and hours.

Before pushing, run `pnpm typecheck`. There is no lint, test, or build script.

## Working on it

- Never import from `frontend/` or `backend/`. `src/api`, `src/features`, `strings.ts`, and `queryClient.ts` are copies from `frontend/src/` and may drift.
- Keep `package.json` identical to the frontend's dependencies. Never add a package only for the playground.
- Open changes in their own pull request, titled `[playground] <Short title>`.
- A design reaches the product only through a spec in `specs/`, which can reference files here.

Rules for AI agents are in `AGENTS.md`.

## Add a view

Create a component in `src/views/` that receives `{ businesses }` and register it in `src/views/index.ts`. The first view in the list is the default.
