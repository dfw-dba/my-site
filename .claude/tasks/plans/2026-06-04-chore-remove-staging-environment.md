# Remove Staging Environment & Tear Down Stage AWS Account

## Context

The staging AWS account (`823754475787`, an AWS Organizations member; mgmt account `361280131191`) cost too much for its value. This change removes staging entirely: deletes all its AWS resources, strips staging from CI/CD + CDK + docs, and removes the staging GitHub secrets/variables. The (emptied) account is closed by the owner via the AWS console afterward (a member account can't be closed with the member CLI profile).

**Decisions:** delete all resources now via the `my-site-stage` CLI profile (owner closes the account via console); full code+docs cleanup (strip CDK `isStaging`); delete staging GitHub secrets/variables.

**Safety invariant:** production always ran with `isStaging === false`, so collapsing every `isStaging` branch to its production value yields a byte-identical production CloudFormation template (verified by a `cdk synth` before/after diff — only Lambda/Docker asset hashes differed, which are artifacts of the build context).

## Changes

### GitHub Actions
- `deploy.yml`: removed the 3 staging jobs (`deploy-stage-infra`, `deploy-stage-frontend`, `stage-post-deploy-validation`); `deploy-infra` is now the first job with a simplified `if:` (CI-success or dispatch). Prod chain: `deploy-infra → deploy-frontend → post-deploy-validation`.
- `toggle-features.yml`: removed the `deploy-staging` job and the environment input; production-only.
- Deleted orphaned staging-only scripts: `.github/scripts/regression-test-admin.sh`, `.github/scripts/pre-deploy-update-checkboxes.sh`.

### CDK (`infrastructure/cdk/`)
- `config/index.ts`: removed `isStaging` and the `staging` features entry; `loadFeatures()` returns the production block.
- `config/features.json`: production-only.
- `lib/data-stack.ts` / `lib/app-stack.ts`: every `isStaging` ternary collapsed to its production value — 30-day RDS backups, deletion protection on, `RETAIN` removal policies, no `-stage`/`stage-` name suffixes, `Environment=production` tags, no `REGRESSION_TEST_API_KEY` injection.

### Docs
- `README.md`: single-account architecture + diagram, cost table (staging table removed), 3-job CD chain, removed Staging Environment section + feature-toggle staging refs.
- `docs/aws-setup.md`: removed the Staging Account Setup section + staging secrets subsection; single-account Overview/TOC.
- `docs/architecture.md`: removed the staging note.
- `.claude/rules/git-workflow.md`: PR sections 3→2 (dropped Stage Test Plan), 6→3 job chain, removed Staging Environment section, trimmed Prod Deploy Gate.
- `.claude/agents/aws-architect.md`: production-only pipeline; removed Staging Environment subsection.

### AWS teardown (`--profile my-site-stage --region us-east-1`)
- Disabled Cognito deletion protection (`us-east-1_YP8QVGkYk`).
- Deleted stacks in order: `MySiteApp` (retried once — ACM cert in-use propagation delay) → `MySiteCert` → `MySiteData` → `MySiteDns` → `CDKToolkit` (after emptying the versioned bootstrap assets bucket + ECR repo).

### GitHub
- Deleted variable `DEPLOY_STAGING` (first, to stop staging auto-deploy) and the remaining `AWS_STAGE_*` / `CDK_STAGE_*` secrets/variables.

## Consequences
- Admin regression coverage dropped (it was staging-only; no safe destructive-test target against prod). Documented in git-workflow.md.
- Pre Deploy Checklist is now marked by Claude pre-merge (was auto-marked by the staging job).

## Verification
- `cdk synth` before/after diff: production templates identical (asset hashes aside).
- `tsc` build passes; no functional staging identifiers remain in live code.
- Post-merge prod Deploy runs green (CDK diff shows no infra change; only a benign Lambda image asset update).
- Stage account empty: no CloudFormation stacks, S3 buckets, RDS, Cognito pools, EC2, ECS, or Route 53 zones.
