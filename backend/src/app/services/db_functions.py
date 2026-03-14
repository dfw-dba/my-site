"""DatabaseAPI — sole data access layer.

All database queries go through this class. Each method maps to a PostgreSQL
stored function in the `api` schema. This keeps SQL out of routers and makes
the data layer easy to test with a single mock.
"""

import json
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class DatabaseAPI:
    """Wraps an AsyncSession and provides typed access to stored functions."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ── Resume ───────────────────────────────────────────────────────────────

    async def get_resume(self) -> Any:
        """Fetch the full resume (sections + entries)."""
        result = await self.session.execute(text("SELECT api.get_resume()"))
        return result.scalar_one()

    async def get_contact_info(self) -> Any:
        """Fetch contact info (linkedin, github, email, etc.)."""
        result = await self.session.execute(text("SELECT api.get_contact_info()"))
        return result.scalar_one()

    async def get_professional_timeline(self) -> Any:
        """Fetch resume entries as a chronological timeline."""
        result = await self.session.execute(text("SELECT api.get_professional_timeline()"))
        return result.scalar_one()

    async def upsert_professional_entry(self, data: dict[str, Any]) -> Any:
        """Insert or update a professional entry."""
        result = await self.session.execute(
            text("SELECT api.upsert_professional_entry(CAST(:data AS jsonb))"),
            {"data": json.dumps(data, default=str)},
        )
        return result.scalar_one()

    async def upsert_resume_title(self, data: dict[str, Any]) -> Any:
        """Insert or update the resume title."""
        result = await self.session.execute(
            text("SELECT api.upsert_resume_title(CAST(:data AS jsonb))"),
            {"data": json.dumps(data, default=str)},
        )
        return result.scalar_one()

    async def upsert_resume_summary(self, data: dict[str, Any]) -> Any:
        """Insert or update the resume summary."""
        result = await self.session.execute(
            text("SELECT api.upsert_resume_summary(CAST(:data AS jsonb))"),
            {"data": json.dumps(data, default=str)},
        )
        return result.scalar_one()

    async def upsert_resume_contact(self, data: dict[str, Any]) -> Any:
        """Insert or update the resume contact info."""
        result = await self.session.execute(
            text("SELECT api.upsert_resume_contact(CAST(:data AS jsonb))"),
            {"data": json.dumps(data, default=str)},
        )
        return result.scalar_one()

    async def replace_resume_recommendations(self, items: list[dict[str, Any]]) -> Any:
        """Replace all recommendations."""
        result = await self.session.execute(
            text("SELECT api.replace_resume_recommendations(CAST(:items AS jsonb))"),
            {"items": json.dumps(items, default=str)},
        )
        return result.scalar_one()

    async def upsert_performance_review(self, data: dict[str, Any]) -> Any:
        """Insert or update a performance review."""
        result = await self.session.execute(
            text("SELECT api.upsert_performance_review(CAST(:data AS jsonb))"),
            {"data": json.dumps(data, default=str)},
        )
        return result.scalar_one()

    async def delete_performance_review(self, review_id: int) -> Any:
        """Delete a performance review by ID."""
        result = await self.session.execute(
            text("SELECT api.delete_performance_review(:id)"),
            {"id": review_id},
        )
        return result.scalar_one()

    async def upsert_resume_profile_image(self, data: dict[str, Any]) -> Any:
        """Insert or update the resume profile image URL."""
        result = await self.session.execute(
            text("SELECT api.upsert_resume_profile_image(CAST(:data AS jsonb))"),
            {"data": json.dumps(data, default=str)},
        )
        return result.scalar_one()

    async def delete_professional_entry(self, entry_id: int) -> Any:
        """Delete a professional entry by ID."""
        result = await self.session.execute(
            text("SELECT api.delete_professional_entry(:id)"),
            {"id": entry_id},
        )
        return result.scalar_one()
