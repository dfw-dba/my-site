# Fix Lambda → RDS Database Connection

## Context

The site deployed to AWS but returns "API error: 500" because the Lambda function can't connect to RDS. The backend's `DATABASE_URL` defaults to `postgresql+asyncpg://postgres:postgres@localhost:5432/mysite` (local dev). CDK grants Lambda read access to the Secrets Manager secret at `/mysite/db-credentials` and boto3 is already a dependency, but no code fetches the secret or constructs a production connection string.

## Plan

### 1. Add Secrets Manager integration to `backend/src/app/config.py`

Add a `resolve_database_url()` function that:
- Checks if `DATABASE_URL` is explicitly set as an env var (local dev override) — if so, use it directly
- If not set and not running in Lambda (`AWS_LAMBDA_FUNCTION_NAME` absent), return the local default
- If running in Lambda, read the secret name from `DB_SECRET_NAME` env var, fetch credentials from Secrets Manager using boto3, and construct the asyncpg connection string with URL-encoded password and `?ssl=require`

The secret at `/mysite/db-credentials` contains:
```json
{"username": "mysite", "password": "...", "host": "...", "port": 5432, "dbname": "mysite"}
```

The function is called at module init to set the `DATABASE_URL` default on the `Settings` class. This keeps local dev working unchanged (no boto3 call, no AWS credentials needed).

### 2. Add `DB_SECRET_NAME` env var to Lambda (CDK)

In `infrastructure/cdk/lib/app-stack.ts`, add `DB_SECRET_NAME: "/mysite/db-credentials"` to the Lambda environment variables so the secret name isn't hardcoded in Python.

## Files Modified

| File | Change |
|------|--------|
| `backend/src/app/config.py` | Added `resolve_database_url()` using boto3 Secrets Manager |
| `infrastructure/cdk/lib/app-stack.ts` | Added `DB_SECRET_NAME` to Lambda environment |

## Verification

1. `cd backend && uv run ruff check && uv run ruff format --check` — passed
2. `cd backend && uv run pytest` — 23 passed
3. `cd frontend && npx tsc --noEmit && npx vitest run` — 22 passed
4. Push branch, wait for CI, then deploy
5. Check `curl -s https://api.jasonrowland.me/api/resume` returns 200
6. Check Lambda logs for successful DB connection
