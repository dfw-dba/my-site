# Plan: Automate DB migration + Make init scripts idempotent

## Context

The RDS IAM auth code changes are already committed on `feature/rds-iam-auth` (PR #43). However, the plan included manual SQL migration steps (create `lambda_iam` user, alter functions to `SECURITY DEFINER`). All deployment must be automated through GitHub Actions — no manual steps allowed.

Additionally, the SQL init scripts (`database/init/0*.sql`) need to be idempotent so they're safe to re-run.

## Approach: CDK Custom Resource in DataStack

A Lambda-backed CDK custom resource in DataStack runs the migration SQL automatically during `cdk deploy`. This ensures correct ordering: DataStack (RDS + migration) completes before AppStack (Lambda using `lambda_iam`).

The migration Lambda connects to RDS using the master credentials, which are passed as env vars via CloudFormation dynamic references (`{{resolve:secretsmanager:...}}`). This means the Lambda never calls Secrets Manager at runtime — no VPC endpoint needed.

## Changes

### 1. Make `02_tables.sql` idempotent — `database/init/02_tables.sql`
- Add `IF NOT EXISTS` to all three `CREATE TABLE` statements
- Comments (`COMMENT ON`) are idempotent by nature (they overwrite)

### 2. Make `04_permissions.sql` idempotent + RDS-safe — `database/init/04_permissions.sql`
- Wrap `grant rds_iam to lambda_iam` in a conditional DO block:
  ```sql
  do $$
  begin
      if exists (select 1 from pg_roles where rolname = 'rds_iam') then
          execute 'grant rds_iam to lambda_iam';
      end if;
  end
  $$;
  ```
- This makes the script safe in both local/CI (no `rds_iam` role) and RDS (has `rds_iam`)

### 3. Make `05_seed_data.sql` idempotent — `database/init/05_seed_data.sql`
- Wrap each INSERT block in a "only if table is empty" check using `select ... from (values ...) where not exists`
- Same pattern for `professional_entries`, `performance_reviews`, and `resume_sections`

### 4. Create migration Lambda handler — `infrastructure/cdk/lib/migration-handler/index.py`
- Python handler using `pg8000` (pure Python PostgreSQL driver, no compiled deps)
- Reads `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` from env vars
- Executes idempotent migration SQL statements individually via `pg8000.native.Connection.run()`:
  - Create `lambda_iam` user (DO block with IF NOT EXISTS)
  - Grant `rds_iam` to `lambda_iam` (conditional on rds_iam role existing)
  - Create `app_user` role if not exists
  - Grant `app_user` to `lambda_iam`
- On Delete event: no-op (don't drop user on stack deletion)
- SSL enabled via `ssl.create_default_context()`
- Note: Functions already have `security definer` in `03_functions.sql` — no ALTER needed

### 5. CDK DataStack: Add migration custom resource — `infrastructure/cdk/lib/data-stack.ts`
- New imports: `lambda`, `custom-resources`, `path`
- Create migration Lambda security group (allowAllOutbound: true)
- Add ingress rule: DB SG allows migration Lambda SG on port 5432
- Create Lambda function:
  - Runtime: Python 3.12
  - Code: `fromAsset()` with Docker bundling to install `pg8000`
  - VPC: same VPC, public subnets, `allowPublicSubnet: true`
  - Env vars: DB credentials via `dbInstance.secret!.secretValueFromJson().unsafeUnwrap()`
  - Timeout: 2 minutes
- Create `cr.Provider` with `onEventHandler` → migration Lambda
- Create `cdk.CustomResource` with version property (change to trigger re-run)

### 6. Update PR description — remove manual migration steps
- All test plan items should be automated/verifiable

## Files to modify/create

| File | Action |
|------|--------|
| `database/init/02_tables.sql` | Edit: add `IF NOT EXISTS` |
| `database/init/04_permissions.sql` | Edit: conditional `rds_iam` grant |
| `database/init/05_seed_data.sql` | Edit: conditional inserts |
| `infrastructure/cdk/lib/migration-handler/index.py` | **Create**: Lambda handler |
| `infrastructure/cdk/lib/data-stack.ts` | Edit: add custom resource |

## Verification
- `cd backend && uv run ruff check && uv run ruff format --check` — passes
- `cd backend && uv run pytest` — passes
- `cd frontend && npx tsc --noEmit && npx vitest run` — passes
- `cd infrastructure/cdk && npx tsc --noEmit` — passes
- CI pipeline passes on PR push
- After merge + deploy: `curl https://api.jasonrowland.me/api/resume/` returns JSON
