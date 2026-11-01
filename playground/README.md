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

## Rules

- **Self-contained.** Never import from `frontend/` or `backend/`, and nothing imports from here. `src/api`, `src/features`, `strings.ts`, and `queryClient.ts` are copies from `frontend/src/` and may drift.
- **Same packages as the frontend.** Keep `package.json` dependencies and version ranges identical to `frontend/package.json`. Never add a package only for the playground.
- **No secrets.** Example data uses `example.com` sites and invalid WhatsApp numbers (prefix `570`), so nothing reaches a real site or person.
- **Separate pull requests**, titled `[playground] <Short title>`.
- **Spanish UI text, English code.**
- **Moving a design to the product** happens only through a spec in `specs/`, which can reference files here. Code is rebuilt in `frontend/`, never copied.

## Add a view

Create a component in `src/views/` that receives `{ businesses }` and register it in `src/views/index.ts`. The first view in the list is the default.
