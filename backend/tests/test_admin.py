"""Tests for the admin endpoints."""

from unittest.mock import AsyncMock

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
