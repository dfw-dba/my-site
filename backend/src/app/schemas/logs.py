from pydantic import BaseModel, Field


class PurgeLogs(BaseModel):
    """Schema for the log purge request."""

    days: int = Field(ge=1, le=365)
