# Plan: Switch Lambda→RDS auth from Secrets Manager to RDS IAM Authentication

## Problem
Lambda in VPC cannot reach Secrets Manager (no VPC endpoint, no public IP on ENIs).
Site returns 500 errors. Fix: use RDS IAM auth (local SigV4 signing, no network call).

## Changes Made

1. **CDK DataStack** — `iamAuthentication: true` on RDS instance
2. **CDK AppStack** — Remove Secrets Manager references, add `DB_HOST/PORT/USER/NAME` env vars, add `rds-db:connect` IAM policy
3. **Backend config.py** — Build DATABASE_URL from env vars (no password), remove Secrets Manager/boto3 code
4. **Backend database.py** — `do_connect` event listener injects IAM auth token per connection
5. **SQL 03_functions.sql** — `security definer` on all 8 functions (needed because `lambda_iam` has no direct access to `internal` schema)
6. **SQL 04_permissions.sql** — Create `lambda_iam` user with `rds_iam` + `app_user` roles

## Manual Migration (run on existing RDS after `cdk deploy DataStack`)
```sql
create user lambda_iam with login;
grant rds_iam to lambda_iam;
grant app_user to lambda_iam;

alter function api.get_resume() security definer;
alter function api.get_contact_info() security definer;
alter function api.get_professional_timeline() security definer;
alter function api.upsert_professional_entry(jsonb) security definer;
alter function api.upsert_resume_section(jsonb) security definer;
alter function api.delete_professional_entry(int4) security definer;
alter function api.upsert_performance_review(jsonb) security definer;
alter function api.delete_performance_review(int4) security definer;
```

## Deployment Order
1. `cdk deploy DataStack` — enables IAM auth (additive, non-breaking)
2. Run manual SQL migration
3. `cdk deploy AppStack` — deploys new Lambda code + permissions

## Verification
- `curl https://api.jasonrowland.me/api/resume/` returns JSON (not 500)
- `https://jasonrowland.me/` loads resume data
- Admin endpoints still work with Cognito auth
