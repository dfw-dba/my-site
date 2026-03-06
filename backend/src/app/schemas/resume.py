from datetime import date

from pydantic import BaseModel


class ResumeEntryCreate(BaseModel):
    """Schema for creating/updating a professional entry via admin API."""

    id: int | None = None
    entry_type: str  # work, education, certification, award
    title: str
    organization: str
    location: str | None = None
    start_date: date
    end_date: date | None = None
    description: str | None = None
    highlights: list[str] = []
    technologies: list[str] = []
    sort_order: int = 0


class PerformanceReviewCreate(BaseModel):
    """Schema for creating/updating a performance review via admin API."""

    id: int | None = None
    entry_id: int
    reviewer_name: str
    reviewer_title: str | None = None
    review_date: date | None = None
    review_text: str
    sort_order: int = 0


class ResumeSectionCreate(BaseModel):
    """Schema for creating/updating a resume section via admin API."""

    section_type: str  # summary, contact, recommendations
    content: dict  # JSONB content — structure varies by section_type
