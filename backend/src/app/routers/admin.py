import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, status

from src.app.dependencies import get_admin_auth, get_db_api, get_storage
from src.app.middleware.rate_limit import limiter
from src.app.schemas.logs import PurgeLogs
from src.app.schemas.resume import (
    PerformanceReviewCreate,
    ResumeContactCreate,
    ResumeEntryCreate,
    ResumeRecommendationsReplace,
    ResumeSummaryCreate,
    ResumeTitleCreate,
)
from src.app.services.db_functions import DatabaseAPI
from src.app.services.storage import StorageService

router = APIRouter()


# ── Resume ───────────────────────────────────────────────────────────────────


@router.post("/resume/entry", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def upsert_resume_entry(
    request: Request,
    body: ResumeEntryCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update a professional entry."""
    return await db.upsert_professional_entry(body.model_dump())


@router.delete("/resume/entry/{entry_id}", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def delete_resume_entry(
    request: Request,
    entry_id: int,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Delete a professional entry by ID."""
    return await db.delete_professional_entry(entry_id)


@router.post("/resume/review", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def upsert_performance_review(
    request: Request,
    body: PerformanceReviewCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update a performance review."""
    return await db.upsert_performance_review(body.model_dump())


@router.delete("/resume/review/{review_id}", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def delete_performance_review(
    request: Request,
    review_id: int,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Delete a performance review by ID."""
    return await db.delete_performance_review(review_id)


@router.post("/resume/title", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def upsert_resume_title(
    request: Request,
    body: ResumeTitleCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update the resume title."""
    return await db.upsert_resume_title(body.model_dump())


@router.post("/resume/summary", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def upsert_resume_summary(
    request: Request,
    body: ResumeSummaryCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update the resume summary."""
    return await db.upsert_resume_summary(body.model_dump())


@router.post("/resume/contact", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def upsert_resume_contact(
    request: Request,
    body: ResumeContactCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update the resume contact info."""
    return await db.upsert_resume_contact(body.model_dump())


@router.post("/resume/recommendations", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def replace_resume_recommendations(
    request: Request,
    body: ResumeRecommendationsReplace,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Replace all resume recommendations."""
    return await db.replace_resume_recommendations([item.model_dump() for item in body.items])


# ── Logs ───────────────────────────────────────────────────────────────────


@router.get("/logs", dependencies=[Depends(get_admin_auth)])
@limiter.limit("60/minute")
async def get_logs(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
    level: str | None = None,
    search: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> Any:
    """Fetch paginated application logs with optional filters."""
    filters: dict[str, Any] = {"limit": limit, "offset": offset}
    if level:
        filters["level"] = level
    if search:
        filters["search"] = search
    return await db.get_app_logs(filters)


@router.get("/logs/stats", dependencies=[Depends(get_admin_auth)])
@limiter.limit("60/minute")
async def get_log_stats(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Fetch application log stats for the last 24 hours."""
    return await db.get_app_log_stats()


@router.get("/logs/threats", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def get_threat_detections(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
    days: int = Query(default=30, ge=1, le=90),
) -> Any:
    """Fetch detected threat patterns from application logs."""
    return await db.get_threat_detections({"days": days})


@router.post("/logs/purge", dependencies=[Depends(get_admin_auth)])
@limiter.limit("5/minute")
async def purge_logs(
    request: Request,
    body: PurgeLogs,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Delete application logs older than the specified number of days."""
    return await db.purge_app_logs(body.days)


_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
_EXT_MAP = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

_MAGIC_BYTES: dict[str, list[bytes]] = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"],
}


@router.post("/resume/profile-image", dependencies=[Depends(get_admin_auth)])
@limiter.limit("5/minute")
async def upload_profile_image(
    request: Request,
    file: UploadFile,
    db: DatabaseAPI = Depends(get_db_api),
    storage: StorageService = Depends(get_storage),
) -> Any:
    """Upload a profile image to S3 and save the URL to the database."""
    if file.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type: {file.content_type}. Allowed: jpeg, png, webp",
        )

    file_data = await file.read()

    signatures = _MAGIC_BYTES.get(file.content_type, [])
    if not any(file_data.startswith(sig) for sig in signatures):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match declared type.",
        )
    if file.content_type == "image/webp" and file_data[8:12] != b"WEBP":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match declared type.",
        )

    if len(file_data) > _MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 5 MB.",
        )

    ext = _EXT_MAP[file.content_type]
    key = f"media/profile/profile-image.{ext}"
    url = storage.upload_file(file_data, key, file.content_type)

    cache_buster = f"?v={int(time.time())}"
    url_with_version = f"{url}{cache_buster}"
    await db.upsert_resume_profile_image({"image_url": url_with_version})

    return {"success": True, "image_url": url_with_version}
