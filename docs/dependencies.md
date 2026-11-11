# Approved Dependencies

The one register of the packages, tools, and services this project may use, in addition to the fixed stack of `docs/constitution.md` principle 1. AGENTS.md hard boundary 5 sets the rule: a new entry needs the owner's approval first, and is added here in the same change, with the date.

Version ranges live in each `package.json` and exact versions in `pnpm-lock.yaml`. This file records what is approved and why.

## npm packages

| Package | Where | Why | Approved |
|---|---|---|---|
| `express`, `serverless-http` | backend | Express on Lambda; `serverless-http` converts API Gateway events | 2026-10-23 to 2026-10-24, spec 001 section 8a |
| `@aws-sdk/client-rds-data` | backend | Queries Aurora through the RDS Data API (archived spec 002, I-4) | 2026-10-23 to 2026-10-24, spec 001 section 8a |
| `typescript`, `eslint`, `typescript-eslint`, `vitest` | root, backend, frontend (dev) | Strict typing, the `lint` script, and one shared test runner | 2026-10-23 to 2026-10-24, spec 001 section 8a |
| `vite`, `@vitejs/plugin-react` | frontend (dev) | Build and dev server | 2026-10-23 to 2026-10-24, spec 001 section 8a |
| `tailwindcss`, `@tailwindcss/vite` | frontend (dev) | Styling | 2026-10-23 to 2026-10-24, spec 001 section 8a |
| `@tanstack/react-query` | frontend | Server state | 2026-10-23 to 2026-10-24, spec 001 section 8a |
| `react`, `react-dom` | frontend | The UI library of the fixed stack | 2026-10-23 to 2026-10-24, spec 001 section 8a |
| `jsdom`, `@testing-library/react`, `@testing-library/jest-dom` | frontend (dev) | Component and hook tests and readable DOM assertions | 2026-10-23 to 2026-10-24, spec 001 section 8a |
| `@testing-library/user-event` | frontend (dev) | Realistic user interaction in tests. Approved but **not installed**: tests use `fireEvent` instead (archived plan 003, D-11). | 2026-10-23 to 2026-10-24, spec 001 section 8a |
| `@testing-library/dom` | frontend (dev) | Required peer dependency of `@testing-library/react` | 2026-10-29, spec 001 section 8a (001-T9) |
| `@types/node`, `@types/express`, `@types/react`, `@types/react-dom` | backend, frontend (dev) | Type definitions for strict TypeScript | 2026-10-23 to 2026-10-24, spec 001 section 8a |
| `eslint-plugin-react-hooks` | root (dev) | Lint rules for correct hook usage, applied to `frontend/` only. At the root next to `eslint`, because the shared `eslint.config.mjs` imports it. | 2026-10-29, spec 001 section 8a (001-T9) |
| `esbuild` | backend (dev) | Bundles the Lambda, run through `pnpm exec` by the SAM makefile builder | 2026-10-24, spec 002 section 9 |
| `@fission-ai/openspec` | root (dev), exact version `1.16.1` | The OpenSpec CLI: validates specs and changes, and merges a finished change into the current specs (adopt-openspec, design D-1). Sends anonymous usage statistics unless turned off; see AGENTS.md. | 2026-11-10, owner in chat |
| `@anthropic-ai/sdk` | backend | The official SDK for the Claude API, which interprets opening hours requests (edit-opening-hours-with-natural-language, design D-17) | 2026-11-11, owner in chat |
| `@aws-sdk/client-ssm` | backend | Reads the admin key and the Anthropic API key from SSM Parameter Store. Kept on the same version as `@aws-sdk/client-rds-data`, so both share their internal packages (edit-opening-hours-with-natural-language, design D-17) | 2026-11-11, owner in chat |

## Tools and services outside the lockfile

| Tool or service | Where | Why | Approved |
|---|---|---|---|
| AWS SAM CLI | developer machine | Builds and deploys the template | 2026-10-24, spec 002 section 9 |
| AWS CLI | developer machine | Authentication, stack outputs, Data API checks | 2026-10-24, spec 002 section 9 |
| GitHub Actions | `.github/workflows/` | CI for pull requests | 2026-10-24, spec 002 section 9 |
| Cloudflare account (free plan) | external service | Hosts the frontend | 2026-11-02, spec 002 section 9 |
| Wrangler CLI `4.151.1` | developer machine, run as `pnpm dlx wrangler@4.151.1`, not in `package.json` | Creates the Pages project and deploys the built frontend | 2026-11-02, spec 002 section 9 |
| Anthropic API (Claude Haiku 5.5) | external paid service, called by the backend | Interprets opening hours requests written in Spanish (edit-opening-hours-with-natural-language) | 2026-11-11, owner in chat |

Tools outside the lockfile are documented with their required version in `infra/README.md`.

## Sources

The entries up to 2026-11-02 come from section 8a of the archived spec 001 and section 9 of the archived spec 002, in `openspec/changes/archive/`.
