# Resilient CDK Deployment — Eliminate Manual Intervention

**Branch**: `feature/resilient-cdk-deploy`
**Status**: Planning

## Context

Deploying CDK stacks to new AWS accounts required extensive manual intervention:
1. ROLLBACK_COMPLETE/ROLLBACK_FAILED stacks blocking redeployment
2. ACM certificate DNS validation chicken-and-egg (MySiteCert hangs before DNS delegation exists)
3. S3 bucket name collisions across accounts (globally unique names like `domain-media`)
4. ROLLBACK_FAILED stacks requiring force delete due to stuck ACM certs
5. No pre-flight validation to catch misconfigurations before deploying

This plan eliminates these issues so that first-time and repeat deployments succeed without manual CloudFormation console work.

## Implementation Phases

### Phase A — Safe, additive changes (no existing resource modifications)
Changes 1, 2, 4, 5 below. These add defensive automation to the deploy workflows without touching any existing AWS resources. Zero risk of bucket replacement or data loss.

### Phase B — Conditional bucket naming (backwards-compatible)
Change 3 below. Makes bucket naming configurable via `CDK_AUTO_BUCKET_NAMES`. Defaults to `true` (auto-generated names for new forks). Existing deployments set the variable to `false` to keep explicit names unchanged. No resource replacement occurs when `false`.

---

## Changes

### 1. Pre-deploy stack cleanup step
**File(s):** `.github/workflows/deploy-stage.yml`, `.github/workflows/deploy-prod.yml`
**Risk:** LOW

Add a step before CDK deploy that detects and cleans up broken stacks:

```yaml
- name: Clean up failed stacks
  run: |
    for stack in MySiteDns MySiteCert MySiteData MySiteApp; do
      status=$(aws cloudformation describe-stacks --stack-name "$stack" \
        --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
      case "$status" in
        ROLLBACK_COMPLETE)
          echo "Deleting ROLLBACK_COMPLETE stack: $stack"
          aws cloudformation delete-stack --stack-name "$stack"
          aws cloudformation wait stack-delete-complete --stack-name "$stack"
          ;;
        ROLLBACK_FAILED|DELETE_FAILED)
          echo "Force deleting $status stack: $stack"
          aws cloudformation delete-stack --stack-name "$stack" --deletion-mode FORCE_DELETE_STACK
          aws cloudformation wait stack-delete-complete --stack-name "$stack"
          ;;
      esac
    done
```

Insert in both workflows immediately before the CDK deploy step:
- `deploy-stage.yml`: before line 52 (CDK deploy staging)
- `deploy-prod.yml`: before line 54 (CDK deploy)

### 2. Two-phase first deploy with DNS delegation gate
**File(s):** `.github/workflows/deploy-stage.yml`, `.github/workflows/deploy-prod.yml`
**Risk:** MEDIUM

Replace the single `cdk deploy MySiteDns MySiteCert MySiteData MySiteApp` command with a two-phase approach:

**Phase 1**: Deploy `MySiteDns` only
```bash
npx cdk deploy MySiteDns --require-approval never --outputs-file cdk-outputs-dns.json
```

**Gate**: Check if DNS delegation is working. Query for NS records via public DNS. If delegation is not set up, output the required nameservers and fail with a clear message.

```bash
DOMAIN="${CDK_DOMAIN_NAME}"

# Extract nameservers from the hosted zone CDK just created/updated
# IMPORTANT: Use get-hosted-zone (delegation set), NOT list-resource-record-sets (in-zone NS).
# The delegation set is what DNS resolvers actually query. In-zone NS records may differ.
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name "$DOMAIN" --query 'HostedZones[0].Id' --output text)
NAMESERVERS=$(aws route53 get-hosted-zone --id "$ZONE_ID" \
  --query 'DelegationSet.NameServers' --output text)

# Check if delegation resolves (try up to 5 times with 30s waits)
DELEGATED=false
for i in 1 2 3 4 5; do
  if dig "$DOMAIN" NS +short @8.8.8.8 | grep -q "awsdns"; then
    DELEGATED=true
    break
  fi
  echo "DNS delegation not detected yet (attempt $i/5). Waiting 30s..."
  sleep 30
done

if [ "$DELEGATED" = false ]; then
  echo "::error::DNS delegation not set up for $DOMAIN."
  echo "Required nameservers (from Route 53 delegation set):"
  echo "$NAMESERVERS"
  echo ""
  echo "Add these as Custom DNS nameservers in your domain registrar,"
  echo "or as NS records in the parent Route 53 hosted zone."
  echo "Then re-run this workflow."
  exit 1
fi
```

