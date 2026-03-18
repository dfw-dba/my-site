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

```
                    ┌─────────────────────┐
                    │   Route 53 DNS      │
                    │   yourdomain.com    │
                    └──────┬──────┬───────┘
                           │      │
              A alias      │      │  A alias
         ┌─────────────────┘      └──────────────────┐
         ▼                                           ▼
┌─────────────────┐                        ┌──────────────────┐
│   CloudFront    │                        │  API Gateway v2  │
│ (SPA + media)   │                        │ api.yourdomain   │
│   S3 + OAC      │                        │  throttled       │
└─────────────────┘                        └────────┬─────────┘
                                                    │
                                                    ▼
                                           ┌──────────────────┐
                                           │  Lambda (ARM64)  │
                                           │  FastAPI+Mangum  │
                                           └────────┬─────────┘
                                                    │
                                    ┌───────────────┼───────────────┐
                                    ▼               ▼               ▼
                             ┌────────────┐  ┌───────────┐  ┌─────────────┐
                             │  RDS PG17  │  │ Cognito   │  │ S3 (media)  │
                             │ t4g.micro  │  │ User Pool │  │             │
                             └─────┬──────┘  └───────────┘  └─────────────┘
                                   │
                             ┌─────┴──────┐
                             │  Bastion   │
                             │ t4g.nano   │
                             │ (SSM only) │
                             └────────────┘
```

## Cost Estimate

| Service | Year 1/month | After free tier |
|---------|-------------|-----------------|
| Route 53 hosted zone | $0.50 | $0.50 |
| RDS db.t4g.micro | $0.00 | $12.50 |
| VPC endpoint (cognito-idp) | $7.20 | $7.20 |
| CloudFront / S3 / Lambda / API GW / Cognito / ACM | ~$0 | ~$0 |
| **Total** | **~$8/month** | **~$20/month** |
| Staging RDS (optional) | $0.00 | +$12.50 |

Built-in cost safeguards: API Gateway throttling (10 req/s), Lambda reserved concurrency (5), and a configurable budget alarm.

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

**Production note:** The AWS deployment pipeline only runs SQL files from `database/init/`. Since seed data lives in `database/seed/`, it is never bundled into the migration Lambda or executed during `cdk deploy`. Production databases start empty and are populated through the admin UI.

---

## Deploying to AWS

This section walks you through deploying your own instance from a fork. The entire infrastructure is defined in CDK (TypeScript) and deploys via GitHub Actions.

### Prerequisites

