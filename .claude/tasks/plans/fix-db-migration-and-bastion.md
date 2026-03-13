# Fix Database Schema Deployment + Add Bastion Host

## Context

After PR #43 (IAM auth switch), the API returns 500 with `schema "api" does not exist`. The CDK migration handler only creates the `lambda_iam` user — it never runs the SQL init scripts that create schemas, tables, functions, permissions, and seed data. The database is empty except for the user/role setup.

Additionally, there's no way to connect to the RDS instance for troubleshooting since `publiclyAccessible: false` and no bastion exists.

## Branch: `fix/db-migration-and-bastion`

---

## Part 1: Fix Migration Handler

### Problem
`infrastructure/cdk/lib/migration-handler/index.py` only creates `lambda_iam` user. The 6 SQL files in `database/init/` (schemas, tables, functions, permissions, seed data) are never executed against RDS. They only run in local Docker via volume mount to `/docker-entrypoint-initdb.d`.

### Changes

#### 1. `infrastructure/cdk/lib/migration-handler/index.py` — Rewrite

- Remove the inline SQL that creates `lambda_iam`/`app_user` (this is already in `04_permissions.sql`)
- Add `split_sql_statements(sql_text)` — a simple state-machine parser that respects `$$` dollar-quoting so semicolons inside function bodies / DO blocks don't split incorrectly
- On Create/Update: iterate through SQL files in order (`00_extensions.sql` through `05_seed_data.sql`), read each from bundled `sql/` directory, split into statements, execute each via `conn.run()`
- Add `print()` logging for CloudWatch visibility
- Keep Delete as no-op (existing behavior)
- All SQL is already idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`, `ON CONFLICT`)

#### 2. `infrastructure/cdk/lib/data-stack.ts` — Bundling + version bump

- Add `volumes` to the bundling options to mount `database/init/` into the Docker build container at `/sql-input`
- Extend the bundling command to copy `*.sql` files from `/sql-input` to `/asset-output/sql/`
- Bump custom resource `version: "1"` → `version: "2"` to trigger re-execution on deploy

---

## Part 2: Add Bastion Host

### Design: SSM Session Manager (no SSH keys, no inbound ports)

- **Instance**: t4g.nano (~$3/month), Amazon Linux 2023 ARM64 (SSM agent pre-installed)
- **Security group**: Outbound-only (SSM uses outbound HTTPS to reach SSM endpoints)
- **RDS ingress**: Allow bastion SG → RDS SG on TCP 5432 (same stack, use `addIngressRule`)
- **IAM role**: `AmazonSSMManagedInstanceCore` managed policy
- **UserData**: Install `postgresql16` client for direct psql from the bastion
- **Subnet**: Public (matches existing VPC pattern, enables SSM without VPC endpoints)

### Usage patterns
```bash
# SSM shell into bastion, then psql
aws ssm start-session --target <instance-id> --profile <profile>

# OR: Port forward RDS to localhost for local psql
aws ssm start-session --target <instance-id> \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["<rds-endpoint>"],"portNumber":["5432"],"localPortNumber":["5432"]}' \
  --profile <profile>
```

### Changes

#### 3. `infrastructure/cdk/lib/data-stack.ts` — Add bastion resources

- Import `iam`
- Bastion security group (outbound only)
- RDS SG ingress rule for bastion
- IAM role with SSM managed policy
- EC2 Instance (t4g.nano, AL2023 ARM64, public subnet)
- UserData: `dnf install -y postgresql16`
- CfnOutput for instance ID

---

## Files Modified

| File | Change |
|------|--------|
| `infrastructure/cdk/lib/migration-handler/index.py` | Rewrite: add SQL file execution with dollar-quote-aware splitter |
| `infrastructure/cdk/lib/data-stack.ts` | Update bundling, bump version, add bastion host resources |

## Verification

1. `cd infrastructure/cdk && npx cdk synth` — template generates without errors
2. `cd infrastructure/cdk && npx cdk deploy MySiteData` — deploys migration + bastion
3. Check CloudWatch logs for migration Lambda — all 6 SQL files executed successfully
4. `curl https://api.jasonrowland.me/api/resume/` — returns resume JSON (not 500)
5. `https://jasonrowland.me/` — loads resume data
6. SSM into bastion, psql to RDS, verify `\dn` shows `api` and `internal` schemas
