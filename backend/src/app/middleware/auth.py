"""Admin authentication middleware/dependency.

The primary auth dependency lives in `dependencies.py` (get_admin_auth).
This module provides an alternative middleware-style approach if needed.
"""

from fastapi import HTTPException, Request, status

from src.app.config import settings


async def validate_admin_key(request: Request) -> None:
    """Validate the X-Admin-Key header on the incoming request.

    This is a callable that can be used as a FastAPI dependency or
    called directly from middleware.

    Raises:
        HTTPException: 401 if the key is missing or invalid.
    """
    admin_key = request.headers.get("X-Admin-Key")
    if admin_key is None or admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing admin API key",
        )
