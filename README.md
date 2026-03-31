# my-site

Personal website and portfolio built with FastAPI and React.

A fork-friendly, full-stack personal site with a "database as API" architecture — all data access goes through PostgreSQL stored functions, keeping the application layer thin and the schema the single source of truth. Includes an admin dashboard with built-in application logging (request logs, error tracebacks, response time stats) stored in PostgreSQL — no external logging service required.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.13, FastAPI, SQLAlchemy (async), Mangum (Lambda) |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query |
| Database | PostgreSQL 17 |
| Auth | AWS Cognito (TOTP MFA, no self-signup) |
| Storage | MinIO (local) / S3 (production) |
| Infrastructure | Docker Compose (local), AWS CDK (production) |
| CI/CD | GitHub Actions (CI on PR, CD on merge to main) |
| Testing | pytest (backend), Vitest + Testing Library (frontend) |

## Architecture

Production and staging are fully isolated in separate AWS accounts. Each account deploys the same 4 CDK stacks with environment-specific configuration.

```
  Production Account                          Staging Account
  ─────────────────                           ───────────────
  Route 53: yourdomain.com                    Route 53: stage.yourdomain.com
    │  NS delegation: stage ──────────────►     (delegated zone)
    │
    ├── A → CloudFront (SPA + media)          ├── A → CloudFront (SPA + media)
    │        S3 + OAC                         │        S3 + OAC
    │                                         │
    ├── A → API Gateway v2                    ├── A → API Gateway v2
    │        api.yourdomain.com               │        api.stage.yourdomain.com
    │        │                                │        │
    │        ▼                                │        ▼
    │     Lambda (FastAPI+Mangum)             │     Lambda (FastAPI+Mangum)
    │        │                                │        │
    │   ┌────┼────┐                           │   ┌────┼────┐
    │   ▼    ▼    ▼                           │   ▼    ▼    ▼
    │  RDS Cognito S3                         │  RDS Cognito S3
    │  PG17 Pool  (media)                     │  PG17 Pool  (media)
    │   │                                     │   │
    │  Bastion (SSM)                          │  Bastion (SSM)
    │                                         │
    ├── VPC endpoints (Cognito, S3)           ├── VPC endpoints (Cognito, S3)
    ├── ACM wildcard cert                     ├── ACM wildcard cert
    └── Budget alarm                          └── Budget alarm
```

## Cost Estimate

**Production account:**

| Service | Year 1/month | After free tier |
|---------|-------------|-----------------|
| Route 53 hosted zone | $0.50 | $0.50 |
| RDS db.t4g.micro | $0.00 | $12.50 |
| VPC endpoint (cognito-idp) | $7.20 | $7.20 |
| CloudFront / S3 / Lambda / API GW / Cognito / ACM | ~$0 | ~$0 |
| **Total** | **~$8/month** | **~$20/month** |

**Staging account (optional, separate AWS account):**

| Service | Year 1/month | After free tier |
|---------|-------------|-----------------|
| Route 53 hosted zone | $0.50 | $0.50 |
| RDS db.t4g.micro | $0.00 | $12.50 |
| VPC endpoint (cognito-idp) | $7.20 | $7.20 |
| Bastion host (t4g.nano) | ~$3.00 | ~$3.00 |
| CloudFront / S3 / Lambda / API GW / Cognito / ACM | ~$0 | ~$0 |
| **Total** | **~$11/month** | **~$23/month** |

Built-in cost safeguards: API Gateway throttling (10 req/s), Lambda reserved concurrency (5), and a configurable budget alarm (per account).

## Running Locally

```bash
# 1. Copy environment template
cp .env.example .env
cp config/site.example.json config/site.json

# 2. Start all services
./dev.sh

# 3. Access the app
#    Frontend:  http://localhost:5173
#    Backend:   http://localhost:8000
#    API docs:  http://localhost:8000/docs
```

Local dev uses API key auth (`ADMIN_API_KEY` in `.env`). Cognito auth is only required in production.

### Seed Data

The database starts empty by default. To load sample seed data (fictional companies, reviews, and contact info), pass the `--seed` flag:

```bash
./dev.sh --seed
```

Or set the environment variable:

```bash
SEED_DATA=true ./dev.sh
```

The seed script is idempotent — it only inserts rows when tables are empty, so running it multiple times is safe. Seed data lives in `database/seed/` and is never loaded automatically in production or CI.

