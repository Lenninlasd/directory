# Infrastructure and Deployment

Deployment guide for spec 002. Sections are added as the tasks in `specs/002-infrastructure/tasks.md` are completed.

## Architecture

Solid boxes exist in `dev` today. Boxes marked `(planned)` come with task 002-T7.

```
                          +-----------------------+
                          |  Browser (Spanish UI) |
                          +-----------+-----------+
                                      | HTTPS
              +-----------------------+----------------------+
              | static files                                 | GET /businesses (CORS)
              v                                              v
   +----------------------+                      +--------------------------+
   | CloudFront (OAC)     |                      | API Gateway HTTP API     |
   | (planned, T7)        |                      | GET /businesses          |
   +----------+-----------+                      +------------+-------------+
              v                                               v
   +----------------------+                      +--------------------------+
   | S3 bucket (private)  |                      | Lambda `api` (no VPC)    |
   | React + Tailwind     |                      | nodejs24.x, arm64        |
   | (planned, T7)        |                      | 256 MB, timeout 10 s     |
   +----------------------+                      +------------+-------------+
                                                              | AWS SDK, IAM role:
                                                              | rds-data:ExecuteStatement
                                                              | secretsmanager:GetSecretValue
                                                              v
 +------------------------ AWS (us-east-1), one stack per environment --------------------+
 |                                                                                        |
 |            +-----------------------------+        +--------------------------+         |
 |            | RDS Data API (HTTPS)        |------->| Secrets Manager          |         |
 |            | EnableHttpEndpoint: true    | creds  | Aurora-managed password  |         |
 |            +--------------+--------------+        +--------------------------+         |
 |                           | AWS internal path                                          |
 |  +------------------------+------------ VPC 10.0.0.0/16 -----------------------------+ |
 |  |  no internet gateway, no NAT          |                                           | |
 |  |   +-----------------------------------v---------------------------------------+   | |
 |  |   | Private subnet A (10.0.1.0/24, AZ 1)  Private subnet B (10.0.2.0/24, AZ 2)|   | |
 |  |   |   +---------------------------------------------------------------+       |   | |
 |  |   |   | Aurora PostgreSQL 17.11 Serverless v2 (1 writer, encrypted)   |       |   | |
 |  |   |   | db-sg: no inbound rules                                       |       |   | |
 |  |   |   +---------------------------------------------------------------+       |   | |
 |  |   +---------------------------------------------------------------------------+   | |
 |  +-----------------------------------------------------------------------------------+ |
 +----------------------------------------------------------------------------------------+
                                          ^
                                          | same Data API, your own AWS credentials
                         +----------------+-----------------+
                         | Developer machine                |
                         | node backend/scripts/migrate.ts  |
                         +----------------------------------+
```

Backend layers, from the request to the database:

```
API Gateway event
  -> handlers/lambda.ts                    serverless-http adapter, builds the Data API client per request
  -> app.ts                                Express: GET /businesses
  -> services/businessService.ts           business rules, framework-free
  -> repositories/businessRepository.ts    parameterized SQL
  -> db/dataApi.ts                         ExecuteStatement through @aws-sdk/client-rds-data
  -> Aurora PostgreSQL
```

Why two subnets: an RDS DB subnet group must span at least two Availability Zones, even for a single writer (plan P-5). The second subnet is what allows Aurora to place or fail over an instance in another zone later.

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
- 002-T3: `cloudformation:DescribeStacks` on `alameda-*` stacks; `rds-data:ExecuteStatement`, `rds-data:BeginTransaction`, `rds-data:CommitTransaction`, and `rds-data:RollbackTransaction` on the cluster; `secretsmanager:GetSecretValue` on its secret.
- 002-T4: create, update, and delete the `alameda-*` Lambda function (`lambda:*Function*`, `lambda:*Permission`, `lambda:TagResource`), its role (`iam:CreateRole`, `iam:DeleteRole`, `iam:GetRole`, `iam:PutRolePolicy`, `iam:DeleteRolePolicy`, `iam:GetRolePolicy`, `iam:TagRole`, `iam:PassRole` on `alameda-*` roles), the HTTP API (`apigateway:*` on `/apis*`), and the log group (`logs:CreateLogGroup`, `logs:DeleteLogGroup`, `logs:PutRetentionPolicy`, `logs:TagResource`, `logs:DescribeLogGroups`); for the checks, `lambda:GetFunctionConfiguration`, `iam:ListAttachedRolePolicies`, and `logs:FilterLogEvents`.

