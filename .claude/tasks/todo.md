# Personal Website / PWA — Implementation Tracker

_Completed sprints are archived in `todo-archive.md`. Only the last 3 completed sprints are kept here for context._

---

## Sprint 47: Automated GeoLite2 Data Refresh

### Database
- [x] 47.1 Create migration `007_geoip_refresh.sql` (staging schema, tables, swap function, update log)

### Docker
- [x] 47.2 Create `docker/geoip-update/Dockerfile` (Python 3.12-slim with psycopg + boto3)
- [x] 47.3 Create `docker/geoip-update/update.py` (download, COPY, atomic swap script)

### Infrastructure
- [x] 47.4 Add ECS cluster, task definition, security group, EventBridge rule, log group to `data-stack.ts`
- [x] 47.5 Bump CDK migration version 16 → 17 in `data-stack.ts`

### Documentation
- [x] 47.6 Update README.md (architecture diagram, cost estimate, GeoIP section, project structure)

### Verification
- [x] 47.7 CDK TypeScript compiles
- [x] 47.8 Backend lint + tests pass (41/41)
- [x] 47.9 Security audit: 4 MEDIUM + 1 LOW fixed (zip-slip, SQL identifiers, root container, unpinned deps, search_path)

---

## Sprint 48: CDK-managed MaxMind Secret

### Rules
- [x] 48.1 Add CDK-managed secrets rule + style examples + verification to `aws-cdk.md`

### Infrastructure
- [x] 48.2 Replace `fromSecretNameV2` with `new Secret()` in `data-stack.ts`

### Documentation
- [x] 48.3 Update README GeoIP prerequisites (create-secret → put-secret-value)

### Verification
- [x] 48.4 CDK TypeScript compiles (`npx tsc --noEmit`)
- [x] 48.5 No `fromSecretNameV2` references in infrastructure/
- [x] 48.6 Security audit: no CRITICAL/HIGH/MEDIUM; 1 LOW (placeholder empty strings — expected)

---

## Sprint 49: Fix MaxMind Download Redirect

### Implementation
- [x] 49.1 Add `_NoAuthRedirectHandler` class that strips Authorization on redirect
- [x] 49.2 Extract `_maxmind_auth_header()` helper to deduplicate auth logic
- [x] 49.3 Update `check_last_modified()` to use opener + auth helper
- [x] 49.4 Update `download_and_extract()` to use opener + auth helper
- [x] 49.5 Move `urllib.request` and `base64` to top-level imports

### Verification
- [x] 49.6 Python syntax check passes
- [x] 49.7 Docker image builds successfully

---

## Notes
- DB port mapped to 5433 on host (5432 in use by local PostgreSQL)
- `uv` installed at ~/.local/bin/uv
- CLAUDE.md and tasks/ live in `.claude/` directory
