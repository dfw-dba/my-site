# Personal Website / PWA — Implementation Tracker

_Completed sprints are archived in `todo-archive.md`. Only the last 3 completed sprints are kept here for context._

---

## Sprint 56: Public Visitor Analytics

### Backend
- [x] 56.1 Add public GET endpoints (`/api/analytics/summary`, `/visitors`, `/geo`, `/timeseries`) in `analytics.py`
  - Rate limited 30/min, no auth required
  - Strip `top_sessions`/`return_visitors` from public visitors response
  - Extract shared `_build_analytics_filters` helper

### Frontend
- [x] 56.2 Add `api.analytics.*` public API client in `api.ts` (no auth headers)
- [x] 56.3 Create `useAnalyticsData.ts` with public analytics hooks
- [x] 56.4 Create `Analytics.tsx` page with light/dark theme support
- [x] 56.5 Add `/analytics` route in `routes/index.tsx`
- [x] 56.6 Add "Visitor Analytics" link in `HamburgerMenu.tsx`

### Verification
- [x] 56.7 Backend lint + tests pass (41/41)
- [x] 56.8 Frontend type check + tests pass (25/25)

---

## Sprint 57: Fix Analytics Date Filter + Timezone Support

### Database
- [x] 57.1 Fix date range in all 4 analytics functions: `BETWEEN` -> half-open `>= / <`, add `v_tz` timezone variable
- [x] 57.2 Fix timeseries grouping to use `date(created_at at time zone v_tz)`
- [x] 57.3 Bump CDK migration version 23 -> 24

### Backend
- [x] 57.4 Add `timezone` param to `_build_analytics_filters` in `analytics.py`
- [x] 57.5 Add `timezone` query param to all 4 public analytics endpoints
- [x] 57.6 Add `timezone` query param to all 4 admin analytics endpoints in `admin.py`

### Frontend
- [x] 57.7 Add `timezone` to `AnalyticsFilters` type
- [x] 57.8 Fix `defaultDateRange()` to use local dates (not UTC) in both pages
- [x] 57.9 Send `timezone` from `Intl.DateTimeFormat` in both pages

### Verification
- [x] 57.10 Backend lint + tests pass (41/41)
- [x] 57.11 Frontend type check + tests pass (25/25)

---

## Sprint 58: Remove Staging Environment + Tear Down Stage AWS Account

Plan: `.claude/tasks/plans/2026-06-04-chore-remove-staging-environment.md`

### GitHub Actions
- [x] 58.1 `deploy.yml`: remove 3 staging jobs; `deploy-infra` first with simplified `if:` (3-job prod chain)
- [x] 58.2 `toggle-features.yml`: remove staging job + environment input (production-only)
- [x] 58.3 Delete orphaned staging-only scripts (`regression-test-admin.sh`, `pre-deploy-update-checkboxes.sh`)

### CDK
- [x] 58.4 Strip `isStaging` from `config/index.ts` + `features.json` (production-only)
- [x] 58.5 Strip `isStaging` from `data-stack.ts` (30d backups, deletion protection, RETAIN, drop `-stage` names)
- [x] 58.6 Strip `isStaging` from `app-stack.ts` (RETAIN, prod names, no regression-key injection)

### Docs
- [x] 58.7 README: single-account architecture/diagram + cost table + 3-job CD; remove staging sections
- [x] 58.8 docs/aws-setup.md: remove staging account setup; docs/architecture.md: remove staging note
- [x] 58.9 .claude: git-workflow.md (2 PR sections, 3-job chain), aws-architect.md (remove staging env)

### Verification
- [x] 58.10 `cdk synth` before/after diff: production templates identical (no-op for prod)
- [x] 58.11 `tsc` build passes; no functional staging refs remain in live code

### Review
- Code: removed all staging deploy paths from workflows, all `isStaging` conditionals from CDK (each collapsed to its existing production value), and all staging docs. Production CloudFormation templates are byte-identical (verified via synth diff — only Lambda/Docker asset hashes differ, an artifact of the build context including the edited `.ts` files).
- AWS teardown (`my-site-stage`, us-east-1): disabled Cognito deletion protection, then deleted `MySiteApp` (retried once past an ACM cert in-use propagation delay), `MySiteCert`, `MySiteData`, `MySiteDns`, and `CDKToolkit` (after emptying the versioned bootstrap bucket + ECR repo). Stage account left empty for the owner to close via the AWS console (a member account can't be closed with the member CLI profile).
- GitHub: deleted `DEPLOY_STAGING` (first, to stop staging auto-deploy) and the remaining `AWS_STAGE_*` / `CDK_STAGE_*` secrets/variables.
- Consequence: admin regression coverage dropped (was staging-only, no safe destructive-test target against prod); Pre Deploy Checklist now marked by Claude pre-merge.

---

## Notes
- DB port mapped to 5433 on host (5432 in use by local PostgreSQL)
- `uv` installed at ~/.local/bin/uv
- CLAUDE.md and tasks/ live in `.claude/` directory