## Commands

Run SAM commands from the `infra/` directory. The environment is chosen with `--config-env`:

```
cd infra
sam validate --lint
sam build --config-env dev
sam deploy --config-env dev
```

`sam deploy` asks for confirmation of the change set (`confirm_changeset = true`) before changing anything.

### Migrations and seed (002-T3)

Run from the repository root with Node.js 24 (it runs the TypeScript file directly, no build step):

```
node backend/scripts/migrate.ts dev           # apply pending backend/migrations/*.sql
node backend/scripts/migrate.ts dev --seed    # also run backend/seeds/dev_businesses.sql (dev only)
```

The script reads the cluster ARN, secret ARN, and database name from the `alameda-<env>` stack with the AWS CLI, then calls the Data API with your credentials. It prints each applied file and exits with a non-zero code if a migration fails (that file is rolled back and later files are not run). `--seed` is refused for `prod`. If the `dev` cluster is paused, the first run fails with `DatabaseResumingException`; run it again after about 30 seconds.

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

### Migration script (002-T3, spec AC-5.1, AC-5.2, AC-5.2a, EC-4)

| Check | Expected | Result |
|---|---|---|
| `node backend/scripts/migrate.ts` with Node.js 24 and no arguments | Prints the usage and exits with code 1 (Node runs the TypeScript file directly, plan R-4) | Passed (2026-10-26): usage printed, exit 1, Node 24.22.1 |
| `node backend/scripts/migrate.ts prod --seed` | Refused with exit code 1 before reading the stack | Passed (2026-10-26): `--seed is only allowed for dev`, exit 1 |
| `node backend/scripts/migrate.ts dev` | Prints `Applied 001_create_businesses.sql` | Passed (2026-10-26) after the cluster resumed; the first attempt hit the paused cluster and failed as documented |
| Same command again | Prints `No pending migrations` | Passed (2026-10-26) |
| `aws rds-data execute-statement --resource-arn "$CLUSTER_ARN" --secret-arn "$SECRET_ARN" --database alameda --sql "select name from schema_migrations"` | Lists `001_create_businesses.sql` | Passed (2026-10-26): `001_create_businesses.sql`; `businesses` exists with 0 rows |
| Failure cases (unknown environment, failing migration exits non-zero, stack unreadable) | Covered by `backend/test/scripts/migrate.test.ts` | Passed (2026-10-26): 12 tests, full suite 67 passed |

### API Lambda, HTTP API, CORS, and logs (002-T4, spec AC-2.1 to AC-2.5, NFR-5)

Set this variable first (stack output, no value is written to the repository):

```
API_URL=$(aws cloudformation describe-stacks --stack-name alameda-dev --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)
```

