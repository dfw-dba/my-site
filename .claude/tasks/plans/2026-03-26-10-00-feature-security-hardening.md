# Security Hardening for Public Repo

**Branch**: `feature/security-hardening`
**Status**: Complete

## Context

Making this repo public. Security audit identified 3 CRITICAL, 6 HIGH, 8 MEDIUM, 4 LOW findings across codebase, AWS infrastructure, and CI/CD. This PR addresses all CRITICAL and HIGH blockers plus the MEDIUM CDK/Cognito items that can be bundled with the infrastructure changes.

Full audit: `/home/jason/.claude/plans/gentle-tumbling-brooks.md`

## Changes

### 1. Remove hardcoded admin API key defaults (CRITICAL-3)
**File(s):** `backend/src/app/config.py`, `frontend/src/services/api.ts`

- Backend: Remove default value for `ADMIN_API_KEY`, raise error in Lambda if unset
- Frontend: Replace `?? "local-dev-admin-key"` with `?? ""`

### 2. Remove `unsafeUnwrap()` — use Secrets Manager at runtime (CRITICAL-1)
**File(s):** `infrastructure/cdk/lib/data-stack.ts`, `infrastructure/cdk/lib/constructs/db-migration.ts` (or equivalent handler)

- Remove `DB_PASSWORD` env var, pass `DB_SECRET_ARN` instead
- Grant migration Lambda `grantRead` on the RDS secret
- Update migration handler to fetch password from Secrets Manager at runtime
- Bump migration version

### 3. Disable execute-api endpoint (HIGH-4)
**File(s):** `infrastructure/cdk/lib/app-stack.ts`

- Set `disableExecuteApiEndpoint: true` on HttpApi

### 4. Add CloudFront security response headers (HIGH-5)
**File(s):** `infrastructure/cdk/lib/app-stack.ts`

- Attach `ResponseHeadersPolicy` with HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy

### 5. Enable API Gateway access logging (HIGH-6)
**File(s):** `infrastructure/cdk/lib/app-stack.ts`

- Create CloudWatch log group for API access logs
- Configure structured JSON access logging on the HTTP API stage

### 6. Fix Cognito OAuth flows & scopes (MEDIUM-9, 10, 11)
**File(s):** `infrastructure/cdk/lib/data-stack.ts`

- Remove implicit OAuth flow
- Remove `aws.cognito.signin.user.admin` scope
- Enable deletion protection on user pool

### 7. Enable S3 media bucket versioning (MEDIUM-12)
**File(s):** `infrastructure/cdk/lib/app-stack.ts`

- Enable versioning on media bucket

### 8. Restrict S3 CORS headers (LOW-19)
**File(s):** `infrastructure/cdk/lib/app-stack.ts`

- Replace `allowedHeaders: ["*"]` with explicit list

### 9. Remove localhost API fallback (LOW-17)
**File(s):** `frontend/src/services/api.ts`

- Already addressed with CRITICAL-3 changes

### 10. Fix npm audit vulnerabilities (HIGH-8)
- Run `npm audit fix` in frontend

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/src/app/config.py` | Edit | Remove default admin API key |
| `frontend/src/services/api.ts` | Edit | Remove hardcoded key fallback |
| `infrastructure/cdk/lib/data-stack.ts` | Edit | Secrets Manager runtime, Cognito fixes, migration version bump |
| `infrastructure/cdk/lib/app-stack.ts` | Edit | Disable execute-api, security headers, access logging, S3 versioning/CORS |
| Migration handler (TBD) | Edit | Read password from Secrets Manager at runtime |
| `frontend/package-lock.json` | Edit | npm audit fix |

## Verification

1. `cd backend && uv run ruff check && uv run ruff format --check`
2. `cd backend && uv run pytest`
3. `cd frontend && npx tsc --noEmit`
4. `cd frontend && npx vitest run`
5. `cd infrastructure/cdk && npx cdk synth` — verify no `DB_PASSWORD` in template
6. `npm audit` — zero high/critical
7. Grep for `"local-dev-admin-key"` — should only appear in `.env.example`