**Phase 2**: Deploy remaining stacks (writes to the primary outputs file used by downstream jobs)
```bash
npx cdk deploy MySiteCert MySiteData MySiteApp --require-approval never --outputs-file <cdk-outputs-file>.json
```

**Important considerations**:
- On subsequent deploys, the DNS gate passes immediately since delegation already exists
- Phase 2's output file is the one consumed by the `Extract CDK outputs` step — no output extraction changes needed since none of the extracted outputs come from `MySiteDns`
- The prod workflow should also split the `cdk diff` command to match: `cdk diff MySiteDns` then `cdk diff MySiteCert MySiteData MySiteApp`
- `dig` is available on GitHub Actions `ubuntu-latest` — add a comment noting this dependency

### 3. Conditional S3 bucket naming with purpose tags
**File(s):** `infrastructure/cdk/config/index.ts`, `infrastructure/cdk/lib/app-stack.ts`, `.github/workflows/deploy-stage.yml`, `.github/workflows/deploy-prod.yml`, `docs/aws-setup.md`
**Risk:** LOW (backwards-compatible, defaults safe for both existing and new deployments)

#### a) Add config property (`config/index.ts`)

```typescript
autoGenerateBucketNames: optional("CDK_AUTO_BUCKET_NAMES", "true") === "true",
```

This defaults to `true`. Existing deployments override to `false` via GitHub Actions variable.

#### b) Conditional bucket names (`app-stack.ts`)

```typescript
const frontendBucket = new s3.Bucket(this, "FrontendBucket", {
  bucketName: config.autoGenerateBucketNames ? undefined : `${config.domainName}-frontend`,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});

const mediaBucket = new s3.Bucket(this, "MediaBucket", {
  bucketName: config.autoGenerateBucketNames ? undefined : `${config.domainName}-media`,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  removalPolicy: isStaging ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
  autoDeleteObjects: isStaging,
  cors: [/* ... unchanged ... */],
});
```

#### c) Add Purpose and Environment tags (unconditional — tags never cause replacement)

```typescript
cdk.Tags.of(frontendBucket).add("Purpose", "frontend-hosting");
cdk.Tags.of(frontendBucket).add("Environment", isStaging ? "staging" : "production");

cdk.Tags.of(mediaBucket).add("Purpose", "media-storage");
cdk.Tags.of(mediaBucket).add("Environment", isStaging ? "staging" : "production");
```

#### d) Pass env var in workflows

Both `deploy-stage.yml` and `deploy-prod.yml` — add to the CDK deploy step's `env:` block:

```yaml
CDK_AUTO_BUCKET_NAMES: ${{ vars.CDK_AUTO_BUCKET_NAMES || 'true' }}
```

The `|| 'true'` default means:
- **New forks** (variable not set): auto-generated bucket names, no collision risk
- **Existing deployments** (variable set to `false`): explicit domain-based names preserved, no replacement

#### e) Document in `aws-setup.md`

Add `CDK_AUTO_BUCKET_NAMES` to the Variables table in the "Set GitHub Repository Secrets and Variables" section:

| Name | Value |
|------|-------|
| `CDK_AUTO_BUCKET_NAMES` | `false` — only set this if you already have deployed stacks with explicit bucket names (e.g., `yourdomain.com-frontend`). Omit for new deployments to let CDK auto-generate collision-safe names. |

**User action required**: You need to create one GitHub Actions variable:
- `CDK_AUTO_BUCKET_NAMES` = `false`

This single variable is referenced by both the stage and prod workflows. No stage-specific variant needed.

### 4. Pre-flight validation script
**File(s):** `.github/scripts/preflight-check.sh` (new file), `.github/workflows/deploy-stage.yml`, `.github/workflows/deploy-prod.yml`
**Risk:** LOW

A script that validates prerequisites before deploying. Run as a step before the cleanup step in both workflows.

