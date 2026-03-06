import uuid
from typing import Any

from fastapi import APIRouter, Depends

from src.app.dependencies import get_admin_auth, get_db_api, get_storage
from src.app.schemas.blog import BlogPostCreate
from src.app.schemas.media import AlbumCreate, MediaRegister, UploadUrlRequest, UploadUrlResponse
from src.app.schemas.resume import PerformanceReviewCreate, ResumeEntryCreate, ResumeSectionCreate
from src.app.schemas.showcase import ShowcaseItemCreate
from src.app.services.db_functions import DatabaseAPI
from src.app.services.storage import StorageService

router = APIRouter()


# ── Blog ─────────────────────────────────────────────────────────────────────


@router.get("/blog", dependencies=[Depends(get_admin_auth)])
async def list_blog_posts(
    limit: int = 50,
    offset: int = 0,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """List all blog posts including drafts."""
    return await db.admin_get_blog_posts(limit=limit, offset=offset)


@router.get("/blog/{slug}", dependencies=[Depends(get_admin_auth)])
async def get_blog_post_admin(
    slug: str,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Get a single blog post by slug (any status)."""
    return await db.admin_get_blog_post(slug)


@router.post("/blog", dependencies=[Depends(get_admin_auth)])
async def upsert_blog_post(
    body: BlogPostCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update a blog post."""
    return await db.upsert_blog_post(body.model_dump())


@router.delete("/blog/{slug}", dependencies=[Depends(get_admin_auth)])
async def delete_blog_post(
    slug: str,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Delete a blog post by slug."""
    return await db.delete_blog_post(slug)


# ── Showcase ─────────────────────────────────────────────────────────────────


@router.post("/showcase", dependencies=[Depends(get_admin_auth)])
async def upsert_showcase_item(
    body: ShowcaseItemCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update a showcase item."""
    return await db.upsert_showcase_item(body.model_dump())


@router.delete("/showcase/{slug}", dependencies=[Depends(get_admin_auth)])
async def delete_showcase_item(
    slug: str,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Delete a showcase item by slug."""
    return await db.delete_showcase_item(slug)


# ── Resume ───────────────────────────────────────────────────────────────────


@router.post("/resume/entry", dependencies=[Depends(get_admin_auth)])
async def upsert_resume_entry(
    body: ResumeEntryCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update a professional entry."""
    return await db.upsert_professional_entry(body.model_dump())


@router.delete("/resume/entry/{entry_id}", dependencies=[Depends(get_admin_auth)])
async def delete_resume_entry(
    entry_id: int,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Delete a professional entry by ID."""
    return await db.delete_professional_entry(entry_id)


@router.post("/resume/review", dependencies=[Depends(get_admin_auth)])
async def upsert_performance_review(
    body: PerformanceReviewCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update a performance review."""
    return await db.upsert_performance_review(body.model_dump())


@router.delete("/resume/review/{review_id}", dependencies=[Depends(get_admin_auth)])
async def delete_performance_review(
    review_id: int,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Delete a performance review by ID."""
    return await db.delete_performance_review(review_id)


@router.post("/resume/section", dependencies=[Depends(get_admin_auth)])
async def upsert_resume_section(
    body: ResumeSectionCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update a resume section."""
    return await db.upsert_resume_section(body.model_dump())


# ── Media ────────────────────────────────────────────────────────────────────


@router.get("/media", dependencies=[Depends(get_admin_auth)])
async def list_media(
    limit: int = 50,
    offset: int = 0,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """List all media items."""
    return await db.admin_get_all_media(limit=limit, offset=offset)


@router.post("/media/upload-url", dependencies=[Depends(get_admin_auth)])
async def get_upload_url(
    body: UploadUrlRequest,
    storage: StorageService = Depends(get_storage),
) -> UploadUrlResponse:
    """Generate a presigned upload URL for direct S3/MinIO upload."""
    s3_key = f"uploads/{uuid.uuid4()}/{body.filename}"
    upload_url = storage.generate_upload_url(s3_key, body.content_type)
    return UploadUrlResponse(upload_url=upload_url, s3_key=s3_key)


@router.post("/media/register", dependencies=[Depends(get_admin_auth)])
async def register_media(
    body: MediaRegister,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Register an uploaded media file in the database."""
    return await db.register_media(body.model_dump())


# ── Albums ───────────────────────────────────────────────────────────────────


@router.post("/albums", dependencies=[Depends(get_admin_auth)])
async def upsert_album(
    body: AlbumCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update an album."""
    return await db.upsert_album(body.model_dump())


@router.delete("/albums/{slug}", dependencies=[Depends(get_admin_auth)])
async def delete_album(
    slug: str,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Delete an album by slug."""
    return await db.delete_album(slug)
