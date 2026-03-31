# Fix: Admin Regression Tests Should Leave Data on Staging

## Context

The admin regression test suite deletes all test data after running, leaving the staging site empty. The user wants test data to persist on staging between deploys so the site is visually verifiable. Data should only be wiped at the start of the next deploy (Phase 1 already does this).

## Changes

**File: `.github/scripts/regression-test-admin.sh`**

1. Removed `cleanup()` function and `trap cleanup EXIT` (Phase 1 already wipes data at start)
2. Removed Phase 7 (delete entries and cleanup) entirely
3. Rewrote Phase 8 to verify data IS present (not empty) - renumbered to Phase 7
4. Renumbered Phase 9 (auth enforcement) to Phase 8
5. Updated script header comment

## Result

- Test count drops from ~29 to ~23 (removed 6 delete/cleanup tests)
- Staging site shows REGTEST data between deploys
- Data is wiped at the start of each new deploy run (Phase 1)
