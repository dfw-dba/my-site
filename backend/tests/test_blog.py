"""Tests for the blog endpoints."""

from unittest.mock import AsyncMock

from httpx import AsyncClient


async def test_get_blog_posts_default(client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """GET /api/blog/posts returns 200 with default pagination."""
    response = await client.get("/api/blog/posts")
    assert response.status_code == 200
    body = response.json()
    assert body == {"posts": [], "total": 0, "limit": 20, "offset": 0}
    mock_db_api.get_blog_posts.assert_called_once()


async def test_get_blog_posts_with_params(client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """GET /api/blog/posts with query params passes them to the database layer."""
    response = await client.get("/api/blog/posts?tag=python&limit=5&offset=10")
    assert response.status_code == 200
    mock_db_api.get_blog_posts.assert_called_once_with(tag="python", limit=5, offset=10)


async def test_get_blog_post(client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """GET /api/blog/posts/{slug} returns 200 with the post data."""
    response = await client.get("/api/blog/posts/test-slug")
    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == "test"
    assert body["title"] == "Test"
    mock_db_api.get_blog_post.assert_called_once_with("test-slug")


async def test_get_blog_post_not_found(client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """GET /api/blog/posts/{slug} returns the DB error payload (frontend handles it)."""
    mock_db_api.get_blog_post.return_value = {"error": "not_found"}
    response = await client.get("/api/blog/posts/nonexistent")
    assert response.status_code == 200
    body = response.json()
    assert body["error"] == "not_found"
