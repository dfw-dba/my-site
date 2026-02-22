from typing import Any

from fastapi import APIRouter, Depends, Query

from src.app.dependencies import get_db_api
from src.app.services.db_functions import DatabaseAPI

router = APIRouter()


@router.get("/posts")
async def list_posts(
    tag: str | None = Query(None, description="Filter by tag"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """List published blog posts with optional tag filter."""
    return await db.get_blog_posts(tag=tag, limit=limit, offset=offset)


@router.get("/posts/{slug}")
async def get_post(slug: str, db: DatabaseAPI = Depends(get_db_api)) -> Any:
    """Get a single blog post by slug."""
    return await db.get_blog_post(slug)
