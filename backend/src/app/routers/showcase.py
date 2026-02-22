from typing import Any

from fastapi import APIRouter, Depends, Query

from src.app.dependencies import get_db_api
from src.app.services.db_functions import DatabaseAPI

router = APIRouter()


@router.get("/")
async def list_showcase_items(
    category: str | None = Query(None, description="Filter by category"),
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """List all showcase/portfolio items."""
    return await db.get_showcase_items(category=category)


@router.get("/{slug}")
async def get_showcase_item(slug: str, db: DatabaseAPI = Depends(get_db_api)) -> Any:
    """Get a single showcase item by slug."""
    return await db.get_showcase_item(slug)
