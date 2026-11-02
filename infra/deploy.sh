#!/usr/bin/env bash
# Deploys one environment (spec 002 FR-6, plan section 6): backend, migrations, frontend.
# Usage: infra/deploy.sh dev|prod
set -euo pipefail

readonly WRANGLER_VERSION=4.151.1
readonly REGION=us-east-1

environment="${1:-}"
if [[ "$environment" != dev && "$environment" != prod ]]; then
  echo "Usage: infra/deploy.sh dev|prod" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

# What is deployed must match a commit, so a rollback can redeploy an earlier one.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "The working tree has uncommitted or untracked files. Commit or remove them before deploying:" >&2
  git status --short >&2
  exit 1
fi

# prod never changes as a side effect of anything else (spec AC-6.2).
if [[ "$environment" == prod ]]; then
  read -r -p "Deploying to prod. Type 'prod' to continue: " answer
  if [[ "$answer" != prod ]]; then
    echo "Aborted. Nothing was changed." >&2
    exit 1
  fi
fi

stack_output() {
  aws cloudformation describe-stacks --region "$REGION" --stack-name "alameda-$environment" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

echo "==> 1/4 Backend: sam build and sam deploy ($environment)"
(
  cd infra
  sam build --config-env "$environment"
  # A frontend-only release has no stack changes; that is not an error.
  sam deploy --config-env "$environment" --no-fail-on-empty-changeset
)

# Runs after the stack update, so migrations must work with the previous and the new backend (spec AC-5.3).
echo "==> 2/4 Migrations ($environment)"
node backend/scripts/migrate.ts "$environment"

echo "==> 3/4 Frontend build"
api_url="$(stack_output ApiUrl)"
VITE_API_BASE_URL="$api_url" pnpm --filter frontend build

# stdin from /dev/null: without a terminal, pnpm skips dependency build scripts instead of asking
# which to approve. Wrangler needs none of them to upload static files.
echo "==> 4/4 Frontend upload to Cloudflare Pages (alameda-$environment)"
pnpm dlx "wrangler@$WRANGLER_VERSION" pages deploy frontend/dist \
  --project-name "alameda-$environment" --branch main </dev/null

echo "Done. $environment is live at $(stack_output FrontendUrl)"
