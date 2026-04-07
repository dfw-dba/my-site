# AWS Database Insights Advanced with Feature Toggle System

**Branch**: `feature/database-insights-advanced`
**Status**: Planning

## Context

The project runs RDS PostgreSQL 17 (t4g.micro) with pg_stat_statements and auto_explain already configured. AWS Database Insights Advanced adds anomaly detection, recommendations, and 15-month Performance Insights retention on top of this existing data. The user wants this controlled by a JSON config file so it can be independently toggled per environment (staging/production) and deployed without running the full 6-job deploy pipeline.

## Changes

### 1. Create feature toggles config file
**File(s):** `infrastructure/cdk/config/features.json`

- New JSON file with `staging` and `production` sections
- Each section has `databaseInsightsAdvanced: boolean` (both default `false`)
- Checked into the repo — no secrets, just feature flags

```json
{
  "staging": {
    "databaseInsightsAdvanced": false
  },
  "production": {
    "databaseInsightsAdvanced": false
  }
}
```

### 2. Integrate features config into CDK config
**File(s):** `infrastructure/cdk/config/index.ts`

- Add `fs`/`path` imports
- Add `FeatureToggles` and `FeaturesConfig` interfaces
- Add `loadFeatures()` function that reads `features.json` and selects the environment based on `CDK_IS_STAGING`
- Add `features` property to the exported `config` object
- Uses `fs.readFileSync` (standard for CDK synth-time config)

### 3. Enable Database Insights Advanced on RDS conditionally
**File(s):** `infrastructure/cdk/lib/data-stack.ts`

CDK has first-class support via `DatabaseInsightsMode.ADVANCED`. When the toggle is enabled, add these properties to the DatabaseInstance:

```typescript
enablePerformanceInsights: true,
performanceInsightRetention: rds.PerformanceInsightRetention.MONTHS_15,  // 465 days, required for Advanced
databaseInsightsMode: rds.DatabaseInsightsMode.ADVANCED,
```

When the toggle is disabled, these properties are omitted (CDK defaults = no PI, no insights mode).

Add `DatabaseInsightsMode` import from `aws-cdk-lib/aws-rds`. Note: `DatabaseInsightsMode` is exported from `./database-insights-mode` within the rds module — import it alongside existing rds imports.

### 4. Create feature toggle deploy workflow
**File(s):** `.github/workflows/toggle-features.yml`

Lightweight workflow_dispatch workflow that:
- Accepts `environment` input: `staging`, `production`, or `both`
- Only deploys `MySiteData` stack (no DNS, cert, frontend, or validation)
- Shows `cdk diff` before deploying for auditability
- Logs active feature config values
- Uses same OIDC credentials and action SHAs as `deploy.yml`:
  - `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd` (v6.0.2)
  - `aws-actions/configure-aws-credentials@8df5847569e6427dd6c4fb1cf565c83acfa8afa7` (v6.0.0)
  - `actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f` (v6.3.0)
- Two jobs: `deploy-staging` and `deploy-production`
  - "both" runs staging first, then production (staging failure blocks production)
  - "production" skips staging entirely
  - "staging" skips production

Env vars per job match the main deploy workflow:
- Staging: `CDK_DOMAIN_NAME=${{ vars.CDK_STAGE_DOMAIN_NAME }}`, `CDK_ACCOUNT_ID=${{ secrets.AWS_STAGE_ACCOUNT_ID }}`, `CDK_IS_STAGING=true`, `CDK_BUDGET_EMAIL`, `CDK_AUTO_BUCKET_NAMES`
- Production: `CDK_DOMAIN_NAME=${{ vars.CDK_DOMAIN_NAME }}`, `CDK_ACCOUNT_ID=${{ secrets.AWS_ACCOUNT_ID }}`, `CDK_BUDGET_EMAIL`

### 5. Update README.md
**File(s):** `README.md`

- Add Database Insights Advanced to the tech stack / features section
- Document `features.json` config file and how to toggle features
- Document the Toggle Features workflow
- Update cost estimate section (PI Advanced on t4g.micro ≈ $5-6/month)

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `infrastructure/cdk/config/features.json` | Create | Feature toggle config with per-environment sections |
| `infrastructure/cdk/config/index.ts` | Edit | Add features loader, interfaces, and `features` property |
| `infrastructure/cdk/lib/data-stack.ts` | Edit | Conditional Database Insights Advanced properties on RDS instance |
| `.github/workflows/toggle-features.yml` | Create | Lightweight workflow for feature-only deploys |
| `README.md` | Edit | Document feature toggles, new workflow, cost update |

## Cost

Database Insights Advanced on t4g.micro (2 vCPUs):
- Performance Insights with 15-month retention: ~$5-6/month
- Anomaly detection/recommendations: included with PI at no extra charge
- Disabling is instant — flip toggle to `false` and redeploy; historical data is lost

## Verification

1. **Synth with toggle off**: `CDK_IS_STAGING=true npx cdk synth MySiteData` — verify no `EnablePerformanceInsights` in template
2. **Synth with toggle on**: Set `features.json` staging to `true`, re-synth — verify `EnablePerformanceInsights: true`, `PerformanceInsightRetentionPeriod: 465`, `DatabaseInsightsMode: advanced`
3. **Production isolation**: Verify staging=true + production=false produces correct templates for each environment
4. **Workflow validation**: Trigger toggle-features workflow with "staging", verify only MySiteData deploys
5. **Post-deploy**: Confirm Performance Insights active in AWS Console → RDS → Database Insights
