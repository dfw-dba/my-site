# Plan: Deploy Staging to Separate AWS Account

## Context

Currently, staging and production deploy to the **same AWS account**. Staging shares prod's Route 53 hosted zone, ACM wildcard certificate, Cognito user pool, and VPC. This creates coupling — staging can impact prod resources, cost attribution is mixed, and there's no security boundary between environments.

This change makes staging a fully self-contained, independent deployment in its own AWS account. The CDK stacks become environment-agnostic — configuration (env vars) determines the target account and domain.

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| DNS | Subdomain delegation (`stage.example.com` zone in staging account) | Full isolation, no cross-account Route 53 access needed |
| Cognito | Separate user pool in staging account | Full isolation; staging admin created independently |
| VPC Endpoints | Include in staging (~$14/mo) | Full parity with prod |
| Bastion | Staging gets its own | Can't cross account boundaries |
| Migration | Tear down old staging first, then deploy new | S3 bucket names are globally unique — old must be deleted first |
| URL change | `stage-api.example.com` → `api.stage.example.com` | Natural consequence of subdomain delegation |

## Files to Modify

| File | Change Summary |
|------|---------------|
| `infrastructure/cdk/config/index.ts` | Add `isStaging`, remove `deployStaging` |
| `infrastructure/cdk/bin/app.ts` | Remove conditional staging block; always create 4 stacks |
| `infrastructure/cdk/lib/data-stack.ts` | Remove staging guards; always create Cognito/VPC endpoints/bastion |
| `infrastructure/cdk/lib/app-stack.ts` | Remove staging domain prefix logic; use `config.domainName` directly |
| `.github/workflows/deploy-stage.yml` | Point to staging account credentials and config |
| `.github/workflows/deploy-prod.yml` | Remove `CDK_DEPLOY_STAGING` env var |
| `README.md` | Document two-account model, staging account setup, updated architecture/cost/CD |
| `.claude/agents/aws-architect.md` | Update to reflect two-account staging model |
| `.claude/tasks/lessons.md` | Update `DEPLOY_STAGING` lesson for new staging model |
| `.claude/rules/documentation.md` | Add rule: every iteration must check `.claude/` and `README.md` for relevance |

## Implementation Steps

### Step 1: CDK Config (`infrastructure/cdk/config/index.ts`)

- Add: `isStaging: process.env.CDK_IS_STAGING === "true"`
- Remove: `deployStaging: process.env.CDK_DEPLOY_STAGING === "true"`
- No other changes — `budgetAlertEmail` stays required (staging gets budget alerts too)

### Step 2: CDK Entry Point (`infrastructure/cdk/bin/app.ts`)

Remove the entire `if (config.deployStaging) { ... }` block (lines 41–63). The file becomes:

```typescript
const app = new cdk.App();
const env = { account: config.awsAccountId, region: config.awsRegion };

const dns = new DnsStack(app, "MySiteDns", { env });
const cert = new CertStack(app, "MySiteCert", {
  env: { account: config.awsAccountId, region: "us-east-1" },
  crossRegionReferences: true,
  hostedZone: dns.hostedZone,
});
const data = new DataStack(app, "MySiteData", { env, hostedZone: dns.hostedZone });
new AppStack(app, "MySiteApp", {
  env,
  crossRegionReferences: true,
  hostedZone: dns.hostedZone,
  certificate: cert.certificate,
  database: data.database,
  databaseSecurityGroup: data.databaseSecurityGroup,
  vpc: data.vpc,
  userPoolId: data.userPoolId,
  userPoolClientId: data.userPoolClientId,
});
app.synth();
```

Key changes:
- No more `MySiteStageData` / `MySiteStageApp` stacks
- `data.userPoolId` is no longer optional (Cognito always created)
- No `bastionSecurityGroup` passed between stacks
- No `staging: true` props

### Step 3: DataStack (`infrastructure/cdk/lib/data-stack.ts`)

**Props interface** — remove staging-specific props:
```typescript
interface DataStackProps extends cdk.StackProps {
  hostedZone: route53.IHostedZone;
  // Remove: staging?: boolean;
  // Remove: bastionSecurityGroup?: ec2.ISecurityGroup;
}
```

