import logging
import os
from collections.abc import AsyncGenerator

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.config import settings
from src.app.database import async_session_factory
from src.app.services.db_functions import DatabaseAPI
from src.app.services.storage import StorageService

logger = logging.getLogger(__name__)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session, ensuring it is closed after use."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_db_api(
    session: AsyncSession = Depends(get_db_session),
) -> AsyncGenerator[DatabaseAPI, None]:
    """Yield a DatabaseAPI instance wrapping the current session."""
    yield DatabaseAPI(session)


def get_storage() -> StorageService:
    """Return a StorageService instance."""
    return StorageService()


# Lazily initialised Cognito verifier (created on first use when configured)
_cognito_verifier = None


def _get_cognito_verifier():
    global _cognito_verifier
    if _cognito_verifier is None:
        from src.app.services.cognito import CognitoJWTVerifier

        _cognito_verifier = CognitoJWTVerifier(
            region=settings.COGNITO_REGION,
            user_pool_id=settings.COGNITO_USER_POOL_ID,
            app_client_id=settings.COGNITO_APP_CLIENT_ID,
        )
    return _cognito_verifier


async def get_admin_auth(request: Request) -> dict | str:
    """Authenticate admin requests.

    When Cognito is configured (COGNITO_USER_POOL_ID is set), expects
    Authorization: Bearer <id_token> and returns decoded JWT claims.

    When Cognito is not configured, falls back to X-Admin-Key header
    and returns the API key string.
    """
    if settings.COGNITO_USER_POOL_ID:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid Authorization header",
            )
        token = auth_header[7:]  # Strip "Bearer "
        try:
            verifier = _get_cognito_verifier()
            claims = verifier.verify_token(token)
        except Exception as exc:
            logger.warning("Token validation failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            ) from exc
        return claims

    # In production (Lambda), Cognito must be configured — never fall back to API key
    if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication not configured",
        )

    # Fallback: API key auth for local dev
    api_key = request.headers.get("X-Admin-Key", "")
    if api_key != settings.ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin API key",
        )
    return api_key
