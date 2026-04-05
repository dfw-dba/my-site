# Fix: MaxMind download fails on redirect (HTTP 400)

**Branch**: `fix/maxmind-download-redirect`
**Status**: Planning

## Context

The GeoIP auto-update ECS task (`docker/geoip-update/update.py`) fails with `HTTP Error 400: Bad Request` when downloading from MaxMind. The HEAD request for `Last-Modified` succeeds, but the GET download fails.

**Root cause**: MaxMind's download endpoint (`download.maxmind.com`) returns a 302 redirect to a presigned S3 URL. Python's `urllib` follows the redirect and carries the `Authorization: Basic ...` header to the redirect target. The S3 presigned URL rejects the extra auth header with HTTP 400.

The HEAD request works because MaxMind responds directly (no redirect for HEAD).

## Changes

### 1. Add redirect handler that strips Authorization header
**File(s):** `docker/geoip-update/update.py`

Add a custom `urllib.request.HTTPRedirectHandler` subclass that removes the `Authorization` header before following redirects. This is a well-known pattern for MaxMind downloads and S3 presigned URLs.

**Implementation**: Create a class `NoAuthRedirectHandler(urllib.request.HTTPRedirectHandler)` that overrides `redirect_request()` to call `super()` then delete the `Authorization` header from the returned request. Use `urllib.request.build_opener(NoAuthRedirectHandler)` instead of `urllib.request.urlopen()` in `download_and_extract()`.

The same fix should also be applied to `check_last_modified()` for consistency, even though HEAD currently doesn't redirect — MaxMind could change this behavior.

**Lines to change:**
- Lines 81-97 (`check_last_modified`): Replace `urllib.request.urlopen(req)` with opener that uses `NoAuthRedirectHandler`
- Lines 115-139 (`download_and_extract`): Same replacement

**Where to place the handler class**: After the imports block (after line 13), define the handler class at module level so both functions can use it. Also move the `import urllib.request` and `import base64` to the top-level imports (lines 1-13) since they're used in multiple functions.

### 2. Consolidate duplicate auth header logic
**File(s):** `docker/geoip-update/update.py`

Both `check_last_modified()` and `download_and_extract()` duplicate the base64 auth header construction. Extract a helper function `_maxmind_auth_header(account_id, license_key) -> str` that returns the `Basic ...` value.

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `docker/geoip-update/update.py` | Edit | Add NoAuthRedirectHandler, consolidate auth helper, fix both functions |

## Verification

1. `python3 -c "import ast; ast.parse(open('docker/geoip-update/update.py').read())"` — syntax check
2. `docker build docker/geoip-update/` — image builds successfully
3. Manual ECS run-task on staging — download completes, data loads into DB
