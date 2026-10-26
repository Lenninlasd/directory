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
- 002-T2: create, update, and delete the VPC, subnets, and security group (`ec2:*Vpc*`, `ec2:*Subnet*`, `ec2:*SecurityGroup*`, `ec2:Describe*`, `ec2:CreateTags`), the DB subnet group, cluster, and instance (`rds:*` on `alameda-*` resources); the Aurora-managed master secret (`secretsmanager:CreateSecret`, `secretsmanager:TagResource`, `secretsmanager:RotateSecret`, `kms:DescribeKey` on the `aws/secretsmanager` key); and, for the Data API check, `rds-data:ExecuteStatement` on the cluster and `secretsmanager:GetSecretValue` on its secret.

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

### Aurora cluster with the Data API (002-T2, spec AC-3.1 to AC-3.5, NFR-3)

Engine version: Aurora PostgreSQL 17.11, the latest 17.x in `us-east-1` on 2026-10-26 (`aws rds describe-db-engine-versions --engine aurora-postgresql`), with Serverless v2 minimum capacity 0 (auto-pause). The Data API needs 17.4 or newer (plan V-4).

Set these variables first (stack outputs, no values are written to the repository):

```
CLUSTER_ARN=$(aws cloudformation describe-stacks --stack-name alameda-dev --query "Stacks[0].Outputs[?OutputKey=='ClusterArn'].OutputValue" --output text)
SECRET_ARN=$(aws cloudformation describe-stacks --stack-name alameda-dev --query "Stacks[0].Outputs[?OutputKey=='SecretArn'].OutputValue" --output text)
```

| Check | Expected (`dev`) | Result |
|---|---|---|
| `aws rds describe-db-clusters --db-cluster-identifier alameda-dev-db --query "DBClusters[0].{Engine:Engine,Version:EngineVersion,Encrypted:StorageEncrypted,DataApi:HttpEndpointEnabled,Scaling:ServerlessV2ScalingConfiguration,Backups:BackupRetentionPeriod,DeletionProtection:DeletionProtection,ManagedSecret:MasterUserSecret.SecretStatus}"` | `aurora-postgresql`, `17.11`, encrypted `true`, Data API `true`, scaling 0 to 1 ACU with auto-pause after 3600 s, backups 1 day, deletion protection `false`, managed secret `active` | Passed (2026-10-26): `aurora-postgresql` `17.11`, encrypted `true`, Data API `true`, 0 to 1 ACU, auto-pause 3600 s, backups 1, deletion protection `false`, secret `active` |
| `aws rds describe-db-instances --db-instance-identifier alameda-dev-db-writer --query "DBInstances[0].{Class:DBInstanceClass,Public:PubliclyAccessible}"` | `db.serverless`, public `false` | Passed (2026-10-26): `db.serverless`, public `false` |
| `aws ec2 describe-security-groups --filters Name=tag:Name,Values=alameda-dev-db-sg --query "SecurityGroups[0].IpPermissions"` | `[]` (no inbound rules) | Passed (2026-10-26): `[]` |
| `aws ec2 describe-internet-gateways --filters Name=attachment.vpc-id,Values=<vpc id of the cluster subnets>` | No internet gateway: the subnets are private | Passed (2026-10-26): no internet gateway; the only route is `10.0.0.0/16 local` |
| `aws rds-data execute-statement --resource-arn "$CLUSTER_ARN" --secret-arn "$SECRET_ARN" --database alameda --sql "select 1"` | `records` is `[[{"longValue": 1}]]`. If the cluster is paused, the first call fails with `DatabaseResumingException`; retry after about 30 s (plan V-6). | Passed (2026-10-26): `[[{"longValue": 1}]]` |
| `aws cloudformation get-template --stack-name alameda-dev --template-stage Processed` | Cluster and instance have `DeletionPolicy: Delete` in `dev` | Passed (2026-10-26): `Delete` for both |
| `prod` values: scaling 0.5 to 2 ACU without auto-pause, backups 7 days, deletion protection `true`, `DeletionPolicy: Retain` | Checked in 002-T10, when `prod` is created (M5) | Pending |
