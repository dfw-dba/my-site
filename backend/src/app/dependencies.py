from collections.abc import AsyncGenerator

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.config import settings
from src.app.database import async_session_factory
from src.app.services.db_functions import DatabaseAPI


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


async def get_admin_auth(
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
) -> str:
    """Validate the admin API key from the X-Admin-Key header."""
    if x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin API key",
        )
    return x_admin_key
