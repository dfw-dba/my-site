# AWS Account Setup

Prerequisites for deploying this project to AWS. Complete these steps **before** following the deployment instructions in [README.md](../README.md).

---

## Table of Contents

1. [Overview](#overview)
2. [Create an AWS Account (Production)](#create-an-aws-account-production)
3. [Set Up IAM Identity Center](#set-up-iam-identity-center)
4. [Register a Domain Name](#register-a-domain-name)
5. [Create GitHub OIDC Provider](#create-github-oidc-provider)
6. [Create IAM Deploy Role](#create-iam-deploy-role)
7. [Bootstrap CDK](#bootstrap-cdk)
8. [Set GitHub Repository Secrets and Variables](#set-github-repository-secrets-and-variables)
9. [Staging Account Setup (Optional)](#staging-account-setup-optional)

---

## Overview

This project deploys to one or two AWS accounts:

| Account | Purpose | Required? |
|---------|---------|-----------|
| **Production** | Hosts the live site at `yourdomain.com` | Yes |
| **Staging** | Hosts a preview at `stage.yourdomain.com` (separate AWS account) | Optional |

Each account needs: an OIDC identity provider (for GitHub Actions), an IAM deploy role, and CDK bootstrap. The staging account is a fully independent copy — no resources are shared between accounts.

If you only want production, complete steps 1–8. For staging, also complete step 9.

---

## Create an AWS Account (Production)

If you don't already have an AWS account:

1. Go to [https://aws.amazon.com](https://aws.amazon.com) and click **Create an AWS Account**
2. Enter your email, choose an account name (e.g., `my-site-prod`), and set a root password
3. Choose **Personal** account type (for a personal site)
4. Enter payment information (required even for free tier)
5. Verify your phone number
6. Select the **Basic (Free)** support plan
7. Sign in as root to the AWS Console

> **Important:** You'll use this root account only for initial setup. After setting up IAM Identity Center (next step), you'll stop using root for day-to-day work.

---

## Set Up IAM Identity Center

Don't use the root account for deployments. IAM Identity Center gives you a proper admin user with SSO login.

1. Sign in as root → AWS Console → **IAM Identity Center** → **Enable**
   - Choose your primary region (e.g., `us-east-1` — this should match your deployment region)
   - Use the default **Identity Center directory**
2. **Users** → **Add user** → fill in your details (name, email)
3. **Permission sets** → **Create** → choose **Predefined: AdministratorAccess**
4. **AWS accounts** → select your account → **Assign users** → your user + AdministratorAccess permission set
5. Configure the AWS CLI:
   ```bash
   aws configure sso
   # SSO start URL: (shown in IAM Identity Center dashboard, e.g., https://d-xxxxxxxxxx.awsapps.com/start)
   # SSO region: us-east-1
   # CLI profile name: prod
   ```
6. Log in:
   ```bash
   aws sso login --profile prod
   export AWS_PROFILE=prod
   ```
7. Verify you're in the right account:
   ```bash
   aws sts get-caller-identity
   ```
8. Enable MFA on the root account: **IAM → Account settings → MFA**. Then stop using root.

---

## Register a Domain Name

You need a domain before deploying. There are two paths:

### Option A: Register via Route 53 (recommended)

The simplest option — Route 53 automatically becomes the authoritative DNS, so you skip the nameserver update step entirely.

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

### Option B: Use an existing domain from another registrar

If you already own a domain through Namecheap, GoDaddy, Cloudflare, etc., you can use it. You'll need to update your nameservers after deploying the DNS stack (covered in the README).

---

## Create GitHub OIDC Provider

This lets GitHub Actions authenticate to your AWS account **without storing any long-lived credentials**. Instead, GitHub generates a short-lived token for each workflow run, and AWS verifies it came from your repository.

### How it works

1. GitHub Actions requests a JWT (JSON Web Token) from GitHub's OIDC provider (`token.actions.githubusercontent.com`)
2. The workflow presents this token to AWS STS (Security Token Service)
3. AWS verifies the token's signature against GitHub's public keys
4. If the token is valid and the claims match your IAM role's trust policy (correct repo, correct branch), AWS issues temporary credentials
5. The workflow uses these credentials to deploy — they expire after the workflow completes

### Create the provider

Make sure you're logged into the **production** account:

```bash
aws sts get-caller-identity  # verify correct account

aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

> **Note on the thumbprint:** Since July 2023, AWS no longer validates this thumbprint for GitHub's OIDC provider — they use GitHub's root CA directly. The `--thumbprint-list` parameter is still required by the API but the value is not actively verified. The value above is the well-documented GitHub OIDC thumbprint used in all AWS documentation.

### Verify

```bash
aws iam list-open-id-connect-providers
```

You should see an ARN like `arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com`.

---

## Create IAM Deploy Role

This role is what GitHub Actions assumes to deploy your infrastructure. The trust policy restricts it to your specific repository and branch.

### 1. Create the trust policy file

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
          "token.actions.githubusercontent.com:sub": "repo:<OWNER/REPO>:*"
        }
      }
    }
  ]
}
```

> **Security note:** The `sub` condition restricts which repository can assume this role. `repo:<OWNER/REPO>:*` allows any branch/trigger from your repo. For tighter security, use `repo:<OWNER/REPO>:ref:refs/heads/main` to restrict to the `main` branch only.

### 2. Create the role and attach permissions

```bash
aws iam create-role \
  --role-name github-actions-deploy \
  --assume-role-policy-document file://github-actions-trust-policy.json

aws iam attach-role-policy \
  --role-name github-actions-deploy \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

### 3. Note the role ARN

```bash
aws iam get-role --role-name github-actions-deploy --query Role.Arn --output text
```

Save this — you'll need it for GitHub secrets.

> **Note:** AdministratorAccess is broad. For a personal site this is fine. For tighter security, create a custom policy scoped to: CloudFormation, S3, Lambda, ECR, API Gateway, Route 53, RDS, Cognito, IAM, CloudFront, Budgets, SSM, Secrets Manager, EC2, VPC.

---

## Bootstrap CDK

CDK bootstrap creates an S3 bucket and IAM roles that CDK needs to deploy CloudFormation stacks.

```bash
cd infrastructure/cdk
npm install

# Set the AWS profile so CDK can authenticate
export AWS_PROFILE=prod

# Get your account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# CDK app requires these env vars to load — they don't affect bootstrap,
# but the config file will error without them.
CDK_DOMAIN_NAME=yourdomain.com \
CDK_ACCOUNT_ID=$ACCOUNT_ID \
CDK_BUDGET_EMAIL=you@example.com \
npx cdk bootstrap aws://$ACCOUNT_ID/us-east-1
```

Replace `yourdomain.com` and `you@example.com` with your actual domain and email.

Delete the placeholder VPC context so CDK looks up your real VPC:
```bash
rm infrastructure/cdk/cdk.context.json
```

---

## Set GitHub Repository Secrets and Variables

Go to **GitHub → your repo → Settings → Secrets and variables → Actions**.

### Production secrets and variables

**Secrets:**

| Name | Value |
|------|-------|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::<PROD_ACCOUNT_ID>:role/github-actions-deploy` |
| `AWS_ACCOUNT_ID` | Your production AWS account ID |
| `CDK_BUDGET_EMAIL` | Your email for budget alerts |

**Variables:**

| Name | Value |
|------|-------|
| `AWS_REGION` | `us-east-1` |
| `CDK_DOMAIN_NAME` | Your domain (e.g., `example.com`) |
| `CDK_AUTO_BUCKET_NAMES` | Omit for new deployments (defaults to `true`, CDK auto-generates collision-safe names). Set to `false` only if you already have deployed stacks with explicit bucket names (e.g., `yourdomain.com-frontend`). |

### Staging secrets and variables (optional)

Only needed if you're setting up the staging account:

**Secrets:**

| Name | Value |
|------|-------|
| `AWS_STAGE_DEPLOY_ROLE_ARN` | `arn:aws:iam::<STAGE_ACCOUNT_ID>:role/github-actions-deploy` |
| `AWS_STAGE_ACCOUNT_ID` | Your staging AWS account ID |
| `CDK_STAGE_BUDGET_EMAIL` | Budget email for staging (optional, falls back to `CDK_BUDGET_EMAIL`) |

**Variables:**

| Name | Value |
|------|-------|
| `CDK_STAGE_DOMAIN_NAME` | `stage.<yourdomain>` (e.g., `stage.example.com`) |
| `DEPLOY_STAGING` | `true` (enables automatic staging deploy on CI success) |

---

## Staging Account Setup (Optional)

Staging deploys to a completely separate AWS account for full isolation. Follow these steps if you want a staging environment.

### 1. Create the staging account using AWS Organizations

AWS Organizations lets you create and manage multiple accounts from a single management account (your production account).

**Enable Organizations (one-time):**

```bash
# Run from your production account
aws organizations create-organization --feature-set ALL
```

**Create the staging account:**

```bash
aws organizations create-account \
  --email staging+yourdomain@gmail.com \
  --account-name "my-site-staging"
```

> **Tip:** Use a `+` alias of your email (e.g., `you+staging@gmail.com`) — it routes to the same inbox but counts as a unique email for AWS.

**Check creation status:**

```bash
aws organizations list-accounts --query 'Accounts[?Name==`my-site-staging`]'
```

Note the `Id` field — this is your staging account ID.

**Access the staging account:**

If you set up IAM Identity Center (Step 2), add the staging account:

1. AWS Console → **IAM Identity Center** → **AWS accounts**
2. You should see both accounts listed. Select the staging account → **Assign users**
3. Assign your user with the **AdministratorAccess** permission set
4. Configure a CLI profile for staging:
   ```bash
   aws configure sso
   # Use the same SSO start URL
   # CLI profile name: staging
   ```
5. Log in to the staging account:
   ```bash
   aws sso login --profile staging
   export AWS_PROFILE=staging
   aws sts get-caller-identity  # verify it shows the staging account ID
   ```

> **Alternative (without Organizations):** You can also create a standalone AWS account at [https://aws.amazon.com](https://aws.amazon.com) using a different email address. Then set up IAM Identity Center independently in that account.

### 2. Set up OIDC and IAM role in the staging account

Repeat the same steps as production, but while logged into the **staging** account:

```bash
export AWS_PROFILE=staging
aws sts get-caller-identity  # verify staging account ID

# Create OIDC provider
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1

# Create trust policy (use your STAGING account ID)
STAGE_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
cat > github-actions-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${STAGE_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:<OWNER/REPO>:*"
        }
      }
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name github-actions-deploy \
  --assume-role-policy-document file://github-actions-trust-policy.json

aws iam attach-role-policy \
  --role-name github-actions-deploy \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Note the ARN
aws iam get-role --role-name github-actions-deploy --query Role.Arn --output text
```

### 3. Bootstrap CDK in the staging account

```bash
export AWS_PROFILE=staging
STAGE_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

cd infrastructure/cdk

# CDK app requires these env vars to load — they don't affect bootstrap,
# but the config file will error without them.
CDK_DOMAIN_NAME=stage.yourdomain.com \
CDK_ACCOUNT_ID=$STAGE_ACCOUNT_ID \
CDK_BUDGET_EMAIL=you@example.com \
npx cdk bootstrap aws://$STAGE_ACCOUNT_ID/us-east-1
```

Replace `stage.yourdomain.com` and `you@example.com` with your actual staging domain and email.

### 4. Add staging secrets and variables to GitHub

See [Set GitHub Repository Secrets and Variables](#set-github-repository-secrets-and-variables) above for the staging-specific values.

### 5. First staging deploy and DNS delegation

The first staging deploy creates a Route 53 hosted zone for `stage.yourdomain.com` in the staging account. DNS delegation tells the internet to ask the staging account's nameservers for anything under `stage.yourdomain.com`.

**Trigger the first deploy:**

Go to **Actions → Deploy Stage → Run workflow**. The `MySiteCert` stack may hang waiting for ACM certificate DNS validation — this is expected because DNS delegation isn't set up yet. You can cancel and re-run after completing DNS delegation, or wait for it to time out.

**Get the staging nameservers:**

```bash
export AWS_PROFILE=staging

# Find the hosted zone ID
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name stage.yourdomain.com \
  --query 'HostedZones[0].Id' --output text)

# Get nameservers
aws route53 get-hosted-zone --id $ZONE_ID \
  --query 'DelegationSet.NameServers' --output table
```

> **Important -- delegation set vs in-zone NS records**: Route 53 shows two sets of NS records
> that look similar but are different:
> - **Delegation set** (from `aws route53 get-hosted-zone --id <ZONE_ID>`): The nameservers
>   that actually serve the zone. **Always use these for DNS delegation.**
> - **In-zone NS records** (visible in the Route 53 console Records tab): Records inside
>   the zone itself. These may differ from the delegation set. Do NOT use these.
>
> The `get-hosted-zone` command above returns the correct delegation set nameservers.

You'll get 4 nameservers like:
```
ns-123.awsdns-45.com
ns-678.awsdns-90.net
ns-111.awsdns-22.org
ns-333.awsdns-44.co.uk
```

**Create NS delegation:**

Choose the option that matches your current setup:

#### Option A: Production is already deployed (Route 53 manages your domain)

If the production account already has a Route 53 hosted zone for `yourdomain.com`:

```bash
export AWS_PROFILE=prod

# Find the production hosted zone ID
PROD_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name yourdomain.com \
  --query 'HostedZones[0].Id' --output text)

# Create NS delegation record (replace nameservers with your actual values)
aws route53 change-resource-record-sets --hosted-zone-id $PROD_ZONE_ID --change-batch '{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "stage.yourdomain.com",
      "Type": "NS",
      "TTL": 300,
      "ResourceRecords": [
        {"Value": "ns-123.awsdns-45.com"},
        {"Value": "ns-678.awsdns-90.net"},
        {"Value": "ns-111.awsdns-22.org"},
        {"Value": "ns-333.awsdns-44.co.uk"}
      ]
    }
  }]
}'
```

#### Option B: Production is NOT deployed yet (external registrar manages DNS)

If you're deploying staging before production, there's no prod Route 53 zone yet. Add NS records directly at your domain registrar instead.

**Namecheap:** Domain List → `yourdomain.com` → Advanced DNS → Add 4 NS records:

| Type | Host | Value |
|------|------|-------|
| NS | `stage` | `ns-123.awsdns-45.com` |
| NS | `stage` | `ns-678.awsdns-90.net` |
| NS | `stage` | `ns-111.awsdns-22.org` |
| NS | `stage` | `ns-333.awsdns-44.co.uk` |

**Other registrars:** Add 4 NS records for the subdomain `stage` pointing to each of the staging nameservers.

> **Note:** When you later deploy production and move DNS to Route 53, you'll need to:
> 1. Add the NS delegation for `stage.yourdomain.com` in the prod Route 53 zone (Option A above)
> 2. Remove the `stage` NS records from your registrar


**Verify delegation:**

```bash
dig stage.yourdomain.com NS +short
```

Should return the staging account's nameservers.

**Re-trigger Deploy Stage** — ACM certificate DNS validation will now succeed.

### 6. Create staging admin user

After staging is fully deployed, create an admin user in the staging Cognito user pool:

```bash
export AWS_PROFILE=staging

USER_POOL_ID=$(aws cognito-idp list-user-pools --max-results 10 \
  --query "UserPools[?Name=='mysite-users'].Id" --output text)

aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username your@email.com \
  --user-attributes Name=email,Value=your@email.com Name=email_verified,Value=true \
  --temporary-password 'TempPass123!@#$' \
  --message-action SUPPRESS
```

Log in at `https://stage.yourdomain.com/admin` with the temporary password, then set a permanent password and configure TOTP MFA.

---

## Tearing Down Old Staging (Migration Only)

If you previously had staging deployed in the **production** account (same-account staging model), tear it down before deploying to the new staging account. S3 bucket names are globally unique — the old `stage.yourdomain.com-frontend` bucket must be deleted first.

```bash
export AWS_PROFILE=prod
cd infrastructure/cdk

CDK_DEPLOY_STAGING=true CDK_DOMAIN_NAME=yourdomain.com \
  CDK_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text) \
  CDK_BUDGET_EMAIL=you@example.com CDK_REGION=us-east-1 \
  npx cdk destroy MySiteStageApp MySiteStageData --force
```

Then remove old DNS records from the production Route 53 zone:
- `stage.yourdomain.com` A record
- `stage-api.yourdomain.com` A record

These are replaced by the NS delegation record for `stage.yourdomain.com` pointing to the staging account.
