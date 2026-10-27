# Called by `sam build` (BuildMethod: makefile, spec 002 plan section 7). SAM sets ARTIFACTS_DIR.
# esbuild runs through pnpm, so the bundle uses the dependency versions in pnpm-lock.yaml.
# Run `pnpm install` at the repository root before `sam build`.
# Not minified: it does not change load time for this bundle, and the code stays readable in the console.
# The source map lets stack traces point to the TypeScript files (NODE_OPTIONS in infra/template.yaml).

build-ApiFunction:
	pnpm exec esbuild src/handlers/lambda.ts --bundle --platform=node --target=node24 --format=cjs --sourcemap --outfile=$(ARTIFACTS_DIR)/lambda.js