**Public properties** — make Cognito IDs non-optional:
```typescript
public readonly userPoolId: string;       // was: string | undefined
public readonly userPoolClientId: string;  // was: string | undefined
public readonly bastionSecurityGroup: ec2.ISecurityGroup;  // was: ... | undefined
```

**Internal changes**:
- Replace `const isStaging = !!props.staging` with `const isStaging = config.isStaging`
- Change SSM prefix from conditional to always `/mysite` (account isolation replaces namespace isolation)
- **Remove** the `if (!isStaging)` guard around Cognito, VPC endpoints, and bastion (lines 170–292) — these are always created
- **Remove** the `if (isStaging && props.bastionSecurityGroup)` block (lines 294–301) — cross-account SG refs are impossible
- Add `removalPolicy: isStaging ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN` to the Cognito user pool
- Keep `isStaging` usage for: backup retention (1 vs 30 days), deletion protection, RDS removal policy

### Step 4: AppStack (`infrastructure/cdk/lib/app-stack.ts`)

**Props interface** — remove `staging`:
```typescript
// Remove: staging?: boolean;
```

**Internal changes**:
- Replace `const isStaging = !!props.staging` with `const isStaging = config.isStaging`
- Remove `domainPrefix` and `namePrefix` variables
- `frontendDomain = config.domainName` (domain comes from env vars: `example.com` or `stage.example.com`)
- `apiDomainName = \`api.${config.domainName}\`` (produces `api.example.com` or `api.stage.example.com`)
- S3 bucket names: `\`${config.domainName}-frontend\`` and `\`${config.domainName}-media\``
- Route 53 frontend record: `recordName: undefined` (apex of zone)
- Route 53 API record: `recordName: "api"`
- Remove the `if (!isStaging)` guard around the budget alarm — always create it
- Keep `isStaging` for: media bucket removal policy, Lambda/API naming (for human readability in console)

### Step 5: Deploy Stage Workflow (`.github/workflows/deploy-stage.yml`)

**AWS credentials** — use staging-specific role (3 occurrences):
```yaml
role-to-assume: ${{ secrets.AWS_STAGE_DEPLOY_ROLE_ARN }}
```

**CDK deploy step env vars**:
```yaml
CDK_DOMAIN_NAME: ${{ vars.CDK_STAGE_DOMAIN_NAME }}
CDK_ACCOUNT_ID: ${{ secrets.AWS_STAGE_ACCOUNT_ID }}
CDK_REGION: ${{ env.AWS_REGION }}
CDK_BUDGET_EMAIL: ${{ secrets.CDK_STAGE_BUDGET_EMAIL || secrets.CDK_BUDGET_EMAIL }}
CDK_IS_STAGING: "true"
```

**CDK deploy command**:
```bash
npx cdk deploy MySiteDns MySiteCert MySiteData MySiteApp --require-approval never --outputs-file cdk-outputs-stage.json
```

**Extract CDK outputs**:
```bash
echo "frontend-bucket=$(jq -r '.MySiteApp.FrontendBucketName' cdk-outputs-stage.json)" >> "$GITHUB_OUTPUT"
echo "distribution-id=$(jq -r '.MySiteApp.DistributionId' cdk-outputs-stage.json)" >> "$GITHUB_OUTPUT"
echo "user-pool-id=$(jq -r '.MySiteData.UserPoolId' cdk-outputs-stage.json)" >> "$GITHUB_OUTPUT"
echo "user-pool-client-id=$(jq -r '.MySiteData.UserPoolClientId' cdk-outputs-stage.json)" >> "$GITHUB_OUTPUT"
echo "api-url=$(jq -r '.MySiteApp.ApiUrl' cdk-outputs-stage.json)" >> "$GITHUB_OUTPUT"
```

**Validation step** — update `DOMAIN_NAME`:
```yaml
DOMAIN_NAME: ${{ vars.CDK_STAGE_DOMAIN_NAME }}
```

### Step 6: Deploy Prod Workflow (`.github/workflows/deploy-prod.yml`)

- Remove `CDK_DEPLOY_STAGING: ${{ vars.DEPLOY_STAGING }}` from both the CDK diff and CDK deploy steps (lines 53, 63)
- Everything else unchanged

