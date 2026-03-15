# Security Audit — Phase 2 (Medium Severity)

## Context
Phase 1 (critical + high + select medium) shipped in PR #53. Phase 2 covers the remaining 4 medium-severity findings.

## Changes

### M6: DB Backup Retention
- `infrastructure/cdk/lib/data-stack.ts` — `Duration.days(7)` → `Duration.days(30)`

### M4: Pydantic Schema Constraints
- `backend/src/app/schemas/resume.py` — Added `Field(max_length=...)`, `Literal[...]`, `pattern=...`, `ge/le` constraints to all schema fields

### M5: Magic Byte Validation
- `backend/src/app/routers/admin.py` — Added `_MAGIC_BYTES` dict and validation after `file.read()` to verify file content matches declared content-type

### M2: Rate Limiting (slowapi)
- `backend/pyproject.toml` — Added `slowapi>=0.1.9`
- `backend/src/app/middleware/rate_limit.py` — New module: `limiter` + `configure_rate_limiting()`
- `backend/src/app/main.py` — Wire rate limiting after CORS
- All routers decorated: public 60/min, admin 30/min, upload 5/min
- Added `request: Request` param to all handlers for slowapi

### Tests
- `backend/tests/conftest.py` — Added `mock_storage`, `admin_upload_client` fixtures
- `backend/tests/test_admin.py` — 9 new tests (schema validation, magic byte, rate limiter)

## Verification
- 35 backend tests pass
- 22 frontend tests pass
- ruff lint + format clean
- tsc --noEmit clean