| Check | Expected (`dev`) | Result |
|---|---|---|
| `curl -i "$API_URL/businesses"` | `200`, `content-type: application/json`, body `{"businesses":[]}` (no seed yet). If the cluster is paused, the first request returns `500 {"error":"internal_error"}`; retry after about 30 s (plan P-12). | Passed (2026-10-27): first requests returned `500 {"error":"internal_error"}` with `DatabaseResumingException` in the logs (cluster paused, as documented); after the resume `200`, `application/json`, `{"businesses":[]}` |
| `curl -i -H "Origin: https://example.com" "$API_URL/businesses"` | No `access-control-allow-origin` header (no browser origin is allowed until 002-T7 adds the CloudFront origin) | Passed (2026-10-27): `200`, no `access-control-*` headers |
| `aws logs describe-log-groups --log-group-name-prefix /aws/lambda/alameda-dev-api --query "logGroups[].{Name:logGroupName,Retention:retentionInDays}"` | One group `/aws/lambda/alameda-dev-api`, retention `30` | Passed (2026-10-27): one group, retention `30` |
| `aws lambda get-function-configuration --function-name alameda-dev-api --query "{Runtime:Runtime,Arch:Architectures,Memory:MemorySize,Timeout:Timeout,Vpc:VpcConfig.SubnetIds,Log:LoggingConfig.LogGroup,Env:keys(Environment.Variables)}"` | `nodejs24.x`, `arm64`, 256 MB, 10 s, no VPC subnets, log group `/aws/lambda/alameda-dev-api`, variables `DATABASE_NAME`, `DATA_API_CLUSTER_ARN`, `DATA_API_SECRET_ARN`, `NODE_OPTIONS` (`--enable-source-maps`) | Passed (2026-10-27): `nodejs24.x`, `arm64`, 256, 10, VPC `null`, log group and the three variables as expected |
| Role policies: `ROLE=$(aws lambda get-function-configuration --function-name alameda-dev-api --query Role --output text \| cut -d/ -f2)`, then `aws iam list-attached-role-policies --role-name "$ROLE"` and `aws iam get-role-policy --role-name "$ROLE" --policy-name api-access` | No managed policies attached; one inline policy with exactly: `logs:CreateLogStream` and `logs:PutLogEvents` on the function's log group, `rds-data:ExecuteStatement` on the `dev` cluster ARN, `secretsmanager:GetSecretValue` on the `dev` secret ARN | Passed (2026-10-27): no attached policies; only `api-access`, with the three statements scoped to the log group, `alameda-dev-db`, and its `rds!cluster-…` secret |
| Lambda errors are visible: `aws logs tail /aws/lambda/alameda-dev-api --since 1h` after a request | Request logs appear; a failed request logs `GET /businesses failed` with the error (NFR-5) | Passed (2026-10-27): `ERROR GET /businesses failed DatabaseResumingException: …` visible during the resume |

### Seed data for `dev` (002-T5, spec Q-9, AC-7.3; spec 001 AC-1.2, AC-2.3, FR-5, EC-4, EC-5, EC-6)

`backend/seeds/dev_businesses.sql` holds invented businesses with fixed ids. Each row covers a case:

| Row | Case |
|---|---|
| Lavandería Burbujas | Inactive, and the newest row: it must not appear (AC-1.2) |
| Uñas y Estilo Caro | Invalid number `0300 123`, returned as `null` (AC-2.3, EC-5) |
| Tutorías de Matemáticas | No number, returned as `null` |
| Distribuidora de Productos Naturales… | Very long name and location (EC-4) |
| Arepas La Mona, Café del Río, cafe del rio | Same `created_at`; the two cafés differ only in accents and case (EC-6) |
| Panadería Doña Rosa, Ferretería El Tornillo | Valid numbers with separators (`+57 300 123 4567`, `+57 (300) 555-0101`), returned as digits |
| Physical store `true` and `false` | Both store types present |

| Check | Expected | Result |
|---|---|---|
| `node backend/scripts/migrate.ts dev --seed` | Prints `No pending migrations` and `Seeded dev_businesses.sql` | Passed (2026-10-27) |
| `curl -s "$API_URL/businesses"` | 8 businesses (no Lavandería Burbujas), in this order: Ferretería El Tornillo, Arepas La Mona, cafe del rio, Café del Río, Uñas y Estilo Caro, Tutorías de Matemáticas, Panadería Doña Rosa, Distribuidora…; `whatsappNumber` is `null` for Uñas y Estilo Caro and Tutorías de Matemáticas | Passed (2026-10-27): 8 rows in that order; the two `null` numbers as expected; separators removed (`573001234567`, `573005550101`) |
| Run the seed again, then the same `curl` | Identical response (the upsert is idempotent) | Passed (2026-10-27): byte-identical responses |

### Security checks (002-T6, spec AC-2.3, AC-3.1, AC-3.2, AC-3.3, NFR-2, completion criterion 4)

The "Least privilege", "Database private", and "Encryption" checks of plan section 8, run against `dev`. `ROLE`, `SG`, `VPC`, and `ENDPOINT` come from the commands in the first column; no values are written to the repository.

#### Least privilege (AC-2.3)

