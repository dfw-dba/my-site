# Personal Website / PWA — Implementation Tracker

_Completed sprints are archived in `todo-archive.md`. Only the last 3 completed sprints are kept here for context._

---

## Sprint 35: Dashboard IP Filter & Log Detail Heading
- [x] 35.1 SQL: Add `client_ip` filter to `get_app_logs` and `get_threat_detections` functions
- [x] 35.2 Migration: Create `004_add_client_ip_filter.sql`
- [x] 35.3 CDK: Bump migration version to "9"
- [x] 35.4 Backend: Add `client_ip` query param to `/logs` and `/logs/threats` endpoints
- [x] 35.5 Frontend API: Pass `client_ip` in API calls
- [x] 35.6 Frontend hooks: Accept `client_ip` in filter types
- [x] 35.7 Dashboard: IP filter state, clickable IPs, clear button, "Log Detail" heading
- [x] 35.8 Verification: lint, type check, all tests pass

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

## Notes
- DB port mapped to 5433 on host (5432 in use by local PostgreSQL)
- `uv` installed at ~/.local/bin/uv
- CLAUDE.md and tasks/ live in `.claude/` directory