### Step 7: README.md

Update these sections:
- **Architecture**: Show two separate AWS accounts in the diagram
- **Deploying to AWS**: Add "Staging Account Setup" subsection with:
  - OIDC identity provider creation
  - IAM deploy role creation
  - CDK bootstrap command
  - NS delegation instructions
- **Continuous Deployment**: Explain two-account model
- **GitHub Configuration**: Document new secrets/variables (table below)

## New GitHub Repository Configuration

### Secrets (new)
| Secret | Description |
|--------|-------------|
| `AWS_STAGE_DEPLOY_ROLE_ARN` | IAM role ARN in staging account for GitHub OIDC |
| `AWS_STAGE_ACCOUNT_ID` | Staging AWS account ID |
| `CDK_STAGE_BUDGET_EMAIL` | Budget alert email for staging (optional, falls back to `CDK_BUDGET_EMAIL`) |

### Secrets (moved from variables)
| Secret | Description |
|--------|-------------|
| `AWS_ACCOUNT_ID` | Production AWS account ID |
| `CDK_BUDGET_EMAIL` | Email for budget alerts |

### Variables (new)
| Variable | Example | Description |
|----------|---------|-------------|
| `CDK_STAGE_DOMAIN_NAME` | `stage.example.com` | Staging domain (subdomain of prod domain) |

## Migration Procedure (After PR Merges)

### Pre-migration: Tear Down Old Staging in Prod Account

```bash
# From infrastructure/cdk/ directory, with prod AWS credentials:
CDK_DEPLOY_STAGING=true CDK_DOMAIN_NAME=<your-domain> CDK_ACCOUNT_ID=<prod-account-id> \
  CDK_BUDGET_EMAIL=<email> CDK_REGION=us-east-1 \
  npx cdk destroy MySiteStageApp MySiteStageData --force
```

Then manually remove old DNS records (`stage.` and `stage-api.` A records) from prod Route 53.

### Staging Account Setup

1. **Create/identify the staging AWS account**
2. **Create GitHub OIDC identity provider** in staging account:
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
3. **Create IAM deploy role** with trust policy for the GitHub repo (same permissions as prod deploy role)
4. **CDK bootstrap**:
   ```bash
   AWS_ACCOUNT_ID=<staging-id> CDK_REGION=us-east-1 npx cdk bootstrap aws://<staging-id>/us-east-1
   ```
5. **Add GitHub secrets/variables** (see table above)
6. **First deploy** — trigger `Deploy Stage` workflow manually
   - The `MySiteDns` stack creates a Route 53 hosted zone for `stage.example.com`
   - **Note**: The ACM cert will hang on DNS validation until NS delegation is set up (step 7)
   - Get the NS records from the stack output: `aws route53 list-hosted-zones` + `aws route53 get-hosted-zone`
7. **NS delegation** — in the **prod** account's Route 53 zone for `example.com`:
   - Create NS record: Name=`stage`, Values=4 nameservers from step 6
8. **Re-trigger Deploy Stage** — ACM cert DNS validation will now succeed
9. **Create staging admin user** in the new Cognito user pool
10. **Verify staging** end-to-end: frontend loads, API responds, admin login works

## Verification

After implementation (before merge):
- `cd infrastructure/cdk && npx tsc --noEmit` — type check passes
- `cd infrastructure/cdk && npx cdk synth` with prod env vars — produces 4 stacks, no `MySiteStage*`
- `cd infrastructure/cdk && CDK_IS_STAGING=true npx cdk synth` — produces 4 stacks with staging config
- `cd frontend && npx tsc --noEmit` — frontend unaffected
- `cd backend && uv run ruff check` — backend unaffected

After deployment:
- Staging site loads at `stage.example.com`
- Staging API responds at `api.stage.example.com/api/health`
- Staging admin login works with staging Cognito credentials
- Prod is completely unaffected

## Cost Impact

Staging account adds (previously shared from prod or skipped):
| Resource | Monthly Cost |
|----------|-------------|
| VPC Interface Endpoint (Cognito IDP, 2 AZs) | ~$14.40 |
| Bastion host (t4g.nano) | ~$3.00 |
| Route 53 hosted zone | $0.50 |
| Budget alarm | Free |
| **Total additional** | **~$18/month** |

