"""Tests for the health check endpoint."""

from httpx import AsyncClient

from src.app._version import __version__


async def test_health_check(client: AsyncClient) -> None:
    """GET /api/health returns 200 with status and version."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["version"] == __version__
