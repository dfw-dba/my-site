# Admin Portal Regression Test Suite

**Branch**: `feature/admin-regression-tests`
**Status**: Planning

## Context

The existing regression tests (`regression-test.sh`) only cover public endpoints and auth enforcement. The user wants a comprehensive test suite that exercises every admin portal action — login, profile image upload, CRUD for professional entries, performance reviews, recommendations, resume sections, and log management. Tests must be idempotent (clean data before/after) and the public resume page must load without errors. Admin regression tests run **staging only**; production keeps existing public-endpoint tests.

## Auth Strategy

**Staging-only API key**: Add `REGRESSION_TEST_API_KEY` env var to the **staging** Lambda only. Add `X-Regression-Key` header support in `dependencies.py` — checked before Cognito, so it short-circuits JWT verification. The key is stored as a GitHub Secret and never set on the production Lambda.

## Changes

### 1. Add `REGRESSION_TEST_API_KEY` setting
**File:** `backend/src/app/config.py`

- Add `REGRESSION_TEST_API_KEY: str = ""` to the `Settings` class (line 33, after `ADMIN_API_KEY`)

### 2. Add regression key auth path in `get_admin_auth()`
**File:** `backend/src/app/dependencies.py`

- At the top of `get_admin_auth()` (before the Cognito check on line 65), add:
  - Check if `settings.REGRESSION_TEST_API_KEY` is non-empty
  - Check if `request.headers.get("X-Regression-Key")` matches it
  - If match: `logger.warning("Regression test key used")` and return `"regression-test"`
  - If header present but wrong value: raise 401 immediately (don't fall through)
  - If header absent: proceed to existing Cognito/API-key logic unchanged

### 3. Add `X-Regression-Key` to CORS allowed headers
**File:** `backend/src/app/middleware/cors.py` (line 14)

- Add `"X-Regression-Key"` to the `allow_headers` list

**File:** `infrastructure/cdk/lib/app-stack.ts` (line 309)

- Add `"X-Regression-Key"` to the `allowHeaders` array in API Gateway CORS config

### 4. Add `REGRESSION_TEST_API_KEY` to staging Lambda env vars
**File:** `infrastructure/cdk/lib/app-stack.ts` (line 246-258)

- Add `REGRESSION_TEST_API_KEY` to the Lambda `environment` block, but **only when `isStaging` is true**. Use a conditional spread or ternary: `...(isStaging ? { REGRESSION_TEST_API_KEY: process.env.REGRESSION_TEST_API_KEY || '' } : {})`
- The value comes from `process.env.REGRESSION_TEST_API_KEY` which is set by the deploy workflow from the GitHub Secret

### 5. Pass secret to staging CDK deploy step
**File:** `.github/workflows/deploy.yml`

- In the staging `CDK deploy: Phase 2` step (around line 177), add env var:
  ```yaml
  REGRESSION_TEST_API_KEY: ${{ secrets.REGRESSION_TEST_API_KEY }}
  ```
- Also add to the staging `CDK diff` step for consistency

### 6. Create admin regression test script
**File:** `.github/scripts/regression-test-admin.sh` (new)

Script structure:
```
Phase 0: PREFLIGHT
  - Validate: API_URL, DOMAIN_NAME, REGRESSION_TEST_API_KEY
  - Set AUTH_HEADER="X-Regression-Key: ${REGRESSION_TEST_API_KEY}"
  - Verify auth: GET /api/admin/logs/stats (expect 200)
  - If auth fails, abort immediately

Phase 1: CLEANUP (idempotent wipe)
  - GET /api/resume/ → extract all entry IDs
  - DELETE /api/admin/resume/entry/{id} for each
  - POST /api/admin/resume/recommendations {"items": []}
  - POST /api/admin/resume/title {"title": ""}
  - POST /api/admin/resume/summary {"headline": "", "text": "empty"}
  - POST /api/admin/resume/contact {"linkedin": null, "github": null, "email": null}

Phase 2: RESUME SECTION TESTS
  Test 01: Set resume title → verify via GET /api/resume/
  Test 02: Set resume summary → verify via GET /api/resume/
  Test 03: Set contact info → verify via GET /api/resume/contact
  Test 04: Upload profile image (minimal 1x1 PNG via printf hex) → verify response

Phase 3: PROFESSIONAL ENTRY CRUD
  Test 05: Create work entry → capture ID, verify via GET /api/resume/
  Test 06: Create education entry → capture ID
  Test 07: Create certification entry → capture ID
  Test 08: Create award entry → capture ID
  Test 09: Create hobby entry → capture ID
  Test 10: Update work entry (change title) → verify updated

Phase 4: PERFORMANCE REVIEW CRUD
  Test 11: Create performance review on work entry → capture ID, verify
  Test 12: Update performance review → verify
  Test 13: Delete performance review → verify gone

Phase 5: RECOMMENDATIONS
  Test 14: Add recommendations → verify via GET /api/resume/

Phase 6: LOGS ENDPOINTS
  Test 15: GET /api/admin/logs?limit=5 → verify structure
  Test 16: GET /api/admin/logs/stats → verify structure
  Test 17: GET /api/admin/logs/threats?days=7 → verify structure
  Test 18: POST /api/admin/logs/purge {"days": 365} → verify success

Phase 7: DELETE & CLEANUP
  Test 19-23: Delete all 5 professional entries → verify success
  Test 24: Clear recommendations → verify empty

Phase 8: PUBLIC VERIFICATION
  Test 25: GET /api/resume/ → verify clean state (no entries)
  Test 26: Frontend loads → curl CloudFront, check for HTML
  Test 27: Resume page loads → curl /resume path, check for HTML

Phase 9: AUTH ENFORCEMENT (negative tests)
  Test 28: Admin endpoint rejects missing auth → expect 401
  Test 29: Admin endpoint rejects bad key → expect 401
```

Key design patterns:
- Reuse `run_test()` pattern from existing `regression-test.sh`
- Add `skip_test()` for dependency-aware skipping (if create fails, skip update/delete)
- All test data prefixed with `REGTEST` for easy identification
- Output to `/tmp/admin-regression-results.md`
- Minimal 1x1 PNG generated via `printf` hex escapes (no external files)
- `trap` ensures cleanup runs even on early exit

### 7. Integrate into deploy workflow (staging only)
**File:** `.github/workflows/deploy.yml`

- Add new step in `stage-post-deploy-validation` job after existing regression test (after line 252):
  ```yaml
  - name: Run admin regression tests
    id: admin-regression
    env:
      API_URL: ${{ needs.deploy-stage-frontend.outputs.api-url }}
      DOMAIN_NAME: ${{ vars.CDK_STAGE_DOMAIN_NAME }}
      REGRESSION_TEST_API_KEY: ${{ secrets.REGRESSION_TEST_API_KEY }}
    run: |
      chmod +x .github/scripts/regression-test-admin.sh
      .github/scripts/regression-test-admin.sh "Stage"

  - name: Comment admin regression results on PR
    if: always() && steps.find-pr.outputs.skip != 'true'
    env:
      GH_TOKEN: ${{ github.token }}
    run: |
      if [[ -f /tmp/admin-regression-results.md ]]; then
        gh pr comment "${{ steps.find-pr.outputs.pr-number }}" \
          --body-file /tmp/admin-regression-results.md
      fi
  ```
- Update the "Fail if any validation failed" step to also check `steps.admin-regression.outcome`

### 8. GitHub Secret setup (manual, not code)

- Create `REGRESSION_TEST_API_KEY` secret in the repository with a strong 64-character random hex string
- This is documented in the PR but not automated

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/src/app/config.py` | Edit | Add `REGRESSION_TEST_API_KEY` setting |
| `backend/src/app/dependencies.py` | Edit | Add `X-Regression-Key` auth check before Cognito |
| `backend/src/app/middleware/cors.py` | Edit | Add `X-Regression-Key` to allowed headers |
| `infrastructure/cdk/lib/app-stack.ts` | Edit | Add CORS header + staging-only Lambda env var |
| `.github/workflows/deploy.yml` | Edit | Pass secret to CDK + add admin regression step |
| `.github/scripts/regression-test-admin.sh` | Create | Full admin regression test script (~29 tests) |

## Verification

1. **Local backend tests**: `cd backend && uv run pytest` — ensure auth change doesn't break existing tests
2. **CDK synth**: `cd infrastructure/cdk && npx cdk synth` — verify stack compiles
3. **Script lint**: `shellcheck .github/scripts/regression-test-admin.sh`
4. **End-to-end**: Deploy to staging, verify admin regression tests pass in the `stage-post-deploy-validation` job
5. **Production unaffected**: Verify production Lambda does NOT have `REGRESSION_TEST_API_KEY` set, and `X-Regression-Key` header returns 401 in production
