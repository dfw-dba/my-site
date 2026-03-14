# Profile Image Upload & Positioning Fix

## Context
The resume page profile image is hardcoded to `/profile.jpg` (a static asset) and is vertically centered with the summary text, causing the image to appear mid-page rather than top-aligned. The admin editor has no way to upload or manage the profile picture. This plan adds MinIO-backed image upload to the admin editor and fixes the image positioning.

## Changes

### 1. Fix image positioning (frontend only)
**File:** `frontend/src/pages/Resume.tsx`
- Change `items-center` to `items-start` on the header flex container (line 53)
- Replace hardcoded `/profile.jpg` with dynamic URL from `sections.profile_image?.image_url`

### 2. Add MinIO to docker-compose
**File:** `docker-compose.yml`
- Add `minio` service (minio/minio image, ports 9000+9001, volume `minio_data`)
- Add `minio-init` one-shot service using `minio/mc` to create the `media` bucket with public-read policy
- Make `backend` depend on `minio` (healthy)

### 3. Add storage settings to backend config
**File:** `backend/src/app/config.py`
- Add `S3_ENDPOINT`, `MEDIA_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` to Settings

### 4. Create storage service
**File (new):** `backend/src/app/services/storage.py`
- `StorageService` class using boto3 S3 client with `endpoint_url` for MinIO compatibility
- `upload_file(file_data, key, content_type) -> str` — uploads to S3, returns public URL
- `delete_file(key)` — removes from S3
- Public URL: `http://localhost:9000/{bucket}/{key}` for local dev, `https://{bucket}.s3.amazonaws.com/{key}` for prod

**File:** `backend/src/app/dependencies.py`
- Add `get_storage()` dependency

### 5. Database: new table + functions
**File (new):** `database/migrations/002_add_profile_image.sql`
**File:** `database/init/02_tables.sql` (add table for fresh installs)
**File:** `database/init/03_functions.sql` (add function + update `get_resume`)

New single-row table `internal.resume_profile_image`:
- `id int4 generated always as identity primary key`
- `image_url text not null`
- `created_at timestamptz`, `updated_at timestamptz`

New function `api.upsert_resume_profile_image(p_data jsonb)` — follows existing upsert pattern.

Update `api.get_resume()` — add `v_profile_image` section from `internal.resume_profile_image`.

### 6. Backend: DatabaseAPI + upload endpoint
**File:** `backend/src/app/services/db_functions.py`
- Add `upsert_resume_profile_image(data)` method

**File:** `backend/src/app/routers/admin.py`
- Add `POST /resume/profile-image` endpoint using `UploadFile` (multipart)
- Validates file type (jpeg/png/webp) and size (max 5MB)
- Uploads to S3 key `profile/profile-image.{ext}` (overwrites previous)
- Saves URL to DB via stored function
- Returns `{"success": true, "image_url": url}`

### 7. Frontend: API + hook + admin UI
**File:** `frontend/src/services/api.ts`
- Add `uploadProfileImage(file: File)` method using FormData (not JSON)

**File:** `frontend/src/hooks/useAdminApi.ts`
- Add `useAdminUploadProfileImage()` mutation hook

**File:** `frontend/src/pages/admin/ResumeEditor.tsx`
- Add "Profile Image" card in Sections tab (before Title card)
- Hidden file input with button trigger, image preview, upload state feedback

### 8. Update .env.example
**File:** `.env.example`
- Uncomment/add `AWS_ACCESS_KEY_ID=minioadmin`, `AWS_SECRET_ACCESS_KEY=minioadmin`, `S3_ENDPOINT=http://minio:9000`

## File Summary

| File | Action |
|------|--------|
| `frontend/src/pages/Resume.tsx` | Modify — fix alignment + dynamic image URL |
| `docker-compose.yml` | Modify — add MinIO services |
| `backend/src/app/config.py` | Modify — add S3 settings |
| `backend/src/app/services/storage.py` | **Create** — S3/MinIO upload service |
| `backend/src/app/dependencies.py` | Modify — add `get_storage` |
| `database/migrations/002_add_profile_image.sql` | **Create** — migration |
| `database/init/02_tables.sql` | Modify — add table |
| `database/init/03_functions.sql` | Modify — add function + update get_resume |
| `backend/src/app/services/db_functions.py` | Modify — add method |
| `backend/src/app/routers/admin.py` | Modify — add upload endpoint |
| `frontend/src/services/api.ts` | Modify — add upload method |
| `frontend/src/hooks/useAdminApi.ts` | Modify — add upload hook |
| `frontend/src/pages/admin/ResumeEditor.tsx` | Modify — add image upload card |
| `.env.example` | Modify — add S3 credentials |

## Verification
1. `docker compose up` — MinIO starts, bucket created
2. Run migration against local DB
3. `cd backend && uv run ruff check && uv run ruff format --check`
4. `cd frontend && npx tsc --noEmit`
5. `cd backend && uv run pytest`
6. `cd frontend && npx vitest run`
7. Manual: upload image via admin editor, verify it appears on resume page top-aligned
