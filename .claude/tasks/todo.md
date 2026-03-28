# Personal Website / PWA — Implementation Tracker

_Completed sprints are archived in `todo-archive.md`. Only the last 3 completed sprints are kept here for context._

---

## Sprint 36: Fix GitHub Actions Node.js 20 Deprecation

- [x] 36.1 Upgrade `actions/checkout` v4 → v5 across ci, deploy-stage, deploy-prod
- [x] 36.2 Upgrade `actions/setup-node` v4 → v5 across ci, deploy-stage, deploy-prod
- [x] 36.3 Upgrade `aws-actions/configure-aws-credentials` v4 → v5 in deploy-stage, deploy-prod
- [x] 36.4 Upgrade `actions/setup-python` v5 → v6 in ci
- [x] 36.5 Upgrade `astral-sh/setup-uv` v4 → v5 in ci
- [x] 36.6 Upgrade `amannn/action-semantic-pull-request` v5 → v6 in lint-pr

---

## Sprint 37: Resilient CDK Deployment

### Phase A — Safe, additive changes
- [x] 37.1 Create pre-flight validation script — `.github/scripts/preflight-check.sh`
- [x] 37.2 Add pre-flight, cleanup, and two-phase deploy to staging workflow — `.github/workflows/deploy-stage.yml`
- [x] 37.3 Add pre-flight, cleanup, and two-phase deploy to prod workflow — `.github/workflows/deploy-prod.yml`
- [x] 37.4 Add delegation set vs in-zone NS callout to docs — `docs/aws-setup.md`

### Phase B — Conditional bucket naming
- [x] 37.5 Add `autoGenerateBucketNames` config property — `infrastructure/cdk/config/index.ts`
- [x] 37.6 Conditional bucket names + Purpose/Environment tags — `infrastructure/cdk/lib/app-stack.ts`
- [x] 37.7 Pass `CDK_AUTO_BUCKET_NAMES` env var in both workflows — `.github/workflows/deploy-stage.yml`, `.github/workflows/deploy-prod.yml`
- [x] 37.8 Document `CDK_AUTO_BUCKET_NAMES` in setup docs — `docs/aws-setup.md`

### Documentation & Verification
- [x] 37.9 Update README with pre-flight check, two-phase deploy, bucket naming — `README.md`
- [x] 37.10 Add delegation set lesson — `.claude/tasks/lessons.md`
- [x] 37.11 CDK synth verification (both `CDK_AUTO_BUCKET_NAMES=true` and `false`)

---

## Sprint 38: Security Hardening for Public Repo

### CRITICAL fixes
- [x] 38.1 Remove hardcoded `"local-dev-admin-key"` default from `backend/src/app/config.py`
- [x] 38.2 Remove hardcoded `"local-dev-admin-key"` fallback from `frontend/src/services/api.ts`
- [x] 38.3 Replace `unsafeUnwrap()` with Secrets Manager runtime fetch in migration Lambda
  - [x] 38.3a Update CDK `data-stack.ts`: pass `DB_SECRET_ARN` env var, grant secret read, add Secrets Manager VPC endpoint
  - [x] 38.3b Update migration handler `index.py`: fetch password from Secrets Manager at runtime
  - [x] 38.3c Bump migration version in `data-stack.ts` (10 → 11)

### HIGH fixes
- [x] 38.4 Disable execute-api default endpoint in `app-stack.ts`
- [x] 38.5 Add CloudFront security response headers policy in `app-stack.ts`
- [x] 38.6 Enable API Gateway access logging in `app-stack.ts`

### MEDIUM fixes
- [x] 38.7 Remove Cognito implicit OAuth flow in `data-stack.ts`
- [x] 38.8 Remove `aws.cognito.signin.user.admin` scope from Cognito client
- [x] 38.9 Enable Cognito deletion protection in `data-stack.ts`
- [x] 38.10 Enable S3 media bucket versioning in `app-stack.ts`

### LOW fixes
- [x] 38.11 Restrict S3 CORS `allowedHeaders` in `app-stack.ts`
- [x] 38.12 Run `npm audit fix` in frontend (remaining vulns are build-time transitive deps in vite-plugin-pwa)

### Verification
- [x] 38.13 CDK TypeScript compiles, no `DB_PASSWORD` in source (cdk.out is gitignored)
- [x] 38.14 Backend lint + tests pass (41/41)
- [x] 38.15 Frontend type check + tests pass (25/25)
- [x] 38.16 Grep confirms no `"local-dev-admin-key"` outside test fixtures and `.env.example`

---

## Sprint 39: Pre-Public Security Audit & Hardening

- [x] 39.1 Delete all 38 old plan files from `.claude/tasks/plans/`
- [x] 39.2 Add Content-Security-Policy header to CloudFront response headers policy in `app-stack.ts`
- [x] 39.3 Add architecture decision comments for Lambda public subnets in `app-stack.ts` and `data-stack.ts`
- [x] 39.4 Scope S3 media bucket permissions: `grantReadWrite` → `grantRead` + `grantPut` in `app-stack.ts`
- [x] 39.5 Document RDS IAM wildcard trade-off with comment in `app-stack.ts`
- [x] 39.6 Verification: TypeScript compiles, backend tests pass (41/41), frontend tests pass (25/25)
- [x] 39.7 Post-public: Enable branch protection on `main`
- [x] 39.8 Post-public: Add production environment protection rules

---

## Notes
- DB port mapped to 5433 on host (5432 in use by local PostgreSQL)
- `uv` installed at ~/.local/bin/uv
- CLAUDE.md and tasks/ live in `.claude/` directory
