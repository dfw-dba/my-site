# Automated GeoLite2 Data Refresh

**Branch**: `feature/geoip-auto-update`
**Status**: Planning

## Context

GeoLite2 geo-IP data is currently loaded manually via `\copy` commands through the bastion host. MaxMind updates this data twice weekly (Tuesdays and Fridays) and requires users to refresh within 30 days. The manual process means data goes stale and relies on human intervention. This plan automates the download and load with zero-downtime table swaps so `api.geoip_lookup()` never returns nulls during refresh.

## Architecture

```
EventBridge (Wed + Sat 06:00 UTC)
  |
  v
ECS Fargate Task (public subnet, assignPublicIp: ENABLED)
  |
  +-- Internet access: download ZIP from MaxMind (Basic Auth)
  +-- VPC access: connect to RDS via security group
  |
  Steps (single container):
  1. HEAD check Last-Modified (skip if unchanged)
  2. Download ZIP, extract 3 CSVs to /tmp
  3. TRUNCATE staging tables
  4. COPY FROM STDIN for each CSV (psycopg3)
  5. Build GiST index + PK on staging tables
  6. Atomic rename swap (microseconds)
  7. ANALYZE new tables
  8. Log success to geoip_update_log
```

**Why ECS Fargate over Lambda**: Single container with both internet and VPC access (public subnet + public IP). No S3 staging, no Step Functions, no two-Lambda split. Uses `psycopg` with `COPY FROM STDIN` protocol for fast bulk loading (~4M rows in under 2 minutes). No 10-minute timeout constraint.

**Why public subnet**: Avoids NAT Gateway (~$32/mo). Fargate tasks with `assignPublicIp: ENABLED` in public subnets get both internet access and VPC-internal routing to RDS. Matches the project's existing cost-optimization pattern.

**MaxMind API auth**: Uses license keys with HTTP Basic Auth — no MFA. MFA is only for the web portal. The license key is generated once in the portal and used for all automated downloads.

## Zero-Downtime Swap Strategy

1. Load data into `staging.geoip2_networks` and `staging.geoip2_locations` (no locks on production)
2. Build GiST index and PK on staging tables (still no production locks)
3. In a single transaction:
   - Rename `internal.geoip2_networks` → `geoip2_networks_old`
   - Rename `internal.geoip2_locations` → `geoip2_locations_old`
   - Move staging tables into `internal` schema (they now have the production names)
4. Drop old tables, recreate empty staging tables for next run

The rename is a metadata-only operation (microseconds). `api.geoip_lookup()` resolves table names at execution time (PL/pgSQL), so it seamlessly picks up the new tables. No nulls, no blocking.

## Changes

### 1. Database migration: staging infrastructure
**File(s):** `database/migrations/007_geoip_refresh.sql`

- Create `staging` schema
- Create `staging.geoip2_networks` and `staging.geoip2_locations` (mirrors of production, no indexes — built dynamically before each swap)
- Create `internal.geoip_swap_staging()` function that performs the atomic rename swap and recreates empty staging tables
- Create `internal.geoip_update_log` table (timestamp, row counts, duration, source last-modified)
- Grant permissions to master user on staging schema

### 2. GeoIP update container
**File(s):** `docker/geoip-update/Dockerfile`, `docker/geoip-update/update.py`

Minimal Python container:
- **Base image**: `python:3.12-slim`
- **Dependencies**: `psycopg[binary]`, `boto3` (for Secrets Manager)
- **Script `update.py`**:
  - Fetch DB password from Secrets Manager (env: `DB_SECRET_ARN`)
  - Fetch MaxMind credentials from Secrets Manager (env: `MAXMIND_SECRET_ARN`)
  - HEAD request to `https://download.maxmind.com/geoip/databases/GeoLite2-City-CSV/download?suffix=zip` to check `Last-Modified`
  - Compare with last update in `internal.geoip_update_log`
  - If unchanged, exit early (log "no update needed")
  - Download ZIP (~50-60 MB), extract to `/tmp`
  - Connect to RDS with SSL
  - TRUNCATE staging tables
  - `COPY FROM STDIN` for locations (en only), networks IPv4, networks IPv6
  - Build GiST index + composite PK on staging tables
  - Call `internal.geoip_swap_staging()` in a transaction
  - `ANALYZE` new production tables
  - Insert row into `internal.geoip_update_log`
  - Exit 0 on success, exit 1 on failure (CloudWatch logs capture output)

