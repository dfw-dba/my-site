# Plan: Cognito Auth Integration

## Branch: `feature/cognito-auth`

## Backend Changes

1. **`backend/pyproject.toml`** — Add `PyJWT[crypto]>=2.8.0`
2. **`backend/src/app/config.py`** — Add `COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID`, `COGNITO_REGION` settings
3. **`backend/src/app/services/cognito.py`** (new) — `CognitoJWTVerifier` class: fetch JWKS, verify RS256 JWT tokens
4. **`backend/src/app/dependencies.py`** — Dual-mode auth: Bearer token (Cognito) or X-Admin-Key fallback
5. **`backend/tests/test_cognito.py`** (new) — Unit tests for verifier + dependency
6. Update `backend/tests/conftest.py` — Ensure admin_client works with both auth modes

## Frontend Changes

1. **`frontend/package.json`** — Add `amazon-cognito-identity-js`
2. **`frontend/src/services/auth.ts`** (new) — Cognito SDK wrapper: signIn, signOut, getIdToken, session management
3. **`frontend/src/hooks/useAuth.ts`** (new) — Auth state hook
4. **`frontend/src/contexts/AuthContext.tsx`** (new) — React context provider
5. **`frontend/src/pages/admin/Login.tsx`** (new) — Login page with MFA + new-password flows
6. **`frontend/src/components/admin/ProtectedRoute.tsx`** (new) — Route guard
7. **`frontend/src/routes/index.tsx`** — Wrap admin routes with ProtectedRoute
8. **`frontend/src/services/api.ts`** — Async adminHeaders with Bearer token support
9. **`frontend/src/main.tsx`** — Add AuthProvider
10. **`frontend/src/types/index.ts`** — Add AuthState interface
11. **`frontend/tests/admin/Login.test.tsx`** (new) — Login component tests
12. **`frontend/tests/admin/ProtectedRoute.test.tsx`** (new) — Route guard tests

## Environment Variables

- `.env.example`: Add Cognito vars (commented out)
- No Cognito vars set → API key fallback (local dev works unchanged)

## Verification

- `cd backend && uv run ruff check && uv run ruff format --check`
- `cd backend && uv run pytest`
- `cd frontend && npx tsc --noEmit`
- `cd frontend && npx vitest run`