## Step 8: `.claude/agents/aws-architect.md`

Update the **AWS Production Stack** and **CI/CD** sections to reflect the two-account model:
- Add a **Staging Environment** section explaining staging deploys to a separate AWS account
- Update CI/CD bullet points: `deploy-stage.yml` targets staging account, `deploy-prod.yml` targets prod account
- Note that staging is fully self-contained (own Cognito, DNS zone, cert, VPC endpoints, bastion)
- Remove references to staging sharing prod resources

## Step 9: `.claude/tasks/lessons.md`

Update the last entry (`GitHub Actions if conditions and DEPLOY_STAGING`) to reflect:
- `DEPLOY_STAGING` now controls whether to auto-deploy to the **staging account** (not staging stacks in prod account)
- The staging workflow uses separate AWS credentials (`AWS_STAGE_DEPLOY_ROLE_ARN`)
- Staging stacks are `MySiteDns/MySiteCert/MySiteData/MySiteApp` (not `MySiteStageData/MySiteStageApp`)

## Step 10: `.claude/rules/documentation.md`

Add a new rule section: **Iteration Review Checklist**. This ensures that every PR/iteration checks `.claude/` files and `README.md` for relevance to the changes being made:

```markdown
### Iteration Review Checklist

Every PR must also evaluate whether `.claude/` files need updating:
- **Agent files** (`.claude/agents/`): Do any agent descriptions reference changed architecture, workflows, or infrastructure?
- **Rule files** (`.claude/rules/`): Do any rules reference changed patterns, file paths, or conventions?
- **Lessons** (`.claude/tasks/lessons.md`): Do any lessons reference changed behavior that is no longer accurate?
- **CLAUDE.md**: Does the workflow orchestration or core principles section need updating?

If a change modifies infrastructure, CI/CD, project structure, or development workflow, the corresponding `.claude/` files must be updated in the same PR.
```

## Step 11: `README.md` Updates

### Architecture Section
- Update ASCII diagram to show two AWS accounts (prod and staging) with subdomain delegation
- Show staging as a fully independent stack in its own account

### Cost Estimate Section
- Update staging cost: was "Staging RDS (optional) +$12.50" → now "Staging account (optional) ~$30/month" (RDS + VPC endpoint + bastion + Route 53 zone)
- Break down staging costs separately

### Deploying to AWS Section
- Add **"Staging Account Setup"** subsection after the prod deployment steps (steps 5-7 repeated for staging account)
- Include: OIDC provider, IAM role, CDK bootstrap, NS delegation instructions
- Reference the new GitHub secrets/variables

### Continuous Deployment → Staging Environment Section
Major rewrite:
- Staging deploys to a **separate AWS account** (not same account as prod)
- Staging has its own DNS zone, ACM cert, Cognito, RDS, VPC endpoints, bastion
- Staging domains: `stage.example.com` (frontend), `api.stage.example.com` (API) — note the API URL change
- Remove "shares production Cognito user pool, DNS hosted zone, and wildcard certificate"
- Remove "Database access: staging RDS accessible from production bastion" (no longer true)
- Remove staging DB credentials path `/mysite/stage/db-credentials` (now just `/mysite/db-credentials` in staging account)
- Update GitHub variables table: add `AWS_STAGE_ACCOUNT_ID`, `CDK_STAGE_DOMAIN_NAME`, `AWS_STAGE_DEPLOY_ROLE_ARN`

### Step 8 (Deploy Infrastructure) Section
- Update stack count: "4 CloudFormation stacks" (remove "(6 if staging is enabled)" and the MySiteStage* bullets)
- Add note that staging deploys the same 4 stacks to a different account

---

## Pitfalls to Watch

1. **S3 bucket name collision**: Old staging used `stage.example.com-frontend`. New staging creates the same name. Old staging must be torn down first.
2. **ACM cert on first deploy**: DNS validation needs NS delegation in place. May require two deploy runs (DNS first, then full).
3. **cdk.context.json**: Contains VPC lookup cache keyed by account. Staging account's default VPC will be looked up and cached on first synth. The context file may need a commit after first staging synth.
