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


class ResumeTitleCreate(BaseModel):
    """Schema for creating/updating the resume title."""

    title: str


class ResumeSummaryCreate(BaseModel):
    """Schema for creating/updating the resume summary."""

    headline: str | None = None
    text: str


class ResumeContactCreate(BaseModel):
    """Schema for creating/updating the resume contact info."""

    linkedin: str | None = None
    github: str | None = None
    email: str | None = None


class ResumeRecommendationItem(BaseModel):
    """A single recommendation entry."""

    author: str
    title: str
    text: str


class ResumeRecommendationsReplace(BaseModel):
    """Schema for replacing all recommendations."""

    items: list[ResumeRecommendationItem]
