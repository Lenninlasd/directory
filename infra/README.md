# Infrastructure and Deployment

Deployment guide for spec 002. Sections are added as the tasks in `specs/002-infrastructure/tasks.md` are completed.

## Architecture

The frontend is on Cloudflare Pages (002-T7); everything else is in one AWS stack per environment.

```
                          +-----------------------+
                          |  Browser (Spanish UI) |
                          +-----------+-----------+
                                      | HTTPS
              +-----------------------+----------------------+
              | static files                                 | GET /businesses (CORS)
              v                                              v
   +----------------------+                      +--------------------------+
   | Cloudflare Pages     |                      | API Gateway HTTP API     |
   | alameda-<env>        |                      | GET /businesses          |
   | .pages.dev           |                      | CORS: FrontendOrigin     |
   | React + Tailwind     |                      +------------+-------------+
   +----------------------+                                   v
                                                 +--------------------------+
                                                 | Lambda `api` (no VPC)    |
                                                 | nodejs24.x, arm64        |
                                                 | 256 MB, timeout 10 s     |
                                                 +------------+-------------+
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
                         | wrangler pages deploy (Pages)    |
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

These tools run on the developer machine. They are not in `package.json` or the lockfile (spec 002 section 9). Record the versions you use here.

| Tool | Used for | Install | Version used |
|---|---|---|---|
| Node.js 24 and pnpm | Build and tests | See the root `package.json` (`packageManager`) | Node 24.22.1, pnpm 12.15.0 |
| AWS CLI v2 | Credentials, stack outputs, Data API checks | [AWS CLI install guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), macOS package installer | 2.38.5 |
| AWS SAM CLI | Validate, build, and deploy the template | [SAM CLI install guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html), macOS package installer (needs macOS 13 or newer) | 1.170.0 |
| Wrangler (Cloudflare CLI) | Create the Pages project and deploy the frontend | Nothing to install: always run as `pnpm dlx wrangler@4.151.1` (pinned, plan P-14) | 4.151.1 |

### AWS credentials

1. Sign in with `aws login` (browser sign-in with console credentials, temporary credentials, no access keys on disk). Alternatively, use IAM Identity Center with `aws configure sso`. Never commit keys.
2. Check it with `aws sts get-caller-identity`; the account ID it prints must not be written into any file in this repository.
3. Deploys go to `us-east-1`. The profile is chosen with `AWS_PROFILE`, or the default profile is used.

Permissions needed so far (extended by later tasks as resources are added):
- 002-T1: create, update, and delete CloudFormation stacks named `alameda-*`, and use the S3 bucket that SAM creates for deployment artifacts.
- 002-T2: create, update, and delete the VPC, subnets, and security group (`ec2:*Vpc*`, `ec2:*Subnet*`, `ec2:*SecurityGroup*`, `ec2:Describe*`, `ec2:CreateTags`), the DB subnet group, cluster, and instance (`rds:*` on `alameda-*` resources); the Aurora-managed master secret (`secretsmanager:CreateSecret`, `secretsmanager:TagResource`, `secretsmanager:RotateSecret`, `kms:DescribeKey` on the `aws/secretsmanager` key); and, for the Data API check, `rds-data:ExecuteStatement` on the cluster and `secretsmanager:GetSecretValue` on its secret.
- 002-T3: `cloudformation:DescribeStacks` on `alameda-*` stacks; `rds-data:ExecuteStatement`, `rds-data:BeginTransaction`, `rds-data:CommitTransaction`, and `rds-data:RollbackTransaction` on the cluster; `secretsmanager:GetSecretValue` on its secret.
- 002-T4: create, update, and delete the `alameda-*` Lambda function (`lambda:*Function*`, `lambda:*Permission`, `lambda:TagResource`), its role (`iam:CreateRole`, `iam:DeleteRole`, `iam:GetRole`, `iam:PutRolePolicy`, `iam:DeleteRolePolicy`, `iam:GetRolePolicy`, `iam:TagRole`, `iam:PassRole` on `alameda-*` roles), the HTTP API (`apigateway:*` on `/apis*`), and the log group (`logs:CreateLogGroup`, `logs:DeleteLogGroup`, `logs:PutRetentionPolicy`, `logs:TagResource`, `logs:DescribeLogGroups`); for the checks, `lambda:GetFunctionConfiguration`, `iam:ListAttachedRolePolicies`, and `logs:FilterLogEvents`.
- 002-T7: no new AWS permissions (the frontend is on Cloudflare Pages).

### Cloudflare login

1. Create a free Cloudflare account if you do not have one.
2. Run `pnpm dlx wrangler@4.151.1 login`. It opens the browser, you sign in and allow access, and Wrangler keeps the login on your machine (spec 002 section 3). No Cloudflare key goes into any file in this repository.
3. Check it with `pnpm dlx wrangler@4.151.1 whoami`.

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

### Cloudflare Pages project per environment (002-T7, spec AC-1.3a)

SAM cannot create Cloudflare resources, so each environment's Pages project is created once by hand, after the Cloudflare login:

```
pnpm dlx wrangler@4.151.1 pages project create alameda-dev --production-branch main
```

1. Note the URL it prints (`https://alameda-dev.pages.dev`, or with a suffix if the name was taken).
2. Put that URL in `FrontendOrigin` in the `dev` section of `infra/samconfig.toml` (`parameter_overrides`), then run `sam deploy --config-env dev` so the API allows it (CORS).
3. For `prod`, do the same with `alameda-prod` when the directory launches (002-T10).

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
| `aws rds describe-db-clusters --db-cluster-identifier alameda-dev-db --query "DBClusters[0].{Engine:Engine,Version:EngineVersion,Encrypted:StorageEncrypted,DataApi:HttpEndpointEnabled,Scaling:ServerlessV2ScalingConfiguration,Backups:BackupRetentionPeriod,DeletionProtection:DeletionProtection,ManagedSecret:MasterUserSecret.SecretStatus}"` | `aurora-postgresql`, `17.11`, encrypted `true`, Data API `true`, scaling 0 to 1 ACU with auto-pause after 3600 s, backups 1 day, deletion protection `false`, managed secret `active` | Passed (2026-10-26) |
| `aws rds describe-db-instances --db-instance-identifier alameda-dev-db-writer --query "DBInstances[0].{Class:DBInstanceClass,Public:PubliclyAccessible}"` | `db.serverless`, public `false` | Passed (2026-10-26) |
| `aws rds-data execute-statement --resource-arn "$CLUSTER_ARN" --secret-arn "$SECRET_ARN" --database alameda --sql "select 1"` | `records` is `[[{"longValue": 1}]]`. If the cluster is paused, the first call fails with `DatabaseResumingException`; retry after about 30 s (plan V-6). | Passed (2026-10-26) |
| `aws cloudformation get-template --stack-name alameda-dev --template-stage Processed` | Cluster and instance have `DeletionPolicy: Delete` in `dev` | Passed (2026-10-26) |
| `prod` values: scaling 0.5 to 2 ACU without auto-pause, backups 7 days, deletion protection `true`, `DeletionPolicy: Retain` | Checked in 002-T10, when `prod` is created (M5) | Pending |

