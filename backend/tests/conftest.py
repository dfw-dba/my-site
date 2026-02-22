"""Shared pytest fixtures for the backend test suite."""

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from src.app.dependencies import get_db_api, get_storage
from src.app.main import create_app
from src.app.services.db_functions import DatabaseAPI


# ── Real database fixtures (for stored procedure tests) ──────────────────────

TEST_DATABASE_URL = "postgresql+asyncpg://mysite:localdev@localhost:5433/mysite"


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
    mock.upsert_resume_section.return_value = {"success": True}
    mock.delete_professional_entry.return_value = {"success": True}

    # Blog defaults
    mock.get_blog_posts.return_value = {"posts": [], "total": 0, "limit": 20, "offset": 0}
    mock.get_blog_post.return_value = {"slug": "test", "title": "Test", "content": "body"}
    mock.upsert_blog_post.return_value = {"success": True}
    mock.delete_blog_post.return_value = {"success": True}

    # Showcase defaults
    mock.get_showcase_items.return_value = []
    mock.get_showcase_item.return_value = {"slug": "test", "title": "Test"}
    mock.upsert_showcase_item.return_value = {"success": True}
    mock.delete_showcase_item.return_value = {"success": True}

    # Media/Albums defaults
    mock.get_albums.return_value = []
    mock.get_album_with_media.return_value = {"slug": "test", "title": "Test", "media": []}
    mock.register_media.return_value = {"success": True}
    mock.upsert_album.return_value = {"success": True}
    mock.delete_album.return_value = {"success": True}

    return mock


@pytest.fixture
def mock_storage() -> MagicMock:
    """Mocked StorageService."""
    mock = MagicMock()
    mock.generate_upload_url.return_value = "https://minio.test/presigned-upload-url"
    mock.generate_download_url.return_value = "https://minio.test/presigned-download-url"
    return mock


@pytest.fixture
def app():
    """Create a fresh FastAPI application for testing."""
    return create_app()


@pytest.fixture
async def client(app, mock_db_api, mock_storage) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client with mocked dependencies (no auth header)."""
    app.dependency_overrides[get_db_api] = lambda: mock_db_api
    app.dependency_overrides[get_storage] = lambda: mock_storage

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def admin_client(app, mock_db_api, mock_storage) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client with mocked dependencies AND admin auth header."""
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
