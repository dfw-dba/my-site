from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from src.app.dependencies import get_admin_auth, get_db_api, get_storage
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


@router.post("/resume/title", dependencies=[Depends(get_admin_auth)])
async def upsert_resume_title(
    body: ResumeTitleCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update the resume title."""
    return await db.upsert_resume_title(body.model_dump())


@router.post("/resume/summary", dependencies=[Depends(get_admin_auth)])
async def upsert_resume_summary(
    body: ResumeSummaryCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update the resume summary."""
    return await db.upsert_resume_summary(body.model_dump())


@router.post("/resume/contact", dependencies=[Depends(get_admin_auth)])
async def upsert_resume_contact(
    body: ResumeContactCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update the resume contact info."""
    return await db.upsert_resume_contact(body.model_dump())


@router.post("/resume/recommendations", dependencies=[Depends(get_admin_auth)])
async def replace_resume_recommendations(
    body: ResumeRecommendationsReplace,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Replace all resume recommendations."""
    return await db.replace_resume_recommendations([item.model_dump() for item in body.items])


_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
_EXT_MAP = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


@router.post("/resume/profile-image", dependencies=[Depends(get_admin_auth)])
async def upload_profile_image(
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
    if len(file_data) > _MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 5 MB.",
        )

    ext = _EXT_MAP[file.content_type]
    key = f"profile/profile-image.{ext}"
    url = storage.upload_file(file_data, key, file.content_type)

    await db.upsert_resume_profile_image({"image_url": url})

    return {"success": True, "image_url": url}
