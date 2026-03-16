"""Tests for the admin endpoints."""

import io
from unittest.mock import AsyncMock, MagicMock

from httpx import AsyncClient

# ── Auth ────────────────────────────────────────────────────────────────────


async def test_admin_requires_auth(client: AsyncClient) -> None:
    """Admin endpoints return 401/422 without an X-Admin-Key header."""
    payload = {
        "entry_type": "work",
        "title": "Test",
        "organization": "Acme",
        "start_date": "2024-01-01",
    }
    response = await client.post("/api/admin/resume/entry", json=payload)
    assert response.status_code in (401, 422)


async def test_admin_invalid_key(client: AsyncClient) -> None:
    """Admin endpoints return 401 with an incorrect X-Admin-Key."""
    response = await client.post(
        "/api/admin/resume/entry",
        json={
            "entry_type": "work",
            "title": "Test",
            "organization": "Acme",
            "start_date": "2024-01-01",
        },
        headers={"X-Admin-Key": "wrong-key"},
    )
    assert response.status_code == 401


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


async def test_upsert_resume_title(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """POST /api/admin/resume/title upserts the title and returns 200."""
    payload = {"title": "Senior Software Engineer"}
    response = await admin_client.post("/api/admin/resume/title", json=payload)
    assert response.status_code == 200
    assert response.json() == {"success": True}
    mock_db_api.upsert_resume_title.assert_called_once()


async def test_upsert_resume_summary(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """POST /api/admin/resume/summary upserts the summary and returns 200."""
    payload = {"headline": "Database Engineer", "text": "A brief professional summary."}
    response = await admin_client.post("/api/admin/resume/summary", json=payload)
    assert response.status_code == 200
    assert response.json() == {"success": True}
    mock_db_api.upsert_resume_summary.assert_called_once()


async def test_upsert_resume_contact(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """POST /api/admin/resume/contact upserts the contact info and returns 200."""
    payload = {
        "linkedin": "https://linkedin.com/in/test",
        "github": None,
        "email": "test@example.com",
    }
    response = await admin_client.post("/api/admin/resume/contact", json=payload)
    assert response.status_code == 200
    assert response.json() == {"success": True}
    mock_db_api.upsert_resume_contact.assert_called_once()


async def test_replace_resume_recommendations(
    admin_client: AsyncClient, mock_db_api: AsyncMock
) -> None:
    """POST /api/admin/resume/recommendations replaces all recommendations."""
    mock_db_api.replace_resume_recommendations.return_value = {"count": 1, "success": True}
    payload = {"items": [{"author": "Alice", "title": "CTO", "text": "Great work!"}]}
    response = await admin_client.post("/api/admin/resume/recommendations", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    mock_db_api.replace_resume_recommendations.assert_called_once()


# ── Schema validation (M4) ────────────────────────────────────────────────


async def test_create_entry_invalid_type(admin_client: AsyncClient) -> None:
    """entry_type must be one of the allowed literals."""
    payload = {
        "entry_type": "invalid",
        "title": "Test",
        "organization": "Acme",
        "start_date": "2024-01-01",
    }
    response = await admin_client.post("/api/admin/resume/entry", json=payload)
    assert response.status_code == 422


async def test_create_entry_title_too_long(admin_client: AsyncClient) -> None:
    """Title exceeding 200 characters is rejected."""
    payload = {
        "entry_type": "work",
        "title": "A" * 300,
        "organization": "Acme",
        "start_date": "2024-01-01",
    }
    response = await admin_client.post("/api/admin/resume/entry", json=payload)
    assert response.status_code == 422


async def test_create_entry_negative_sort_order(admin_client: AsyncClient) -> None:
    """Negative sort_order is rejected."""
    payload = {
        "entry_type": "work",
        "title": "Test",
        "organization": "Acme",
        "start_date": "2024-01-01",
        "sort_order": -1,
    }
    response = await admin_client.post("/api/admin/resume/entry", json=payload)
    assert response.status_code == 422


async def test_contact_invalid_email(admin_client: AsyncClient) -> None:
    """Invalid email format is rejected."""
    payload = {"email": "not-an-email"}
    response = await admin_client.post("/api/admin/resume/contact", json=payload)
    assert response.status_code == 422


async def test_contact_invalid_linkedin(admin_client: AsyncClient) -> None:
    """LinkedIn URL must match the linkedin.com pattern."""
    payload = {"linkedin": "http://evil.com"}
    response = await admin_client.post("/api/admin/resume/contact", json=payload)
    assert response.status_code == 422


# ── Magic byte validation (M5) ────────────────────────────────────────────


async def test_upload_valid_jpeg(admin_upload_client: AsyncClient, mock_storage: MagicMock) -> None:
    """Valid JPEG magic bytes are accepted, cache is invalidated, URL has version."""
    jpeg_data = b"\xff\xd8\xff" + b"\x00" * 100
    response = await admin_upload_client.post(
        "/api/admin/resume/profile-image",
        files={"file": ("photo.jpg", io.BytesIO(jpeg_data), "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "?v=" in data["image_url"]
    mock_storage.invalidate_cache.assert_called_once_with(["media/profile/profile-image.jpg"])


async def test_upload_spoofed_content_type(admin_upload_client: AsyncClient) -> None:
    """Content-type says JPEG but bytes are PNG — rejected."""
    png_data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    response = await admin_upload_client.post(
        "/api/admin/resume/profile-image",
        files={"file": ("photo.jpg", io.BytesIO(png_data), "image/jpeg")},
    )
    assert response.status_code == 400


async def test_upload_valid_png(admin_upload_client: AsyncClient, mock_storage: MagicMock) -> None:
    """Valid PNG magic bytes are accepted, cache is invalidated, URL has version."""
    png_data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    response = await admin_upload_client.post(
        "/api/admin/resume/profile-image",
        files={"file": ("photo.png", io.BytesIO(png_data), "image/png")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "?v=" in data["image_url"]
    mock_storage.invalidate_cache.assert_called_once_with(["media/profile/profile-image.png"])


# ── Rate limiter (M2) ─────────────────────────────────────────────────────


async def test_rate_limiter_configured(app) -> None:
    """The app should have a limiter attached to its state."""
    assert hasattr(app.state, "limiter")
