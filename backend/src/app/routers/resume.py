from typing import Any

from fastapi import APIRouter, Depends

from src.app.dependencies import get_db_api
from src.app.services.db_functions import DatabaseAPI

router = APIRouter()


@router.get("/")
async def get_resume(db: DatabaseAPI = Depends(get_db_api)) -> Any:
    """Return the full resume (sections + entries)."""
    return await db.get_resume()


@router.get("/timeline")
async def get_timeline(db: DatabaseAPI = Depends(get_db_api)) -> Any:
    """Return resume entries as a chronological timeline."""
    return await db.get_professional_timeline()
