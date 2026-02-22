from typing import Any

from fastapi import APIRouter, Depends, Query

from src.app.dependencies import get_db_api
from src.app.services.db_functions import DatabaseAPI

router = APIRouter()


@router.get("/albums")
async def list_albums(
    category: str | None = Query(None, description="Filter by category"),
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """List personal photo albums."""
    return await db.get_albums(category=category)


@router.get("/albums/{slug}")
async def get_album(slug: str, db: DatabaseAPI = Depends(get_db_api)) -> Any:
    """Get a single album with its media items."""
    return await db.get_album_with_media(slug)