- An AWS account
- A registered domain name (see [Register a Domain Name](#register-a-domain-name) below)
- Node.js 22+ and npm
- AWS CLI v2 installed
- Docker installed (for building Lambda images)

### Register a Domain Name

You need a domain before deploying. There are two paths:

**Option A: Register via Route 53 (recommended)**

The simplest option — Route 53 automatically becomes the authoritative DNS for your domain, so you can skip the nameserver update step entirely.

1. AWS Console → **Route 53** → **Registered domains** → **Register domains**
2. Search for your domain, add to cart, and complete registration (~$10–14/year for `.com`)

Or via CLI:
```bash
aws route53domains register-domain \
  --domain-name yourdomain.com \
  --duration-in-years 1 \
  --admin-contact FirstName=Your,LastName=Name,ContactType=PERSON,Email=you@example.com,PhoneNumber=+1.5555555555,CountryCode=US,AddressLine1="123 Main St",City=Anytown,State=CA,ZipCode=90210 \
  --registrant-contact FirstName=Your,LastName=Name,ContactType=PERSON,Email=you@example.com,PhoneNumber=+1.5555555555,CountryCode=US,AddressLine1="123 Main St",City=Anytown,State=CA,ZipCode=90210 \
  --tech-contact FirstName=Your,LastName=Name,ContactType=PERSON,Email=you@example.com,PhoneNumber=+1.5555555555,CountryCode=US,AddressLine1="123 Main St",City=Anytown,State=CA,ZipCode=90210 \
  --auto-renew
```

**Option B: Use an existing domain from another registrar**

If you already own a domain through Namecheap, GoDaddy, Cloudflare, etc., you can use it. You'll need to update your nameservers after deploying the DNS stack (covered in [Step 9](#9-update-domain-nameservers)).

### 1. Fork and Clone

```bash
git clone https://github.com/<your-username>/my-site.git
cd my-site
```

### 2. Set Up IAM Identity Center (recommended)

Don't use the root account for deployments. Set up IAM Identity Center for a proper admin user:

1. Sign in as root → AWS Console → **IAM Identity Center** → **Enable**
   - Choose your primary region (should match where you'll deploy, e.g., `us-east-1`)
   - Use the default **Identity Center directory**
2. **Users** → **Add user** → fill in your details
3. **Permission sets** → **Create** → **Predefined: AdministratorAccess**
4. **AWS accounts** → select your account → **Assign users** → your user + AdministratorAccess permission set
5. Configure the AWS CLI:
   ```bash
   aws configure sso
   # SSO start URL: (shown in IAM Identity Center dashboard)
   # SSO region: us-east-1
   # CLI profile name: admin
   ```
6. Log in:
   ```bash
   aws sso login --profile admin
   export AWS_PROFILE=admin
   ```
7. Enable MFA on root account (IAM → Account settings), then stop using root

### 3. Set CDK Environment Variables

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

### 4. Bootstrap CDK

One-time setup that creates the S3 bucket and IAM roles CDK needs:

```bash
cd infrastructure/cdk
npm install
npx cdk bootstrap aws://$CDK_ACCOUNT_ID/us-east-1
```

### 5. Create GitHub OIDC Provider

This lets GitHub Actions authenticate to AWS without storing credentials.

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 6. Create IAM Role for GitHub Actions

Create `github-actions-trust-policy.json` (replace `<ACCOUNT_ID>` and `<OWNER/REPO>`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:<OWNER/REPO>:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

Create the role and attach permissions:

```bash
aws iam create-role \
  --role-name github-actions-deploy \
  --assume-role-policy-document file://github-actions-trust-policy.json

aws iam attach-role-policy \
  --role-name github-actions-deploy \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

Note the role ARN:
```bash
aws iam get-role --role-name github-actions-deploy --query Role.Arn --output text
```

> **Note**: AdministratorAccess is broad. For a personal site this is fine. For tighter security, create a custom policy scoped to the services used (CloudFormation, S3, Lambda, ECR, API Gateway, Route 53, RDS, Cognito, IAM, CloudFront, Budgets, SSM, Secrets Manager, EC2).

### 7. Set GitHub Repository Secrets and Variables

Go to **GitHub → your repo → Settings → Secrets and variables → Actions**:

**Secrets:**

| Name | Value |
|------|-------|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::<ACCOUNT_ID>:role/github-actions-deploy` |

**Variables:**

| Name | Value |
|------|-------|
| `AWS_ACCOUNT_ID` | Your AWS account ID |
| `AWS_REGION` | `us-east-1` |
| `CDK_DOMAIN_NAME` | Your domain (e.g., `example.com`) |
| `CDK_BUDGET_EMAIL` | Your email for budget alerts |
| `DEPLOY_STAGING` | Set to `true` to enable staging environment (optional) |

### 8. Deploy Infrastructure

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

After Phase 1 completes, update your nameservers at your registrar (see [Step 9](#9-update-domain-nameservers)) and wait for propagation. Then deploy the remaining stacks:

```bash
# Phase 2: Deploy remaining stacks (after nameservers are updated)
npx cdk deploy --all
```

> **Why two phases?** The `MySiteCert` stack creates an ACM certificate that uses DNS validation — ACM adds a CNAME record to your Route 53 hosted zone, then queries DNS to verify you own the domain. If your registrar's nameservers are still active, those DNS queries never reach Route 53, and `cdk deploy` will hang indefinitely waiting for certificate validation.

This creates 4 CloudFormation stacks (6 if staging is enabled):
- **MySiteDns** — Route 53 hosted zone
- **MySiteCert** — ACM wildcard certificate (us-east-1, DNS-validated)
- **MySiteData** — RDS PostgreSQL, Cognito user pool, VPC endpoint, bastion host
- **MySiteApp** — S3 + CloudFront, Lambda, API Gateway, Route 53 records, budget alarm
- **MySiteStageData** — *(staging only)* RDS PostgreSQL, migration Lambda
- **MySiteStageApp** — *(staging only)* S3 + CloudFront, Lambda, API Gateway, Route 53 records

Takes ~10–15 minutes (RDS is the slow part). Note the outputs — you'll need them for the next steps.

### 9. Update Domain Nameservers

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

### 10. Push Initial Backend Image

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

### 11. Database Initialization

The database is initialized automatically. The `MySiteData` stack includes a migration Lambda that runs all SQL init scripts (`database/init/00–04`) on every deploy. No manual SQL setup is needed. Seed data is not loaded in production.

### 12. Connecting to the Database (Bastion Host)

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

### 13. Create Cognito Admin User

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

### 14. Deploy Frontend

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

### 15. Verify

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

After initial setup, all deployments are automatic:

1. Push to `main` (or merge a PR)
2. CI runs (lint, type check, tests)
3. On CI success, the Deploy workflow runs:
   - **deploy-infra**: `cdk deploy` (updates infrastructure if changed)
   - **deploy-frontend**: builds with Vite → syncs to S3 → invalidates CloudFront
   - **post-deploy-validation**: runs validation commands from PR body

> **Path filtering:** CI and deploy are automatically skipped for changes that only touch
> non-application files (`.claude/`, `*.md`, `docs/`, `.github/scripts/`, `LICENSE`).
> This avoids wasting CI minutes on documentation-only PRs. Use `workflow_dispatch`
> to manually trigger CI if needed.

### Staging Environment (Optional)

When `DEPLOY_STAGING=true` is set as a GitHub Actions variable, merges to `main` deploy to **staging only**. Production requires a separate manual trigger:

```
Merge to main → CI → staging auto-deploys → stage-post-deploy-validation
                                                        ↓
                                        Manual workflow_dispatch → production deploys → post-deploy-validation
```

The `stage-post-deploy-validation` job runs the same PR post-deploy commands against the staging API. If staging validation fails, the production deploy is blocked.

**What staging deploys:** A full infrastructure replica with its own RDS, S3 buckets, CloudFront distribution, Lambda function, and API Gateway. Staging shares the production Cognito user pool (same login), DNS hosted zone, and wildcard certificate.

**Staging domains:**
- Frontend: `stage.<domain>` (e.g., `stage.example.com`)
- API: `stage-api.<domain>` (e.g., `stage-api.example.com`)

**Deploying to production after staging review:**
1. Review the staging site at `stage.<domain>`
2. Go to **Actions → Deploy → Run workflow** → select `production` → click **Run workflow**

You can also deploy staging on-demand via **Actions → Deploy → Run workflow** → select `staging`.

**Setup:**
1. Go to **Settings → Variables → Actions → New variable** → `DEPLOY_STAGING` = `true`

**Without staging:** When `DEPLOY_STAGING` is not set (or not `true`), production deploys automatically after CI — the same behavior as before.

**Database access:** The staging RDS instance is accessible from the production bastion host via a cross-stack security group rule. Use the same SSM Session Manager bastion workflow, but connect to the staging DB endpoint. Staging DB credentials are stored in Secrets Manager under `/mysite/stage/db-credentials`.

**Cost:** Staging adds ~$12.50/month post-free-tier (RDS t4g.micro). All other staging resources (S3, CloudFront, Lambda, API Gateway) are pay-per-use and negligible.

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
│   └── seed/              # Optional sample seed data (loaded via ./dev.sh --seed)
├── dev.sh                 # Local dev startup script (supports --seed flag)
├── docker/                # Dockerfiles (dev, production, Lambda)
├── infrastructure/cdk/    # AWS CDK stacks (TypeScript)
│   ├── lib/               # Stack definitions (DNS, Cert, Data, App)
│   └── config/            # Deployment configuration
├── .github/workflows/     # CI + CD pipelines
└── config/                # Site configuration
```

## Versioning

This project follows [Semantic Versioning](https://semver.org/).

| Change Type | Version Bump | Example |
|------------|-------------|---------|
| Breaking API or schema change | Major (X.0.0) | Redesign database schema |
| New feature, page, or endpoint | Minor (0.X.0) | Add blog section |
| Bug fix, style tweak, dependency update | Patch (0.0.X) | Fix mobile layout |

## License

[MIT](LICENSE)
