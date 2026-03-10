from typing import Any

from fastapi import APIRouter, Depends

from src.app.dependencies import get_admin_auth, get_db_api
from src.app.schemas.resume import PerformanceReviewCreate, ResumeEntryCreate, ResumeSectionCreate
from src.app.services.db_functions import DatabaseAPI

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


@router.post("/resume/section", dependencies=[Depends(get_admin_auth)])
async def upsert_resume_section(
    body: ResumeSectionCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update a resume section."""
    return await db.upsert_resume_section(body.model_dump())