| Check | Expected | Result |
|---|---|---|
| `ROLE=$(aws lambda get-function-configuration --function-name alameda-dev-api --query Role --output text \| cut -d/ -f2)`, then `aws iam list-attached-role-policies --role-name "$ROLE"` and `aws iam list-role-policies --role-name "$ROLE"` | No managed policies; one inline policy, `api-access` | Passed (2026-10-28): `[]` attached; `["api-access"]` |
| `aws iam get-role-policy --role-name "$ROLE" --policy-name api-access` | Exactly three statements: `logs:CreateLogStream` and `logs:PutLogEvents` on `/aws/lambda/alameda-dev-api`, `rds-data:ExecuteStatement` on the `alameda-dev-db` cluster ARN, `secretsmanager:GetSecretValue` on the stack's `SecretArn`. No `*` actions or resources | Passed (2026-10-28): the three statements, each scoped to this environment's log group, cluster, and secret (they match the stack outputs); no wildcards except the `:*` log stream suffix of the log group ARN |
| `aws iam get-role --role-name "$ROLE" --query Role.AssumeRolePolicyDocument` | Only `lambda.amazonaws.com` can assume the role | Passed (2026-10-28): `lambda.amazonaws.com`, `sts:AssumeRole` only |
| `aws lambda get-function-configuration --function-name alameda-dev-api --query "keys(Environment.Variables)"` | Only ARNs, the database name, and `NODE_OPTIONS`; no password or secret value (NFR-2) | Passed (2026-10-28): `DATABASE_NAME`, `DATA_API_CLUSTER_ARN`, `DATA_API_SECRET_ARN`, `NODE_OPTIONS` |

#### Database private (AC-3.1, AC-3.2, completion criterion 4)

| Check | Expected | Result |
|---|---|---|
| `aws rds describe-db-instances --db-instance-identifier alameda-dev-db-writer --query "DBInstances[0].{Public:PubliclyAccessible,Vpc:DBSubnetGroup.VpcId}"` | Public `false` | Passed (2026-10-28): `false` |
| `SG=$(aws rds describe-db-clusters --db-cluster-identifier alameda-dev-db --query "DBClusters[0].VpcSecurityGroups[0].VpcSecurityGroupId" --output text)`, then `aws ec2 describe-security-groups --group-ids "$SG" --query "SecurityGroups[0].IpPermissions"` | `[]` | Passed (2026-10-28): `[]` |
| With `VPC` from the first check: `aws ec2 describe-internet-gateways --filters Name=attachment.vpc-id,Values=$VPC`, `aws ec2 describe-nat-gateways --filter Name=vpc-id,Values=$VPC`, `aws ec2 describe-route-tables --filters Name=vpc-id,Values=$VPC` | No internet gateway, no NAT gateway; the only route is `10.0.0.0/16 local` | Passed (2026-10-28): no internet gateway, no NAT gateway, one route `10.0.0.0/16 local` |
| `ENDPOINT=$(aws rds describe-db-clusters --db-cluster-identifier alameda-dev-db --query "DBClusters[0].Endpoint" --output text)`, then `dig +short "$ENDPOINT"` and `nc -z -G 5 -w 5 "$ENDPOINT" 5432` | The name resolves to a private `10.0.x.x` address; the connection from the internet fails | Passed (2026-10-28): resolves to `10.0.1.x`; TCP 5432 not reachable |

#### Encryption (AC-3.3)

| Check | Expected | Result |
|---|---|---|
| `aws rds describe-db-clusters --db-cluster-identifier alameda-dev-db --query "DBClusters[0].{Encrypted:StorageEncrypted,Kms:KmsKeyId}"` | `true`, with a KMS key | Passed (2026-10-28): `true`, KMS key ARN set (the default `aws/rds` key) |
| `aws secretsmanager describe-secret --secret-id "$SECRET_ARN" --query "{Kms:KmsKeyId,Rotation:RotationEnabled}"` | Encrypted with KMS, rotation enabled (managed by Aurora). `KmsKeyId` is `null` when the default `aws/secretsmanager` key is used; Secrets Manager always encrypts | Passed (2026-10-28): `KmsKeyId` `null` (default key), rotation `true` |
| `curl -m 8 http://rds-data.us-east-1.amazonaws.com/Execute` and `curl -m 8 "http://<api host>/businesses"` | Both fail: the Data API and the HTTP API accept HTTPS only | Passed (2026-10-28): Data API over HTTP timed out, over HTTPS answered `403` (unsigned request); HTTP API over HTTP connection refused on port 80, over HTTPS `200` |
