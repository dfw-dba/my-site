from pydantic import BaseModel


class BlogPostCreate(BaseModel):
    """Schema for creating/updating a blog post via admin API."""

    slug: str
    title: str
    excerpt: str | None = None
    content: str  # markdown
    tags: list[str] = []
    published: bool = False
    showcase_item_id: int | None = None
