"""Tests for the media endpoints."""

from unittest.mock import AsyncMock

from httpx import AsyncClient


async def test_get_albums(client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """GET /api/media/albums returns 200 with album list."""
    response = await client.get("/api/media/albums")
    assert response.status_code == 200
    assert response.json() == []
    mock_db_api.get_albums.assert_called_once()


async def test_get_albums_with_category(client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """GET /api/media/albums?category= passes the category filter to the database layer."""
    response = await client.get("/api/media/albums?category=vacation")
    assert response.status_code == 200
    mock_db_api.get_albums.assert_called_once_with(category="vacation")


async def test_get_album_with_media(client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """GET /api/media/albums/{slug} returns 200 with album and media items."""
    response = await client.get("/api/media/albums/test-slug")
    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == "test"
    assert body["title"] == "Test"
    assert body["media"] == []
    mock_db_api.get_album_with_media.assert_called_once_with("test-slug")
