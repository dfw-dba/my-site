"""Tests for the showcase endpoints."""

from unittest.mock import AsyncMock

from httpx import AsyncClient


async def test_get_showcase_items(client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """GET /api/showcase/ returns 200 with showcase items."""
    response = await client.get("/api/showcase/")
    assert response.status_code == 200
    assert response.json() == []
    mock_db_api.get_showcase_items.assert_called_once()


async def test_get_showcase_items_with_category(
    client: AsyncClient, mock_db_api: AsyncMock
) -> None:
    """GET /api/showcase/?category= passes the category filter to the database layer."""
    response = await client.get("/api/showcase/?category=data-engineering")
    assert response.status_code == 200
    mock_db_api.get_showcase_items.assert_called_once_with(category="data-engineering")


async def test_get_showcase_item(client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """GET /api/showcase/{slug} returns 200 with the item data."""
    response = await client.get("/api/showcase/test-slug")
    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == "test"
    assert body["title"] == "Test"
    mock_db_api.get_showcase_item.assert_called_once_with("test-slug")