```bash
#!/bin/bash
set -euo pipefail
ERRORS=0
WARNINGS=0

echo "=== Pre-flight Deployment Check ==="

# Check OIDC provider exists
if aws iam list-open-id-connect-providers --query 'OpenIDConnectProviderList[*].Arn' --output text \
    | grep -q "token.actions.githubusercontent.com"; then
  echo "PASS: OIDC provider exists"
else
  echo "FAIL: OIDC provider not found"
  ERRORS=$((ERRORS+1))
fi

# Check CDK is bootstrapped
CDK_STATUS=$(aws cloudformation describe-stacks --stack-name CDKToolkit \
  --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
if echo "$CDK_STATUS" | grep -q "COMPLETE"; then
  echo "PASS: CDK bootstrapped ($CDK_STATUS)"
else
  echo "FAIL: CDK not bootstrapped (status: $CDK_STATUS)"
  ERRORS=$((ERRORS+1))
fi

# Check for broken stacks (informational - cleanup step handles this)
for stack in MySiteDns MySiteCert MySiteData MySiteApp; do
  status=$(aws cloudformation describe-stacks --stack-name "$stack" \
    --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
  case "$status" in
    ROLLBACK_COMPLETE|ROLLBACK_FAILED|DELETE_FAILED)
      echo "WARN: $stack is in $status state (will be cleaned up automatically)"
      WARNINGS=$((WARNINGS+1))
      ;;
  esac
done

echo ""
echo "Results: $ERRORS errors, $WARNINGS warnings"
if [ "$ERRORS" -gt 0 ]; then
  echo "::error::Pre-flight check failed with $ERRORS error(s). Fix the issues above before deploying."
  exit 1
fi
```

Add as a workflow step before the cleanup step:
```yaml
- name: Pre-flight validation
  run: bash .github/scripts/preflight-check.sh
```

Note: Removed the deploy role check from the original plan — if the role didn't exist, the `Configure AWS credentials` step would have already failed before reaching pre-flight.

### 5. Document delegation set vs in-zone NS records
**File(s):** `docs/aws-setup.md`
**Risk:** NONE

Add a callout in Step 5 (First staging deploy and DNS delegation), after the "Get the staging nameservers" section (around line 427):

```markdown
> **Important -- delegation set vs in-zone NS records**: Route 53 shows two sets of NS records
> that look similar but are different:
> - **Delegation set** (from `aws route53 get-hosted-zone --id <ZONE_ID>`): The nameservers
>   that actually serve the zone. **Always use these for DNS delegation.**
> - **In-zone NS records** (visible in the Route 53 console Records tab): Records inside
>   the zone itself. These may differ from the delegation set. Do NOT use these.
>
> The `get-hosted-zone` command above returns the correct delegation set nameservers.
```

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/deploy-stage.yml` | Edit | Add pre-flight, cleanup, two-phase deploy with DNS gate, `CDK_AUTO_BUCKET_NAMES` env var |
| `.github/workflows/deploy-prod.yml` | Edit | Add pre-flight, cleanup, two-phase deploy with DNS gate, `CDK_AUTO_BUCKET_NAMES` env var |
| `.github/scripts/preflight-check.sh` | Create | Pre-flight validation script |
| `infrastructure/cdk/config/index.ts` | Edit | Add `autoGenerateBucketNames` config property |
| `infrastructure/cdk/lib/app-stack.ts` | Edit | Conditional bucket names, add Purpose/Environment tags |
| `docs/aws-setup.md` | Edit | Add `CDK_AUTO_BUCKET_NAMES` to variables table, add delegation set callout |
| `README.md` | Edit | Document pre-flight check, two-phase deploy behavior, `CDK_AUTO_BUCKET_NAMES` variable |
| `.claude/tasks/lessons.md` | Edit | Add lesson about delegation set vs in-zone NS records |

## Verification

1. **CDK synth with `CDK_AUTO_BUCKET_NAMES=false`**: Run `cdk synth` and verify the CloudFormation template contains explicit `BucketName` properties matching current values. No resource replacement.
2. **CDK synth with `CDK_AUTO_BUCKET_NAMES=true`** (or unset): Run `cdk synth` and verify the CloudFormation template has NO `BucketName` properties. Buckets get Purpose/Environment tags.
3. **Tags present in both modes**: Verify Purpose and Environment tags appear in the synth output regardless of bucket naming mode.
4. **Pre-deploy cleanup**: Manually put a stack in ROLLBACK_COMPLETE (deploy with bad config, let it fail). Re-run deploy — it should auto-clean and succeed.
5. **Two-phase first deploy**: Deploy to a fresh account. Verify Phase 1 deploys MySiteDns only, the gate detects missing delegation and outputs clear nameserver instructions. Set up delegation, re-run — verify it passes and completes.
6. **Pre-flight script**: Run with missing OIDC provider — verify it fails with clear error. Run with everything in place — verify it passes.
7. **Staging deploy end-to-end**: Full deploy to staging account succeeds without manual intervention.
8. **Prod deploy end-to-end**: Full deploy to prod account succeeds without manual intervention.