Network isolation (no inbound rules, no internet gateway) is checked under Security checks (002-T6).

### Migration script (002-T3, spec AC-5.1, AC-5.2, AC-5.2a, EC-4)

| Check | Expected | Result |
|---|---|---|
| `node backend/scripts/migrate.ts` with Node.js 24 and no arguments | Prints the usage and exits with code 1 (Node runs the TypeScript file directly, plan P-10) | Passed (2026-10-26) |
| `node backend/scripts/migrate.ts prod --seed` | Refused with exit code 1 before reading the stack | Passed (2026-10-26) |
| `node backend/scripts/migrate.ts dev` | Prints `Applied 001_create_businesses.sql` | Passed (2026-10-26) after the cluster resumed; the first attempt hit the paused cluster and failed as documented |
| Same command again | Prints `No pending migrations` | Passed (2026-10-26) |
| `aws rds-data execute-statement --resource-arn "$CLUSTER_ARN" --secret-arn "$SECRET_ARN" --database alameda --sql "select name from schema_migrations"` | Lists `001_create_businesses.sql` | Passed (2026-10-26); `businesses` exists with 0 rows |
| Failure cases (unknown environment, failing migration exits non-zero, stack unreadable) | Covered by `backend/test/scripts/migrate.test.ts` | Passed (2026-10-26): 12 tests, full suite 67 passed |

### API Lambda, HTTP API, CORS, and logs (002-T4, spec AC-2.1 to AC-2.5, NFR-5)

Set this variable first (stack output, no value is written to the repository):

```
API_URL=$(aws cloudformation describe-stacks --stack-name alameda-dev --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)
```

