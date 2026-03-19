from fastapi import APIRouter, Request

from src.app._version import __version__
from src.app.middleware.rate_limit import limiter

router = APIRouter()


@router.get("/health", tags=["health"])
@limiter.limit("60/minute")
async def health_check(request: Request) -> dict[str, str]:
    """Basic health check endpoint."""
    return {"status": "healthy", "version": __version__}
