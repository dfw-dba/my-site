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

---

## Overview

This project deploys to a single AWS account that hosts the live site at `yourdomain.com`.

The account needs: an OIDC identity provider (for GitHub Actions), an IAM deploy role, and CDK bootstrap. Complete steps 1–8 below.

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
