# Infrastructure and Deployment

Deployment guide for spec 002. Sections are added as the tasks in `specs/002-infrastructure/tasks.md` are completed.

## Prerequisites

These tools run on the developer machine. They are not npm packages and are not in the lockfile (spec 002 section 9). Record the versions you use here.

| Tool | Used for | Install | Version used |
|---|---|---|---|
| Node.js 24 and pnpm | Build and tests | See the root `package.json` (`packageManager`) | Node 24.22.1, pnpm 12.15.0 |
| AWS CLI v2 | Credentials, Data API checks, S3 upload, CloudFront invalidation | [AWS CLI install guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), macOS package installer | 2.38.5 |
| AWS SAM CLI | Validate, build, and deploy the template | [SAM CLI install guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html), macOS package installer (needs macOS 13 or newer) | 1.170.0 |

### AWS credentials

1. Sign in with `aws login` (browser sign-in with console credentials, temporary credentials, no access keys on disk). Alternatively, use IAM Identity Center with `aws configure sso`. Never commit keys.
2. Check it with `aws sts get-caller-identity`; the account ID it prints must not be written into any file in this repository.
3. Deploys go to `us-east-1`. The profile is chosen with `AWS_PROFILE`, or the default profile is used.

Permissions needed so far (extended by later tasks as resources are added):
- 002-T1: create, update, and delete CloudFormation stacks named `alameda-*`, and use the S3 bucket that SAM creates for deployment artifacts.

## Commands

Run SAM commands from the `infra/` directory. The environment is chosen with `--config-env`:

```
cd infra
sam validate --lint
sam deploy --config-env dev
```

`sam deploy` asks for confirmation of the change set (`confirm_changeset = true`) before changing anything.

## One-time manual setup

### Branch protection for `main` (002-T0)

CI runs on every pull request to `main` (`.github/workflows/ci.yml`). To make a failing check block the merge:

1. GitHub repository → **Settings** → **Branches** (or **Rules** → **Rulesets**).
2. Add a rule for `main`: require a pull request before merging, and require the status check **`test`** (the CI job) to pass.

## Verification

### CI (002-T0, spec AC-8.1, AC-8.2)

| Check | Expected | Result |
|---|---|---|
| Pull request with a deliberately failing test | Check `test` fails and the merge is blocked | Pending |
| Same pull request after the fix | Check `test` passes | Pending |
| Workflow has no AWS credentials and no deploy step | `ci.yml` only installs, lints, type checks, and tests | Pending |

### Template skeleton (002-T1, spec AC-1.1, AC-1.2, AC-1.3)

| Check | Expected | Result |
|---|---|---|
| `cd infra && sam validate --lint` | Passes with no errors | Passed (2026-10-25) |
| `infra/samconfig.toml` has no account ID or access key | `grep -E '[0-9]{12}\|AKIA' infra/samconfig.toml` finds nothing | Passed (2026-10-24) |
| Both environments use the same template, only parameters differ | `dev` and `prod` sections differ only in stack name, `Environment`, and tags | Passed (2026-10-24, by diffing the two sections) |
| `cd infra && sam deploy --config-env dev` | Creates stack `alameda-dev` with the placeholder resource and output `Environment = dev` | Passed (2026-10-26): `CREATE_COMPLETE`, tags `Project=alameda` and `Environment=dev`, output `Environment = dev` |
