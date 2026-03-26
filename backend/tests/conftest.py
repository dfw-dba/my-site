"""Shared pytest fixtures for the backend test suite."""

import os

# Set test admin API key before settings module is imported
os.environ.setdefault("ADMIN_API_KEY", "local-dev-admin-key")

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from src.app.dependencies import get_db_api, get_storage
from src.app.main import create_app
from src.app.services.db_functions import DatabaseAPI
from src.app.services.storage import StorageService

# ── Real database fixtures (for stored procedure tests) ──────────────────────

TEST_DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://mysite:localdev@localhost:5432/mysite",
)


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Async session connected to the Docker PostgreSQL.

    Each test runs inside a transaction that is rolled back, keeping the database clean.
    """
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.connect() as conn:
        trans = await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)
        try:
            yield session
        finally:
            await session.close()
            await trans.rollback()
    await engine.dispose()


@pytest.fixture
def db_api(db_session: AsyncSession) -> DatabaseAPI:
    """DatabaseAPI instance backed by the real test database session."""
    return DatabaseAPI(db_session)


# ── Mock fixtures (for router / HTTP tests) ──────────────────────────────────


@pytest.fixture
def mock_db_api() -> AsyncMock:
    """Fully mocked DatabaseAPI with sensible default return values."""
    mock = AsyncMock(spec=DatabaseAPI)

    # Resume defaults
    mock.get_resume.return_value = {"sections": [], "entries": {}}
    mock.get_professional_timeline.return_value = []
    mock.upsert_professional_entry.return_value = {"success": True}
    mock.upsert_resume_title.return_value = {"success": True}
    mock.upsert_resume_summary.return_value = {"success": True}
    mock.upsert_resume_contact.return_value = {"success": True}
    mock.replace_resume_recommendations.return_value = {"count": 0, "success": True}
    mock.delete_professional_entry.return_value = {"success": True}
    mock.upsert_performance_review.return_value = {"success": True}
    mock.delete_performance_review.return_value = {"success": True}
    mock.upsert_resume_profile_image.return_value = {"success": True}

    # Log defaults
    mock.insert_app_log.return_value = {"id": 1, "success": True}
    mock.get_app_logs.return_value = {"logs": [], "total": 0}
    mock.get_app_log_stats.return_value = {
        "total_24h": 0,
        "errors_24h": 0,
        "warnings_24h": 0,
        "avg_duration_ms": 0,
    }
    mock.purge_app_logs.return_value = {"deleted": 0, "success": True}

    return mock


@pytest.fixture
def mock_storage() -> MagicMock:
    """Mocked StorageService for upload tests."""
    mock = MagicMock(spec=StorageService)
    mock.upload_file.return_value = "https://example.com/media/profile/profile-image.jpg"
    return mock


@pytest.fixture
def app():
    """Create a fresh FastAPI application for testing."""
    return create_app()


@pytest.fixture
async def client(app, mock_db_api) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client with mocked dependencies (no auth header)."""
    app.dependency_overrides[get_db_api] = lambda: mock_db_api

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def admin_client(app, mock_db_api) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client with mocked dependencies AND admin auth header.

    Uses API key fallback (COGNITO_USER_POOL_ID is empty by default in tests).
    """
    app.dependency_overrides[get_db_api] = lambda: mock_db_api

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        headers={"X-Admin-Key": "local-dev-admin-key"},
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def admin_upload_client(app, mock_db_api, mock_storage) -> AsyncGenerator[AsyncClient, None]:
    """Admin client with both DB and storage mocked — for file upload tests."""
    app.dependency_overrides[get_db_api] = lambda: mock_db_api
    app.dependency_overrides[get_storage] = lambda: mock_storage

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        headers={"X-Admin-Key": "local-dev-admin-key"},
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