### 3. CDK infrastructure
**File(s):** `infrastructure/cdk/lib/data-stack.ts`

New constructs (all in DataStack):
- **ECS Cluster**: Minimal cluster (no EC2 capacity — Fargate only)
- **Task Definition**: Fargate, 0.5 vCPU, 1 GB memory (minimum for task). Container from `docker/geoip-update/`. Environment: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`, `DB_SECRET_ARN`, `MAXMIND_SECRET_ARN`
- **Security Group**: New SG for Fargate task, DB ingress rule on port 5432
- **MaxMind secret reference**: `Secret.fromSecretNameV2()` for `/mysite/maxmind-credentials`
- **IAM**: Task execution role (pull image, write logs) + task role (read both secrets from Secrets Manager via VPC endpoint)
- **EventBridge Rule**: Cron `WED,SAT 06:00 UTC` targeting ECS Fargate task. Uses `events-targets.EcsTask` with `assignPublicIp: true`, public subnets, and the task's security group
- **CloudWatch Log Group**: `/mysite/geoip-update` with 14-day retention
- **Bump migration version** from `"16"` to `"17"`

New CDK imports: `aws-ecs`, `aws-logs`

### 4. README update
**File(s):** `README.md`

- Update GeoIP Setup section: document automated refresh, note manual `\copy` only needed for initial load
- Add MaxMind secret to deployment prerequisites
- Update architecture diagram (add ECS Fargate task)
- Update cost estimate
- Note manual trigger: `aws ecs run-task` command for ad-hoc refreshes

## Manual Prerequisite (One-Time)

Create the MaxMind secret before first deploy:
```bash
aws secretsmanager create-secret \
  --name /mysite/maxmind-credentials \
  --secret-string '{"account_id":"YOUR_ID","license_key":"YOUR_KEY"}'
```

For staging, create it in the staging account as well.

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `database/migrations/007_geoip_refresh.sql` | Create | Staging schema, tables, swap function, update log |
| `docker/geoip-update/Dockerfile` | Create | Minimal Python 3.12-slim with psycopg + boto3 |
| `docker/geoip-update/update.py` | Create | Download, COPY, atomic swap script |
| `infrastructure/cdk/lib/data-stack.ts` | Edit | Add ECS cluster, task def, SG, EventBridge rule, log group, bump migration |
| `README.md` | Edit | Document automated refresh, MaxMind secret, architecture |

## Cost Impact

| Resource | Monthly Cost |
|----------|-------------|
| Fargate task (0.5 vCPU, 1 GB, ~5 min x 8/mo) | ~$0.03 |
| ECR image storage | ~$0.01 |
| CloudWatch Logs (14-day retention) | < $0.01 |
| Secrets Manager (1 new secret) | $0.40 |
| **Total** | **~$0.45/month** |

No NAT Gateway, no new VPC endpoints (Secrets Manager endpoint already exists). Essentially free.

## Risks and Mitigations

- **Fargate cold start**: First task invocation pulls the Docker image (~100 MB). Subsequent runs use cached layers. Total run time ~5 min including download + COPY + index build.
- **RDS CPU spike during COPY**: t4g.micro will spike during bulk load + index build. Mitigated by 06:00 UTC scheduling (low-traffic window).
- **Failed mid-load**: Staging tables contain partial data. Next run truncates staging first. Container exits non-zero, visible in CloudWatch.
- **MaxMind rate limit**: 30 downloads/day. HEAD checks don't count. At 8 runs/month we're well within limits.
- **Secrets Manager access from Fargate**: Uses the existing VPC endpoint. Task role granted read access to both secrets.

## Verification

1. `cdk synth` — confirm no synthesis errors with new constructs
2. Deploy to staging — verify migration creates staging schema and tables
3. Manual trigger: `aws ecs run-task --cluster mysite-geoip --task-definition mysite-geoip-update --launch-type FARGATE --network-configuration ...`
4. Check CloudWatch logs for: download status, row counts, swap duration
5. Query: `SELECT * FROM internal.geoip_update_log ORDER BY updated_at DESC LIMIT 1`
6. Query: `SELECT api.geoip_lookup('8.8.8.8')` — should return Google DNS location
7. Trigger again immediately — should skip (data unchanged, Last-Modified check)
8. Verify `internal.page_views` inserts still populate geo columns during and after refresh
