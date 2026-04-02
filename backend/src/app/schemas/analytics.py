import json
from typing import Annotated, Literal

from pydantic import BaseModel, Discriminator, Field, Tag, field_validator


class PageViewData(BaseModel):
    """Data for a page view event sent from the frontend tracker."""

    visitor_hash: str = Field(max_length=128)
    session_id: str = Field(max_length=128)
    page_path: str = Field(max_length=2048)
    page_title: str | None = Field(default=None, max_length=512)
    referrer: str | None = Field(default=None, max_length=2048)
    utm_source: str | None = Field(default=None, max_length=256)
    utm_medium: str | None = Field(default=None, max_length=256)
    utm_campaign: str | None = Field(default=None, max_length=256)
    device_type: Literal["desktop", "mobile", "tablet"] | None = None
    browser: str | None = Field(default=None, max_length=256)
    os: str | None = Field(default=None, max_length=256)
    screen_width: int | None = Field(default=None, ge=0, le=10000)
    screen_height: int | None = Field(default=None, ge=0, le=10000)
    language: str | None = Field(default=None, max_length=64)
    timezone: str | None = Field(default=None, max_length=128)


class VisitorEventData(BaseModel):
    """Data for a visitor interaction event."""

    visitor_hash: str = Field(max_length=128)
    session_id: str = Field(max_length=128)
    event_type: Literal["click", "scroll", "print", "visibility_change"]
    event_data: dict | None = None
    page_path: str = Field(max_length=2048)

    @field_validator("event_data")
    @classmethod
    def validate_event_data_size(cls, v: dict | None) -> dict | None:
        if v is not None and len(json.dumps(v)) > 4096:
            msg = "event_data must be under 4KB when serialized"
            raise ValueError(msg)
        return v


class PageViewEvent(BaseModel):
    """A page_view analytics event."""

    type: Literal["page_view"]
    data: PageViewData


class VisitorEvent(BaseModel):
    """A visitor interaction analytics event."""

    type: Literal["event"]
    data: VisitorEventData


def _event_discriminator(v: dict) -> str:
    if isinstance(v, dict):
        return v.get("type", "page_view")
    return getattr(v, "type", "page_view")


AnalyticsEvent = Annotated[
    Annotated[PageViewEvent, Tag("page_view")] | Annotated[VisitorEvent, Tag("event")],
    Discriminator(_event_discriminator),
]
