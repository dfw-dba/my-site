# Plan: Feature Reduction — Resume-Only Site

## Context
The site currently has four feature areas: Resume, Personal (photo albums), Showcase (projects), and Blog. The goal is to strip everything except Resume, making this a resume-only site. The admin Dashboard page stays but with hardcoded "Under Construction" replacing its current stats/drafts/quick-actions content.

## Scope Summary

**KEEP:** Resume (public + admin), Dashboard (gutted), Health endpoint, core infrastructure (auth, DB, layouts, theme, social icons)

**REMOVE:** Personal, Showcase, Blog, Media/Albums — all routes, pages, components, API endpoints, DB functions, DB tables, seed data, tests, and S3/MinIO infrastructure

---

## Step 1: Frontend — Remove public pages & components

### Delete files:
- `frontend/src/pages/PersonalLife.tsx`
- `frontend/src/pages/Album.tsx`
- `frontend/src/pages/Showcase.tsx`
- `frontend/src/pages/Blog.tsx`
- `frontend/src/pages/BlogPost.tsx`
- `frontend/src/pages/DataShowcase.tsx`
- `frontend/src/components/BlogCard.tsx`
- `frontend/src/components/ShowcaseCard.tsx`
- `frontend/src/components/PhotoGallery.tsx`
- `frontend/src/components/MarkdownRenderer.tsx` (only used by BlogPost + BlogEditForm)
- `frontend/src/components/ProfilePlaceholder.tsx` (check usage first — may be unused)

### Edit `frontend/src/routes/index.tsx`:
- Remove imports for deleted pages + admin pages (BlogEditor, BlogEditForm, ShowcaseEditor, ShowcaseEditForm, MediaManager)
- Remove routes: `/personal`, `/personal/album/:slug`, `/showcase`, `/showcase/blog`, `/showcase/blog/:slug`, `/showcase/data`
- Remove admin routes: `blog`, `blog/new`, `blog/:slug`, `showcase`, `showcase/new`, `showcase/:slug`, `media`
- Keep: index (`Resume`), admin index (`Dashboard`), `admin/resume` (`ResumeEditor`)

### Edit `frontend/src/components/HamburgerMenu.tsx`:
- Remove Personal link and entire Showcase section with sub-items
- Keep just the Resume link

---

## Step 2: Frontend — Remove admin pages & sidebar items

### Delete files:
- `frontend/src/pages/admin/BlogEditor.tsx`
- `frontend/src/pages/admin/BlogEditForm.tsx`
- `frontend/src/pages/admin/ShowcaseEditor.tsx`
- `frontend/src/pages/admin/ShowcaseEditForm.tsx`
- `frontend/src/pages/admin/MediaManager.tsx`
- `frontend/src/components/admin/StatCard.tsx` (only used by Dashboard, which is being gutted)

### Edit `frontend/src/pages/admin/Dashboard.tsx`:
- Replace entire content with hardcoded "Under Construction" message
- Remove all imports (useAdminBlogPosts, useAdminShowcaseItems, useAdminAlbums, StatCard, Link)

### Edit `frontend/src/components/admin/AdminSidebar.tsx`:
- Remove NAV_ITEMS for Blog, Showcase, and Media
- Keep only Dashboard and Resume

---

## Step 3: Frontend — Clean up API, types, and hooks

### Edit `frontend/src/services/api.ts`:
- Remove `blog`, `showcase`, `albums` from the public `api` object
- Remove `admin.blog`, `admin.showcase`, `admin.media`, `admin.albums` from the admin object
- Remove unused type imports

### Edit `frontend/src/types/index.ts`:
- Remove interfaces: BlogPostListItem, BlogPostsResponse, BlogPost, ShowcaseItem, MediaItem, Album, AlbumDetail, AdminBlogPostListItem, AdminBlogPostsResponse, AdminMediaItem, AdminMediaResponse, BlogPostCreate, ShowcaseItemCreate, UploadUrlRequest, UploadUrlResponse, MediaRegister, AlbumCreate

### Edit `frontend/src/hooks/useApi.ts`:
- Remove: useBlogPosts, useBlogPost, useShowcaseItems, useShowcaseItem, useAlbums, useAlbum
- Keep: useResume, useTimeline