| Check | Expected (`dev`) | Result |
|---|---|---|
| `curl -i "$API_URL/businesses"` | `200`, `content-type: application/json`, body `{"businesses":[]}` (no seed yet). If the cluster is paused, the first request returns `500 {"error":"internal_error"}`; retry after about 30 s (plan P-12). | Passed (2026-10-27): first requests returned `500 {"error":"internal_error"}` with `DatabaseResumingException` in the logs (cluster paused, as documented); after the resume `200`, `application/json`, `{"businesses":[]}` |
| `curl -i -H "Origin: https://example.com" "$API_URL/businesses"` | No `access-control-allow-origin` header (no browser origin is allowed until 002-T7 adds the CloudFront origin) | Passed (2026-10-27) |
| `aws logs describe-log-groups --log-group-name-prefix /aws/lambda/alameda-dev-api --query "logGroups[].{Name:logGroupName,Retention:retentionInDays}"` | One group `/aws/lambda/alameda-dev-api`, retention `30` | Passed (2026-10-27) |
| `aws lambda get-function-configuration --function-name alameda-dev-api --query "{Runtime:Runtime,Arch:Architectures,Memory:MemorySize,Timeout:Timeout,Vpc:VpcConfig.SubnetIds,Log:LoggingConfig.LogGroup,Env:keys(Environment.Variables)}"` | `nodejs24.x`, `arm64`, 256 MB, 10 s, no VPC subnets, log group `/aws/lambda/alameda-dev-api`, variables `DATABASE_NAME`, `DATA_API_CLUSTER_ARN`, `DATA_API_SECRET_ARN`, `NODE_OPTIONS` (`--enable-source-maps`) | Passed (2026-10-27) |
| Lambda errors are visible: `aws logs tail /aws/lambda/alameda-dev-api --since 1h` after a request | Request logs appear; a failed request logs `GET /businesses failed` with the error (NFR-5) | Passed (2026-10-27): `ERROR GET /businesses failed DatabaseResumingException: …` visible during the resume |

The role permissions are checked under Security checks (002-T6).

### Seed data for `dev` (002-T5, spec AC-7.3; spec 001 AC-1.2, AC-2.3, FR-5, EC-4, EC-5, EC-6)

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
| `curl -s "$API_URL/businesses"` | 8 businesses (no Lavandería Burbujas), in this order: Ferretería El Tornillo, Arepas La Mona, cafe del rio, Café del Río, Uñas y Estilo Caro, Tutorías de Matemáticas, Panadería Doña Rosa, Distribuidora…; `whatsappNumber` is `null` for Uñas y Estilo Caro and Tutorías de Matemáticas | Passed (2026-10-27); separators removed (`573001234567`, `573005550101`) |
| Run the seed again, then the same `curl` | Identical response (the upsert is idempotent) | Passed (2026-10-27): byte-identical responses |

### Security checks (002-T6, spec AC-2.3, AC-3.1, AC-3.2, AC-3.3, NFR-2, completion criterion 4)

The "Least privilege", "Database private", and "Encryption" checks of plan section 8, run against `dev`. `ROLE`, `SG`, `VPC`, and `ENDPOINT` come from the commands in the first column; no values are written to the repository.

#### Least privilege (AC-2.3)

| Check | Expected | Result |
|---|---|---|
| `ROLE=$(aws lambda get-function-configuration --function-name alameda-dev-api --query Role --output text \| cut -d/ -f2)`, then `aws iam list-attached-role-policies --role-name "$ROLE"` and `aws iam list-role-policies --role-name "$ROLE"` | No managed policies; one inline policy, `api-access` | Passed (2026-10-28) |
| `aws iam get-role-policy --role-name "$ROLE" --policy-name api-access` | Exactly three statements: `logs:CreateLogStream` and `logs:PutLogEvents` on `/aws/lambda/alameda-dev-api`, `rds-data:ExecuteStatement` on the `alameda-dev-db` cluster ARN, `secretsmanager:GetSecretValue` on the stack's `SecretArn`. No `*` actions or resources | Passed (2026-10-28); the only wildcard is the `:*` log stream suffix of the log group ARN |
| `aws iam get-role --role-name "$ROLE" --query Role.AssumeRolePolicyDocument` | Only `lambda.amazonaws.com` can assume the role | Passed (2026-10-28) |
| `aws lambda get-function-configuration --function-name alameda-dev-api --query "keys(Environment.Variables)"` | Only ARNs, the database name, and `NODE_OPTIONS`; no password or secret value (NFR-2) | Passed (2026-10-28) |

#### Database private (AC-3.1, AC-3.2, completion criterion 4)

