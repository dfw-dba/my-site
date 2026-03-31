# Personal Website / PWA — Implementation Tracker

_Completed sprints are archived in `todo-archive.md`. Only the last 3 completed sprints are kept here for context._

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

## Sprint 40: Combine Deploy Workflows

- [x] 40.1 Create combined `deploy.yml` workflow with 6-job chain
- [x] 40.2 Delete `deploy-stage.yml` and `deploy-prod.yml`
- [x] 40.3 Update `.claude/rules/git-workflow.md` (Deploy Workflows, Prod Deploy Gate, Dependabot)
- [x] 40.4 Update `.claude/agents/aws-architect.md` (2 workflow references)
- [x] 40.5 Update `README.md` (Continuous Deployment, Staging, Production sections)
- [x] 40.6 Verification: YAML syntax, job chain, secrets, no stale references

---

## Sprint 41: Regression Tests & Deploy Lifecycle Automation

### Regression test script
- [x] 41.1 Create `.github/scripts/regression-test.sh` with 7 tests (health, resume x3, admin auth x2, frontend)
- [x] 41.2 Add regression test steps to `stage-post-deploy-validation` job in `deploy.yml`
- [x] 41.3 Add regression test steps to `post-deploy-validation` job in `deploy.yml`

### Deploy lifecycle automation (git-workflow.md)
- [x] 41.4 Add end-of-cycle cleanup to Prod Deploy Gate (dependabot check, switch to main)
- [x] 41.5 Update Dependabot section with CI/deploy monitoring after merge
- [x] 41.6 Add Session Start Checks section (release-please, dependabot, stale branch detection)

### Verification
- [x] 41.7 Verify YAML syntax and job flow logic
- [x] 41.8 Read through full git-workflow.md for end-to-end lifecycle coverage

---

## Sprint 42: Admin Portal Regression Test Suite

### Backend auth changes
- [x] 42.1 Add `REGRESSION_TEST_API_KEY` to `backend/src/app/config.py`
- [x] 42.2 Add `X-Regression-Key` auth path in `backend/src/app/dependencies.py`
- [x] 42.3 Add `X-Regression-Key` to CORS headers in `backend/src/app/middleware/cors.py`

### Infrastructure changes
- [x] 42.4 Add `X-Regression-Key` to API Gateway CORS + staging-only Lambda env var in `app-stack.ts`
- [x] 42.5 Pass `REGRESSION_TEST_API_KEY` secret to staging CDK deploy in `deploy.yml`

### Regression test script
- [x] 42.6 Create `.github/scripts/regression-test-admin.sh` with full admin CRUD tests
- [x] 42.7 Integrate admin regression step into `stage-post-deploy-validation` in `deploy.yml`

### Verification
- [x] 42.8 Backend lint + tests pass (41/41)
- [x] 42.9 CDK TypeScript compiles
- [ ] 42.10 Shellcheck passes on new script (will verify in CI)

---

## Notes
- DB port mapped to 5433 on host (5432 in use by local PostgreSQL)
- `uv` installed at ~/.local/bin/uv
- CLAUDE.md and tasks/ live in `.claude/` directory
