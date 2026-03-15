# Security Audit — Phase 1 Remediation Plan

## Context
Comprehensive security audit identified 16 findings (1 critical, 3 high, 6 medium, 6 low). This plan covers **Phase 1: Critical + High severity fixes** — small, focused changes that ship quickly. Medium/low findings are documented for future phases.

Branch: `cip/security-audit`

---

## Phase 1 Implementation (5 changes)

### 1. C1: Add `token_use` claim validation to JWT verification
- **File**: `backend/src/app/services/cognito.py`
- **What**: After `jwt.decode()` succeeds, check that `claims["token_use"] == "id"`. Reject access tokens.
- **Why**: Without this, a Cognito access token (not an ID token) would pass validation and grant admin access.
- **Status**: DONE

### 2. H1: Restrict CORS methods and headers
- **File**: `backend/src/app/middleware/cors.py`
- **What**: Replace `allow_methods=["*"]` and `allow_headers=["*"]` with explicit lists.
- **Status**: DONE

### 3. H2: Add security headers to nginx config
- **File**: `docker/frontend/nginx.conf`
- **What**: Add X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- **Status**: DONE

### 4. M1: Guard against API key fallback in production
- **File**: `backend/src/app/dependencies.py`
- **What**: When running in Lambda (`AWS_LAMBDA_FUNCTION_NAME` env var), require Cognito configuration. Fail with 500 instead of silently falling back to API key auth.
- **Status**: DONE

### 5. M3: Sanitize auth error messages
- **File**: `backend/src/app/dependencies.py`
- **What**: Replace `f"Invalid token: {exc}"` with generic message. Log detailed error server-side.
- **Status**: DONE

---

## VPC Endpoint Investigation Results (for future H3 fix)

Lambda accesses 3 AWS services:
| Service | Access Method | VPC Endpoint Status |
|---------|--------------|-------------------|
| RDS | Direct TCP (same VPC) | N/A — no endpoint needed |
| Cognito IDP | HTTPS (JWKS fetch) | Already exists in data-stack.ts |
| S3 | boto3 put/delete | **Missing — needs S3 Gateway Endpoint (free)** |

**Conclusion**: Lambda can move to private subnets by adding a single S3 Gateway Endpoint (free, no NAT Gateway needed). This should be a separate infrastructure PR.

---

## Deferred Findings (Future Phases)

### Phase 2 — Medium (next PR)
- M2: Rate limiting with `slowapi`
- M4: Pydantic schema field constraints
- M5: File upload magic byte validation
- M6: Increase DB backup retention to 30 days

### Phase 3 — Infrastructure (separate PR)
- H3: Move Lambda to private subnet + add S3 Gateway Endpoint

### Phase 4 — Low Priority
- L1: Pin GH actions to SHAs
- L2: Remove version from health endpoint
- L3-L6: MFA display, RDS multi-AZ, bastion SSH, README details

---

## Verification

1. `cd backend && uv run ruff check && uv run ruff format --check` — PASSED
2. `cd backend && uv run pytest` — 26 passed
3. `cd frontend && npx tsc --noEmit && npx vitest run` — 22 passed
4. Manual: Send request with Cognito access token → expect 401
5. Manual: `curl -X TRACE` against API → expect 405 (method not allowed by CORS)
6. Manual: `curl -I` frontend → verify security headers present
7. Manual: Unset `COGNITO_USER_POOL_ID` with `AWS_LAMBDA_FUNCTION_NAME` set → expect 500 on admin routes
