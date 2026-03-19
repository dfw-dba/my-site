from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class ResumeEntryCreate(BaseModel):
    """Schema for creating/updating a professional entry via admin API."""

    id: int | None = None
    entry_type: Literal["work", "education", "certification", "award"]
    title: str = Field(max_length=200)
    organization: str = Field(max_length=200)
    location: str | None = Field(default=None, max_length=200)
    start_date: date
    end_date: date | None = None
    description: str | None = Field(default=None, max_length=5000)
    highlights: list[Annotated[str, Field(max_length=500)]] = Field(default=[], max_length=50)
    technologies: list[Annotated[str, Field(max_length=100)]] = Field(default=[], max_length=30)
    sort_order: int = Field(default=0, ge=0, le=1000)


class PerformanceReviewCreate(BaseModel):
    """Schema for creating/updating a performance review via admin API."""

    id: int | None = None
    entry_id: int
    reviewer_name: str = Field(max_length=200)
    reviewer_title: str | None = Field(default=None, max_length=200)
    review_date: date | None = None
    review_text: str = Field(max_length=10000)
    sort_order: int = Field(default=0, ge=0, le=1000)


class ResumeTitleCreate(BaseModel):
    """Schema for creating/updating the resume title."""

    title: str = Field(max_length=200)


class ResumeSummaryCreate(BaseModel):
    """Schema for creating/updating the resume summary."""

    headline: str | None = Field(default=None, max_length=200)
    text: str = Field(max_length=5000)


class ResumeContactCreate(BaseModel):
    """Schema for creating/updating the resume contact info."""

    linkedin: str | None = Field(
        default=None, max_length=500, pattern=r"^https://(www\.)?linkedin\.com/.*$"
    )
    github: str | None = Field(
        default=None, max_length=500, pattern=r"^https://(www\.)?github\.com/.*$"
    )
    email: str | None = Field(default=None, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ResumeRecommendationItem(BaseModel):
    """A single recommendation entry."""

    author: str = Field(max_length=200)
    title: str = Field(max_length=200)
    text: str = Field(max_length=5000)
    linkedin_url: str | None = Field(
        default=None, max_length=500, pattern=r"^https://(www\.)?linkedin\.com/.*$"
    )


class ResumeRecommendationsReplace(BaseModel):
    """Schema for replacing all recommendations."""

    items: list[ResumeRecommendationItem] = Field(max_length=50)