### Edit `frontend/src/hooks/useAdminApi.ts`:
- Remove all Blog, Showcase, Media, and Albums sections
- Keep only Resume section

---

## Step 4: Frontend — Remove tests

### Delete test files:
- `frontend/tests/components/ShowcaseCard.test.tsx`
- `frontend/tests/components/BlogCard.test.tsx`
- `frontend/tests/components/MarkdownRenderer.test.tsx`
- `frontend/tests/components/PhotoGallery.test.tsx`
- `frontend/tests/pages/Blog.test.tsx`
- `frontend/tests/pages/Showcase.test.tsx`
- `frontend/tests/pages/PersonalLife.test.tsx`
- `frontend/tests/pages/BlogPost.test.tsx`
- `frontend/tests/admin/BlogEditor.test.tsx`
- `frontend/tests/admin/ShowcaseEditor.test.tsx`
- `frontend/tests/admin/MediaManager.test.tsx`
- `frontend/tests/admin/Dashboard.test.tsx` (rewrite with "Under Construction" assertion)

### Update `frontend/tests/components/HamburgerMenu.test.tsx`:
- Update to reflect only the Resume link remaining

---

## Step 5: Backend — Remove routers

### Delete files:
- `backend/src/app/routers/blog.py`
- `backend/src/app/routers/showcase.py`
- `backend/src/app/routers/personal.py`
- `backend/src/app/routers/media.py`

### Edit `backend/src/app/routers/admin.py`:
- Remove all blog, showcase, and media admin endpoints
- Keep only resume endpoints

### Edit `backend/src/app/main.py`:
- Remove imports and `include_router` calls for blog, showcase, personal, media routers
- Keep: health, resume, admin

---

## Step 6: Backend — Clean up schemas, services, dependencies

### Delete files:
- `backend/src/app/schemas/blog.py`
- `backend/src/app/schemas/showcase.py`
- `backend/src/app/schemas/media.py`
- `backend/src/app/services/storage.py`

### Edit `backend/src/app/services/db_functions.py`:
- Remove all blog, showcase, media/album functions
- Keep resume functions only

### Edit `backend/src/app/dependencies.py`:
- Remove `get_storage` function and `StorageService` import

### Edit `backend/src/app/config.py`:
- Remove MINIO_ENDPOINT, MEDIA_BUCKET, MINIO_ROOT_USER, MINIO_ROOT_PASSWORD settings

### Edit `backend/src/app/models/tables.py`:
- Remove BlogPost, ShowcaseItem, Album, MediaItem ORM classes

---

## Step 7: Backend — Remove tests

### Delete test files:
- `backend/tests/test_blog.py`
- `backend/tests/test_showcase.py`
- `backend/tests/test_media.py`

### Edit `backend/tests/test_admin.py`:
- Remove blog, showcase, and media admin test cases

### Edit `backend/tests/test_db_functions.py`:
- Remove blog, showcase, and media DB function tests

### Edit `backend/tests/conftest.py`:
- Remove any fixtures for blog, showcase, media, or storage

---

## Step 8: Database — Remove non-resume objects

### Edit `database/init/02_tables.sql`:
- Remove table definitions: `showcase_items`, `blog_posts`, `albums`, `media_items`

### Edit `database/init/03_functions.sql`:
- Remove all blog, showcase, media/album functions
- Keep resume functions only

### Edit `database/init/05_seed_data.sql`:
- Remove blog posts, showcase items, and albums seed data

---

## Step 9: Infrastructure — Remove MinIO

### Edit `docker-compose.yml`:
- Remove the `minio` service entirely
- Remove `minio-data` volume
- Remove `minio: condition: service_healthy` from backend's `depends_on`

### Edit `.env` (or `.env.example` if it exists):
- Remove MINIO_* environment variables

---

## Verification

1. **Backend lint**: `cd backend && uv run ruff check && uv run ruff format --check`
2. **Backend tests**: `cd backend && uv run pytest`
3. **Frontend TypeScript**: `cd frontend && npx tsc --noEmit`
4. **Frontend tests**: `cd frontend && npx vitest run`
5. **No dead routes**: Visiting `/personal`, `/showcase`, `/showcase/blog` returns 404
