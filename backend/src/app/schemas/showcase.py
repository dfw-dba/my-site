from pydantic import BaseModel


class ShowcaseItemCreate(BaseModel):
    """Schema for creating/updating a showcase item via admin API."""

    slug: str
    title: str
    description: str | None = None
    content: str | None = None  # detailed markdown
    category: str  # data-engineering, web, devops, etc.
    technologies: list[str] = []
    demo_url: str | None = None
    repo_url: str | None = None
    sort_order: int = 0
