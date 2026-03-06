"""Tests for the admin endpoints."""

from unittest.mock import AsyncMock, MagicMock

from httpx import AsyncClient

# ── Auth ────────────────────────────────────────────────────────────────────


async def test_admin_requires_auth(client: AsyncClient) -> None:
    """Admin endpoints return 401/422 without an X-Admin-Key header."""
    payload = {"slug": "s", "title": "t", "content": "c"}
    response = await client.post("/api/admin/blog", json=payload)
    assert response.status_code in (401, 422)


async def test_admin_invalid_key(client: AsyncClient) -> None:
    """Admin endpoints return 401 with an incorrect X-Admin-Key."""
    response = await client.post(
        "/api/admin/blog",
        json={"slug": "s", "title": "t", "content": "c"},
        headers={"X-Admin-Key": "wrong-key"},
    )
    assert response.status_code == 401


# ── Blog ────────────────────────────────────────────────────────────────────


async def test_list_blog_posts(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """GET /api/admin/blog lists all blog posts including drafts."""
    response = await admin_client.get("/api/admin/blog")
    assert response.status_code == 200
    body = response.json()
    assert "posts" in body
    assert "total" in body
    mock_db_api.admin_get_blog_posts.assert_called_once_with(limit=50, offset=0)


async def test_list_blog_posts_with_pagination(
    admin_client: AsyncClient,
    mock_db_api: AsyncMock,
) -> None:
    """GET /api/admin/blog supports limit and offset query params."""
    response = await admin_client.get("/api/admin/blog?limit=10&offset=5")
    assert response.status_code == 200
    mock_db_api.admin_get_blog_posts.assert_called_once_with(limit=10, offset=5)


async def test_get_blog_post_admin(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """GET /api/admin/blog/{slug} returns any post regardless of published status."""
    response = await admin_client.get("/api/admin/blog/test-slug")
    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == "test"
    assert body["published"] is False
    mock_db_api.admin_get_blog_post.assert_called_once_with("test-slug")


async def test_create_blog_post(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """POST /api/admin/blog creates a blog post and returns 200."""
    payload = {"slug": "my-post", "title": "My Post", "content": "Hello world"}
    response = await admin_client.post("/api/admin/blog", json=payload)
    assert response.status_code == 200
    assert response.json() == {"success": True}
    mock_db_api.upsert_blog_post.assert_called_once()


async def test_delete_blog_post(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """DELETE /api/admin/blog/{slug} deletes the post and returns 200."""
    response = await admin_client.delete("/api/admin/blog/test-slug")
    assert response.status_code == 200
    assert response.json() == {"success": True}
    mock_db_api.delete_blog_post.assert_called_once_with("test-slug")


# ── Showcase ────────────────────────────────────────────────────────────────


async def test_create_showcase_item(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """POST /api/admin/showcase creates a showcase item and returns 200."""
    payload = {"slug": "my-project", "title": "My Project", "category": "data-engineering"}
    response = await admin_client.post("/api/admin/showcase", json=payload)
    assert response.status_code == 200
    assert response.json() == {"success": True}
    mock_db_api.upsert_showcase_item.assert_called_once()


async def test_delete_showcase_item(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """DELETE /api/admin/showcase/{slug} deletes the item and returns 200."""
    response = await admin_client.delete("/api/admin/showcase/test-slug")
    assert response.status_code == 200
    assert response.json() == {"success": True}
    mock_db_api.delete_showcase_item.assert_called_once_with("test-slug")


# ── Resume ──────────────────────────────────────────────────────────────────


async def test_create_resume_entry(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """POST /api/admin/resume/entry creates a professional entry and returns 200."""
    payload = {
        "entry_type": "work",
        "title": "Senior Engineer",
        "organization": "Acme Corp",
        "start_date": "2024-01-01",
    }
    response = await admin_client.post("/api/admin/resume/entry", json=payload)
    assert response.status_code == 200
    assert response.json() == {"success": True}
    mock_db_api.upsert_professional_entry.assert_called_once()


async def test_delete_resume_entry(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """DELETE /api/admin/resume/entry/{id} deletes the entry and returns 200."""
    entry_id = 42
    response = await admin_client.delete(f"/api/admin/resume/entry/{entry_id}")
    assert response.status_code == 200
    assert response.json() == {"success": True}
    mock_db_api.delete_professional_entry.assert_called_once_with(entry_id)


async def test_create_resume_section(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """POST /api/admin/resume/section creates a resume section and returns 200."""
    payload = {"section_type": "summary", "content": {"text": "A brief professional summary."}}
    response = await admin_client.post("/api/admin/resume/section", json=payload)
    assert response.status_code == 200
    assert response.json() == {"success": True}
    mock_db_api.upsert_resume_section.assert_called_once()


# ── Media ───────────────────────────────────────────────────────────────────


async def test_list_media(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """GET /api/admin/media lists all media items."""
    response = await admin_client.get("/api/admin/media")
    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert "total" in body
    mock_db_api.admin_get_all_media.assert_called_once_with(limit=50, offset=0)


async def test_upload_url(admin_client: AsyncClient, mock_storage: MagicMock) -> None:
    """POST /api/admin/media/upload-url generates a presigned URL."""
    payload = {"filename": "photo.jpg", "content_type": "image/jpeg"}
    response = await admin_client.post("/api/admin/media/upload-url", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert "upload_url" in body
    assert "s3_key" in body
    mock_storage.generate_upload_url.assert_called_once()


async def test_register_media(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """POST /api/admin/media/register registers an uploaded file and returns 200."""
    payload = {
        "s3_key": "uploads/abc/photo.jpg",
        "filename": "photo.jpg",
        "content_type": "image/jpeg",
    }
    response = await admin_client.post("/api/admin/media/register", json=payload)
    assert response.status_code == 200
    assert response.json() == {"success": True}
    mock_db_api.register_media.assert_called_once()


# ── Albums ──────────────────────────────────────────────────────────────────


async def test_create_album(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """POST /api/admin/albums creates an album and returns 200."""
    payload = {"slug": "summer-2024", "title": "Summer 2024", "category": "vacation"}
    response = await admin_client.post("/api/admin/albums", json=payload)
    assert response.status_code == 200
    assert response.json() == {"success": True}
    mock_db_api.upsert_album.assert_called_once()


async def test_delete_album(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """DELETE /api/admin/albums/{slug} deletes the album and returns 200."""
    response = await admin_client.delete("/api/admin/albums/test-slug")
    assert response.status_code == 200
    assert response.json() == {"success": True}
    mock_db_api.delete_album.assert_called_once_with("test-slug")
