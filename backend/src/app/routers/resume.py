from typing import Any

from fastapi import APIRouter, Depends, Request

from src.app.dependencies import get_db_api
from src.app.middleware.rate_limit import limiter
from src.app.services.db_functions import DatabaseAPI

router = APIRouter()


@router.get("/")
@limiter.limit("60/minute")
async def get_resume(request: Request, db: DatabaseAPI = Depends(get_db_api)) -> Any:
    """Return the full resume (sections + entries)."""
    return await db.get_resume()


@router.get("/contact")
@limiter.limit("60/minute")
async def get_contact_info(request: Request, db: DatabaseAPI = Depends(get_db_api)) -> Any:
    """Return contact links (linkedin, github, email, etc.)."""
    return await db.get_contact_info()


@router.get("/timeline")
@limiter.limit("60/minute")
async def get_timeline(request: Request, db: DatabaseAPI = Depends(get_db_api)) -> Any:
    """Return resume entries as a chronological timeline."""
    return await db.get_professional_timeline()