**Production note:** The AWS deployment pipeline runs SQL files from `database/init/` (idempotent, every deploy) and `database/migrations/` (once each, tracked). Since seed data lives in `database/seed/`, it is never bundled into the migration Lambda or executed during `cdk deploy`. Production databases start empty and are populated through the admin UI.

---

## Deploying to AWS

This section walks you through deploying your own instance from a fork. The entire infrastructure is defined in CDK (TypeScript) and deploys via GitHub Actions.

### Prerequisites

Before deploying, complete the AWS account setup:

1. **[AWS Account Setup Guide](docs/aws-setup.md)** — Create your AWS account(s), configure IAM Identity Center, register a domain, set up GitHub OIDC authentication, create the deploy IAM role, bootstrap CDK, and configure GitHub secrets/variables. If you want a staging environment (optional), the guide also covers creating a separate staging account with AWS Organizations.

2. **Local tools required:**
   - Node.js 22+ and npm
   - AWS CLI v2 installed and configured (covered in the setup guide)
   - Docker installed (for building Lambda images)

### 1. Fork and Clone

```bash
git clone https://github.com/<your-username>/my-site.git
cd my-site
```

### 2. Set CDK Environment Variables

CDK configuration is read from environment variables — nothing sensitive is hardcoded in the repo.

**Required variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `CDK_DOMAIN_NAME` | Your registered domain | `example.com` |
| `CDK_ACCOUNT_ID` | AWS account ID (also reads `AWS_ACCOUNT_ID`) | `123456789012` |
| `CDK_BUDGET_EMAIL` | Email for budget alarm notifications | `you@example.com` |

**Optional variables (sensible defaults):**

| Variable | Default | Description |
|----------|---------|-------------|
| `CDK_REGION` | `us-east-1` | Also reads `AWS_REGION` |
| `CDK_DB_INSTANCE_CLASS` | `t4g.micro` | RDS instance class |
| `CDK_LAMBDA_MEMORY_MB` | `256` | Lambda memory |
| `CDK_LAMBDA_CONCURRENCY` | `5` | Max simultaneous Lambda executions |
| `CDK_API_THROTTLE_RATE` | `10` | API Gateway requests per second |
| `CDK_API_THROTTLE_BURST` | `50` | API Gateway burst capacity |
| `CDK_BUDGET_LIMIT_USD` | `10` | Monthly budget alarm threshold |

Set them in your shell for local CDK commands:
```bash
export CDK_DOMAIN_NAME="yourdomain.com"
export CDK_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
export CDK_BUDGET_EMAIL="you@example.com"
```

Or add them to a `.env` file in `infrastructure/cdk/` (git-ignored).

Delete the placeholder VPC context so CDK looks up your real VPC:
```bash
rm infrastructure/cdk/cdk.context.json
```

### 3. Deploy Infrastructure

Run the first deploy from your laptop so you can watch for issues and approve IAM changes.

> **DNS note:** Route 53 is the authoritative DNS for your domain after deployment. Your registrar only holds the NS delegation that tells the internet "ask Route 53 for this domain's records." All DNS records (CloudFront, API Gateway, certificate validation) are managed by CDK in Route 53.

**If you registered your domain through Route 53** (Option A above), you can deploy everything at once — Route 53 is already authoritative:

```bash
cd infrastructure/cdk
npx cdk deploy --all
```

**If your domain is at an external registrar** (Option B), deploy in two phases to avoid a stuck deploy:

```bash
cd infrastructure/cdk

# Phase 1: Deploy the DNS stack only
npx cdk deploy MySiteDns
```