| Check | Expected | Result |
|---|---|---|
| `aws rds describe-db-instances --db-instance-identifier alameda-dev-db-writer --query "DBInstances[0].{Public:PubliclyAccessible,Vpc:DBSubnetGroup.VpcId}"` | Public `false` | Passed (2026-10-28) |
| `SG=$(aws rds describe-db-clusters --db-cluster-identifier alameda-dev-db --query "DBClusters[0].VpcSecurityGroups[0].VpcSecurityGroupId" --output text)`, then `aws ec2 describe-security-groups --group-ids "$SG" --query "SecurityGroups[0].IpPermissions"` | `[]` | Passed (2026-10-28) |
| With `VPC` from the first check: `aws ec2 describe-internet-gateways --filters Name=attachment.vpc-id,Values=$VPC`, `aws ec2 describe-nat-gateways --filter Name=vpc-id,Values=$VPC`, `aws ec2 describe-route-tables --filters Name=vpc-id,Values=$VPC` | No internet gateway, no NAT gateway; the only route is `10.0.0.0/16 local` | Passed (2026-10-28) |
| `ENDPOINT=$(aws rds describe-db-clusters --db-cluster-identifier alameda-dev-db --query "DBClusters[0].Endpoint" --output text)`, then `dig +short "$ENDPOINT"` and `nc -z -G 5 -w 5 "$ENDPOINT" 5432` | The name resolves to a private `10.0.x.x` address; the connection from the internet fails | Passed (2026-10-28) |

#### Encryption (AC-3.3)

| Check | Expected | Result |
|---|---|---|
| `aws rds describe-db-clusters --db-cluster-identifier alameda-dev-db --query "DBClusters[0].{Encrypted:StorageEncrypted,Kms:KmsKeyId}"` | `true`, with a KMS key | Passed (2026-10-28); default `aws/rds` key |
| `aws secretsmanager describe-secret --secret-id "$SECRET_ARN" --query "{Kms:KmsKeyId,Rotation:RotationEnabled}"` | Encrypted with KMS, rotation enabled (managed by Aurora). `KmsKeyId` is `null` when the default `aws/secretsmanager` key is used; Secrets Manager always encrypts | Passed (2026-10-28) |
| `curl -m 8 http://rds-data.us-east-1.amazonaws.com/Execute` and `curl -m 8 "http://<api host>/businesses"` | Both fail: the Data API and the HTTP API accept HTTPS only | Passed (2026-10-28): Data API over HTTP timed out, over HTTPS answered `403` (unsigned request); HTTP API over HTTP connection refused on port 80, over HTTPS `200` |

### Cloudflare Pages and CORS origin (002-T7, spec AC-1.3a, AC-2.4, AC-4.1, AC-4.2; plan P-7, P-14)

The frontend is a static site on Cloudflare Pages, one project per environment (`alameda-dev`, `alameda-prod`). Nothing on AWS stores or serves it. The template parameter `FrontendOrigin` holds the project's URL (set in `samconfig.toml`), and the API CORS configuration allows only that origin. Cache headers (P-7): `frontend/public/_headers` gives files under `assets/` (hashed names from Vite) a one-year `immutable` cache; `index.html` keeps the Pages default `max-age=0, must-revalidate`, so a new deploy is visible on reload.

Set these variables first (stack outputs, no values are written to the repository):

```
output() { aws cloudformation describe-stacks --stack-name alameda-dev --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }
FRONTEND_URL=$(output FrontendUrl); API_URL=$(output ApiUrl)
```

Until 002-T8 adds the deploy script, upload the frontend for the checks by hand from the repository root:

```
VITE_API_BASE_URL="$API_URL" pnpm --filter frontend build
pnpm dlx wrangler@4.151.1 pages deploy frontend/dist --project-name alameda-dev --branch main
```

`pages deploy` also prints a per-deployment URL such as `https://<hash>.alameda-dev.pages.dev`. Use `$FRONTEND_URL` instead: the API allows only that origin, so the per-deployment URL shows a CORS error by design.

| Check | Expected (`dev`) | Result |
|---|---|---|
| `curl -sI "${FRONTEND_URL/https/http}/"` | A `3xx` redirect with `location: https://…` (AC-4.2, plan R-8) | Passed (2026-11-02): `301` to `https://alameda-dev.pages.dev/` |
| `curl -s "$FRONTEND_URL/" \| grep -o '<title>.*</title>'` | `<title>Directorio de Alameda del Río</title>` (AC-4.1) | Passed (2026-11-02) |
| `curl -sI "$FRONTEND_URL/" \| grep -i cache-control` | `max-age=0, must-revalidate` (P-7) | Passed (2026-11-02) |
| `curl -sI "$FRONTEND_URL/assets/<file from frontend/dist/assets>" \| grep -i cache-control` | `max-age=31536000, immutable` (P-7) | Passed (2026-11-02) |
| `curl -si -H "Origin: $FRONTEND_URL" "$API_URL/businesses" \| grep -i access-control-allow-origin` | The header equals `$FRONTEND_URL` (AC-2.4) | Passed (2026-11-02) |
| `curl -si -H "Origin: https://example.com" "$API_URL/businesses" \| grep -i access-control` | No `access-control-*` header (EC-2) | Passed (2026-11-02) |
| Open `$FRONTEND_URL` in a browser | The list loads from the API with no CORS error in the console | Passed (2026-11-02) |
