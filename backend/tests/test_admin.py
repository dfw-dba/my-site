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


async def test_create_resume_section(admin_client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """POST /api/admin/resume/section creates a resume section and returns 200."""
    payload = {"section_type": "summary", "content": {"text": "A brief professional summary."}}
    response = await admin_client.post("/api/admin/resume/section", json=payload)
    assert response.status_code == 200
    assert response.json() == {"success": True}
    mock_db_api.upsert_resume_section.assert_called_once()