After Phase 1 completes, update your nameservers at your registrar (see [Step 4](#4-update-domain-nameservers)) and wait for propagation. Then deploy the remaining stacks:

```bash
# Phase 2: Deploy remaining stacks (after nameservers are updated)
npx cdk deploy --all
```

> **Why two phases?** The `MySiteCert` stack creates an ACM certificate that uses DNS validation — ACM adds a CNAME record to your Route 53 hosted zone, then queries DNS to verify you own the domain. If your registrar's nameservers are still active, those DNS queries never reach Route 53, and `cdk deploy` will hang indefinitely waiting for certificate validation.

This creates 4 CloudFormation stacks:
- **MySiteDns** — Route 53 hosted zone
- **MySiteCert** — ACM wildcard certificate (us-east-1, DNS-validated)
- **MySiteData** — RDS PostgreSQL, Cognito user pool, VPC endpoints, bastion host
- **MySiteApp** — S3 + CloudFront, Lambda, API Gateway, Route 53 records, budget alarm

Staging deploys the same 4 stacks to a separate AWS account (see [Staging Environment](#staging-environment-optional) below).

Takes ~10–15 minutes (RDS is the slow part). Note the outputs — you'll need them for the next steps.

### 4. Update Domain Nameservers

> **Skip this step** if you registered your domain through Route 53 — nameservers are already correct.

After deploying `MySiteDns`, you need to point your domain's NS records at Route 53 so that DNS queries for your domain reach the hosted zone where CDK manages all your records (CloudFront aliases, API Gateway, certificate validation CNAMEs, etc.).

**Find your Route 53 nameservers:**

The `MySiteDns` stack outputs the nameserver values. You can also look them up:
```bash
aws route53 list-hosted-zones-by-name --dns-name yourdomain.com --query 'HostedZones[0].Id' --output text | \
  xargs -I {} aws route53 get-hosted-zone --id {} --query 'DelegationSet.NameServers' --output table
```

You'll get 4 nameservers like:
```
ns-123.awsdns-45.com
ns-678.awsdns-90.net
ns-111.awsdns-22.org
ns-333.awsdns-44.co.uk
```

**Namecheap:**

1. Log in → **Domain List** → click **Manage** next to your domain
2. In the **Nameservers** section, switch from "Namecheap BasicDNS" to **Custom DNS**
3. Paste the 4 Route 53 nameservers (without trailing dots)
4. Click the green checkmark to save

**Generic registrar:**

Look for a "Nameservers" or "DNS" settings panel. Replace the existing nameservers with the 4 Route 53 values. Most registrars have a "Custom nameservers" option.

**Verify propagation:**
```bash
dig yourdomain.com NS +short
```

Expected output should show your Route 53 nameservers (e.g., `ns-123.awsdns-45.com.`). Propagation typically takes minutes but can take up to 48 hours.

**Troubleshooting:** If `cdk deploy` is stuck on `MySiteCert`, it's waiting for ACM certificate DNS validation. Press `Ctrl+C` to cancel safely — no resources are left in a broken state. Update your nameservers, wait for propagation (verify with `dig`), then re-run `npx cdk deploy --all`.

### 5. Push Initial Backend Image

The Lambda function needs a container image in ECR:

```bash
# Get your account ID and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1

# Login to ECR
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build and push (from repo root)
docker build --platform linux/arm64 \
  -f docker/backend/Dockerfile.lambda \
  -t $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/mysite-backend:latest .
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/mysite-backend:latest

# Update Lambda
aws lambda update-function-code \
  --function-name mysite-backend \
  --image-uri $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/mysite-backend:latest
```

### 6. Database Initialization

The database is initialized automatically. The `MySiteData` stack includes a migration Lambda that runs in two phases on every deploy:

1. **Init scripts** (`database/init/00–04`): Idempotent scripts that create schemas, tables, functions, and permissions. Safe to re-run on every deploy.
2. **Migrations** (`database/migrations/*.sql`): Run exactly once, tracked in `internal.schema_migrations`. Each migration executes inside a transaction — if any statement fails, the entire migration rolls back cleanly.

No manual SQL setup is needed. To add a new migration, create a file in `database/migrations/` with a numeric prefix (e.g., `004_add_new_column.sql`). It will execute automatically on the next deploy. Seed data is not loaded in production.

### 7. Connecting to the Database (Bastion Host)

The `MySiteData` stack deploys a bastion host (t4g.nano) that you can reach via **SSM Session Manager** — no SSH keys or open inbound ports required. The bastion instance ID is in the CDK stack outputs.

**Prerequisites:** AWS CLI v2 and the [Session Manager plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html).

**Interactive shell on the bastion:**

```bash
aws ssm start-session --target <BASTION_INSTANCE_ID> --profile admin
```

Once connected, use `psql` (pre-installed) to connect to RDS:

```bash
# Get the master password from Secrets Manager
aws secretsmanager get-secret-value --secret-id /mysite/db-credentials \
  --query SecretString --output text | jq .

# Connect
psql -h <RDS_ENDPOINT> -U mysite -d mysite
```

**Port-forward RDS to your local machine** (run `psql` or any GUI locally):

```bash
aws ssm start-session --target <BASTION_INSTANCE_ID> \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["<RDS_ENDPOINT>"],"portNumber":["5432"],"localPortNumber":["5432"]}' \
  --profile admin
```

Then in another terminal:

```bash
psql -h localhost -U mysite -d mysite
```

### 8. Create Cognito Admin User

**Find your User Pool ID** from CDK outputs, or look it up:

```bash
aws cognito-idp list-user-pools --max-results 10 --query "UserPools[?Name=='mysite-users'].Id" --output text
```

**Create the user:**

```bash
USER_POOL_ID=<from above>

aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username your@email.com \
  --user-attributes Name=email,Value=your@email.com Name=email_verified,Value=true \
  --temporary-password 'TempPass123!@#$' \
  --message-action SUPPRESS
```

**First login flow:**

1. Go to `https://yourdomain.com/admin` and log in with your email and the temporary password above
2. You'll be prompted to set a permanent password — must be 12+ characters with uppercase, lowercase, digits, and symbols
3. You'll then be prompted to set up TOTP MFA — scan the QR code with an authenticator app (Google Authenticator, Authy, 1Password, etc.) and enter the verification code

After completing these steps, future logins require your permanent password + a TOTP code from your authenticator app.

**Key details:**

- MFA is mandatory (TOTP only, no SMS)
- Self-signup is disabled — all users must be created via CLI or AWS Console
- Access tokens expire after 1 hour, refresh tokens after 30 days
- Account recovery is email-only

**GUI alternative:** You can also create users in the AWS Console under **Cognito → User Pools → mysite-users → Users → Create user**.

### 9. Deploy Frontend

```bash
cd frontend
npm ci

VITE_API_URL=https://api.yourdomain.com \
VITE_COGNITO_USER_POOL_ID=<pool-id> \
VITE_COGNITO_APP_CLIENT_ID=<client-id> \
VITE_COGNITO_REGION=us-east-1 \
npm run build

aws s3 sync dist/ s3://yourdomain.com-frontend --delete
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> --paths "/*"
```

### 10. Verify

- `https://yourdomain.com` — resume loads
- `https://api.yourdomain.com/api/health` — returns 200
- `https://yourdomain.com/admin` — Cognito login works with MFA
- `https://yourdomain.com/admin` → Dashboard — shows request logs, error counts, and response times
- Push a change to `main` — CD pipeline deploys automatically

---

## Managing Costs

You can stop certain resources when not in use to reduce your monthly bill.

### Stoppable Resources

**Bastion Host (EC2 t4g.nano)** — ~$3.80/month running, ~$0.10/month stopped (EBS only)

Only needed for database maintenance. Safe to stop when not in use.

```bash
# Get instance ID from CDK outputs
BASTION_ID=$(aws cloudformation describe-stacks --stack-name MySiteData \
  --query 'Stacks[0].Outputs[?OutputKey==`BastionInstanceId`].OutputValue' --output text)

# Stop
aws ec2 stop-instances --instance-ids $BASTION_ID

# Start (when you need database access again)
aws ec2 start-instances --instance-ids $BASTION_ID
```

**RDS PostgreSQL (db.t4g.micro)** — ~$12.50/month running (after free tier), ~$3.50/month stopped

> **Warning:** Your site's API will return errors while RDS is stopped. AWS also auto-restarts stopped RDS instances after 7 days.

```bash
# Get instance identifier
RDS_ID=$(aws rds describe-db-instances \
  --query 'DBInstances[?DBName==`mysite`].DBInstanceIdentifier' --output text)

# Stop
aws rds stop-db-instance --db-instance-identifier $RDS_ID

# Start
aws rds start-db-instance --db-instance-identifier $RDS_ID
```

### Always-On Resources (low or no cost)

| Resource | Monthly Cost | Notes |
|----------|-------------|-------|
| Route 53 hosted zone | $0.50 | Fixed |
| VPC endpoint (cognito-idp) | $7.20 | Fixed; required for Lambda to verify auth tokens |
| CloudFront, S3, Lambda, API GW, Cognito | ~$0 | Pay-per-use, mostly covered by free tier |

### Quick Reference

```bash
# Look up resource IDs
BASTION_ID=$(aws cloudformation describe-stacks --stack-name MySiteData \
  --query 'Stacks[0].Outputs[?OutputKey==`BastionInstanceId`].OutputValue' --output text)
RDS_ID=$(aws rds describe-db-instances \
  --query 'DBInstances[?DBName==`mysite`].DBInstanceIdentifier' --output text)

# Stop everything stoppable
aws ec2 stop-instances --instance-ids $BASTION_ID
aws rds stop-db-instance --db-instance-identifier $RDS_ID

# Start everything back up
aws ec2 start-instances --instance-ids $BASTION_ID
aws rds start-db-instance --db-instance-identifier $RDS_ID
```

---

## Continuous Deployment

Deployment uses a **single combined workflow** (`deploy.yml`) with a 6-job chain:

```
Merge to main → CI → deploy-stage-infra → deploy-stage-frontend → stage-post-deploy-validation → deploy-infra → deploy-frontend → post-deploy-validation
```

1. Push to `main` (or merge a PR)
2. CI runs (lint, type check, tests)
3. On CI success, the **Deploy** workflow runs automatically — staging first, then production
4. When staging is not enabled (`DEPLOY_STAGING` not set), staging jobs are skipped and production runs directly

Each deploy phase includes:
- **Pre-flight validation**: checks OIDC provider and CDK bootstrap status before deploying
- **Failed stack cleanup**: automatically deletes stacks stuck in ROLLBACK_COMPLETE/ROLLBACK_FAILED/DELETE_FAILED
- **Two-phase deploy with DNS gate**: deploys the DNS stack first, verifies nameserver delegation is working, then deploys the remaining stacks (Cert, Data, App). On first deploy, the gate fails with instructions to set up DNS delegation. On subsequent deploys it passes immediately.

> **Path filtering:** CI and deploy are automatically skipped for changes that only touch
> non-application files (`.claude/`, `*.md`, `docs/`, `.github/scripts/`, `LICENSE`,
> `.release-please-manifest.json`, `release-please-config.json`).
> This avoids wasting CI minutes on documentation-only PRs and release-please merges.
> Use `workflow_dispatch` to manually trigger CI if needed.

### Staging Environment (Optional)

Staging deploys to a **separate AWS account** with full environment isolation. It uses the same 4 CDK stacks as production, configured via environment-specific variables.

When `DEPLOY_STAGING=true` is set as a GitHub Actions variable, the staging jobs in the **Deploy** workflow (`deploy.yml`) run automatically after CI succeeds on `main`. Staging validation includes:
- **Regression tests**: public endpoint checks (health, resume, auth enforcement, frontend)
- **Admin regression tests**: full CRUD against all admin endpoints (resume entries, reviews, recommendations, sections, profile image, logs) — requires `REGRESSION_TEST_API_KEY` secret. Tests create data, verify via public API, then clean up.
- **PR-specific validation**: extracts commands from the PR's `## Stage Test Plan` section

Results are commented on the PR, and table items are automatically marked as passed/failed.

Trigger manually via **Actions → Deploy → Run workflow**.

**What staging deploys:** A fully self-contained infrastructure in its own AWS account — Route 53 hosted zone, ACM certificate, RDS, Cognito user pool, VPC endpoints, bastion host, S3 buckets, CloudFront, Lambda, API Gateway, and budget alarm. Staging has no dependencies on the production account.

**Staging domains:**
- Frontend: `stage.<domain>` (e.g., `stage.example.com`)
- API: `api.stage.<domain>` (e.g., `api.stage.example.com`)

**Operational differences from production:**
- RDS: 1-day backup retention (vs 30 days), no deletion protection
- All resources: DESTROY removal policy (easy teardown)
- Cognito: separate user pool (staging admin created independently)

**Setup:**

1. Create or identify a staging AWS account
2. Create GitHub OIDC identity provider in the staging account:
   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
   ```
3. Create IAM deploy role (same trust policy and permissions as production — see [Step 6](#6-create-iam-role-for-github-actions))
4. Bootstrap CDK in the staging account:
   ```bash
   npx cdk bootstrap aws://<STAGING_ACCOUNT_ID>/us-east-1
   ```
5. Add GitHub secrets and variables (see [Step 7](#7-set-github-repository-secrets-and-variables)):
   - Secrets: `AWS_STAGE_DEPLOY_ROLE_ARN`, `AWS_STAGE_ACCOUNT_ID`, `CDK_STAGE_BUDGET_EMAIL`, `REGRESSION_TEST_API_KEY` (64-char random hex for admin regression tests)
   - Variables: `CDK_STAGE_DOMAIN_NAME` (e.g., `stage.example.com`), `DEPLOY_STAGING` = `true`

> **S3 bucket naming:** By default, CDK auto-generates globally unique bucket names (recommended for new deployments). If you already have deployed stacks with explicit bucket names (e.g., `yourdomain.com-frontend`), set the GitHub Actions variable `CDK_AUTO_BUCKET_NAMES` = `false` to preserve them. See [aws-setup.md](docs/aws-setup.md#set-github-repository-secrets-and-variables) for details.
6. Trigger **Deploy** manually — this creates the Route 53 hosted zone for `stage.example.com`
7. Set up DNS delegation so ACM can validate the staging certificate:
   - **If prod is deployed:** create an NS record in the prod Route 53 zone (Name=`stage`, Values=4 staging nameservers)
   - **If prod is NOT deployed yet:** add 4 NS records at your domain registrar (e.g., Namecheap) for Host=`stage` pointing to the staging nameservers — see [aws-setup.md Step 5](docs/aws-setup.md#5-first-staging-deploy-and-dns-delegation) for details
8. Re-trigger **Deploy** — ACM certificate DNS validation will now succeed
9. Create a staging admin user in the new Cognito user pool (see [Step 13](#13-create-cognito-admin-user))

**Without staging:** When `DEPLOY_STAGING` is not set (or not `true`), staging jobs are skipped and production jobs run directly within the same workflow.

### Production Deployment

Production runs automatically after staging succeeds (or immediately if staging is skipped) within the same **Deploy** workflow. The production jobs deploy infrastructure, build and sync the frontend, and run post-deploy validation.

Production validation extracts commands from the PR's `## Prod-Post-deploy validation` section (with `${API_URL}` pointing to the production API). Results are commented on the PR.

To manually trigger the full pipeline: **Actions → Deploy → Run workflow**.

## Project Structure

```
├── backend/               # FastAPI application
│   ├── src/app/           # Application code
│   │   ├── middleware/    # CORS, rate limiting, request logging
│   │   ├── routers/       # API route handlers
│   │   ├── schemas/       # Pydantic request models
│   │   └── services/      # DatabaseAPI, storage, Cognito verifier
│   ├── src/lambda_handler.py  # Mangum wrapper for Lambda
│   └── tests/             # Backend tests
├── frontend/              # React SPA
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages (public + admin)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API client + auth service
│   │   └── types/         # TypeScript interfaces
│   └── tests/             # Frontend tests
├── database/
│   ├── init/              # SQL init scripts (schemas, tables, functions, permissions)
│   ├── migrations/        # Versioned migrations (run once, tracked in schema_migrations)
│   └── seed/              # Optional sample seed data (loaded via ./dev.sh --seed)
├── dev.sh                 # Local dev startup script (supports --seed flag)
├── docs/                  # Extended documentation (AWS setup guide, etc.)
├── docker/                # Dockerfiles (dev, production, Lambda)
├── infrastructure/cdk/    # AWS CDK stacks (TypeScript)
│   ├── lib/               # Stack definitions (DNS, Cert, Data, App)
│   └── config/            # Deployment configuration
├── .github/workflows/     # CI + CD pipelines
└── config/                # Site configuration
```

## Versioning

This project follows [Semantic Versioning](https://semver.org/) with automated releases via [Release Please](https://github.com/googleapis/release-please).

### Conventional Commits

PR titles must follow the [Conventional Commits](https://www.conventionalcommits.org/) format. Since we squash-merge, the PR title becomes the commit message on `main`.

| Prefix | Purpose | Version Bump |
|--------|---------|-------------|
| `feat:` | New feature, page, or endpoint | Minor (0.X.0) |
| `fix:` | Bug fix | Patch (0.0.X) |
| `docs:` | Documentation only | Patch (0.0.X) |
| `chore:` | Maintenance, deps, CI | Patch (0.0.X) |
| `refactor:` | Code restructuring, no behavior change | Patch (0.0.X) |
| `test:` | Adding or updating tests | Patch (0.0.X) |
| `ci:` | CI/CD pipeline changes | Patch (0.0.X) |
| `feat!:` / `fix!:` | Breaking change (any prefix with `!`) | Major (X.0.0) |

### How Release Please Works

1. Every merge to `main` is analyzed by Release Please
2. Release Please opens/updates a **Release PR** that bumps versions and updates [CHANGELOG.md](CHANGELOG.md)
3. Merging the Release PR creates a GitHub Release with a git tag
4. Deploys happen on every merge — releases are informational, not deploy gates

Version is maintained in a single source (`backend/src/app/_version.py`) and synced across `package.json`, `pyproject.toml`, and CDK config by Release Please.

## License

[MIT](LICENSE)
