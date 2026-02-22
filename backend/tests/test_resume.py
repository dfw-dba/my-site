"""Tests for the resume endpoints."""

from unittest.mock import AsyncMock

from httpx import AsyncClient


async def test_get_resume(client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """GET /api/resume/ returns 200 with the full resume."""
    response = await client.get("/api/resume/")
    assert response.status_code == 200
    mock_db_api.get_resume.assert_called_once()


async def test_get_timeline(client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """GET /api/resume/timeline returns 200 with timeline entries."""
    response = await client.get("/api/resume/timeline")
    assert response.status_code == 200
    mock_db_api.get_professional_timeline.assert_called_once()


async def test_get_resume_data_shape(client: AsyncClient, mock_db_api: AsyncMock) -> None:
    """GET /api/resume/ response contains sections and entries keys."""
    response = await client.get("/api/resume/")
    assert response.status_code == 200
    body = response.json()
    assert "sections" in body
    assert "entries" in body
