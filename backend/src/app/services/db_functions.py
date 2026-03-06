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

    async def upsert_resume_section(self, data: dict[str, Any]) -> Any:
        """Insert or update a resume section."""
        result = await self.session.execute(
            text("SELECT api.upsert_resume_section(CAST(:data AS jsonb))"),
            {"data": json.dumps(data, default=str)},
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

    async def delete_professional_entry(self, entry_id: str) -> Any:
        """Delete a professional entry by ID."""
        result = await self.session.execute(
            text("SELECT api.delete_professional_entry(CAST(:id AS uuid))"),
            {"id": entry_id},
        )
        return result.scalar_one()

    # ── Blog ─────────────────────────────────────────────────────────────────

    async def admin_get_blog_post(self, slug: str) -> Any:
        """Fetch a single blog post by slug (any status, for admin use)."""
        result = await self.session.execute(
            text("SELECT api.admin_get_blog_post(:slug)"),
            {"slug": slug},
        )
        return result.scalar_one()

    async def admin_get_blog_posts(
        self,
        limit: int = 50,
        offset: int = 0,
    ) -> Any:
        """List all blog posts (including drafts) for admin use."""
        result = await self.session.execute(
            text("SELECT api.admin_get_blog_posts(:limit, :offset)"),
            {"limit": limit, "offset": offset},
        )
        return result.scalar_one()

    async def get_blog_posts(
        self,
        tag: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Any:
        """List published blog posts with optional tag filter and pagination."""
        result = await self.session.execute(
            text("SELECT api.get_blog_posts(:tag, :limit, :offset)"),
            {"tag": tag, "limit": limit, "offset": offset},
        )
        return result.scalar_one()

    async def get_blog_post(self, slug: str) -> Any:
        """Fetch a single blog post by slug."""
        result = await self.session.execute(
            text("SELECT api.get_blog_post(:slug)"),
            {"slug": slug},
        )
        return result.scalar_one()

    async def upsert_blog_post(self, data: dict[str, Any]) -> Any:
        """Create or update a blog post."""
        result = await self.session.execute(
            text("SELECT api.upsert_blog_post(CAST(:data AS jsonb))"),
            {"data": json.dumps(data, default=str)},
        )
        return result.scalar_one()

    async def delete_blog_post(self, slug: str) -> Any:
        """Delete a blog post by slug."""
        result = await self.session.execute(
            text("SELECT api.delete_blog_post(:slug)"),
            {"slug": slug},
        )
        return result.scalar_one()

    # ── Showcase ─────────────────────────────────────────────────────────────

    async def get_showcase_items(self, category: str | None = None) -> Any:
        """List showcase items with optional category filter."""
        result = await self.session.execute(
            text("SELECT api.get_showcase_items(:category)"),
            {"category": category},
        )
        return result.scalar_one()

    async def get_showcase_item(self, slug: str) -> Any:
        """Fetch a single showcase item by slug."""
        result = await self.session.execute(
            text("SELECT api.get_showcase_item(:slug)"),
            {"slug": slug},
        )
        return result.scalar_one()

    async def upsert_showcase_item(self, data: dict[str, Any]) -> Any:
        """Create or update a showcase item."""
        result = await self.session.execute(
            text("SELECT api.upsert_showcase_item(CAST(:data AS jsonb))"),
            {"data": json.dumps(data, default=str)},
        )
        return result.scalar_one()

    async def delete_showcase_item(self, slug: str) -> Any:
        """Delete a showcase item by slug."""
        result = await self.session.execute(
            text("SELECT api.delete_showcase_item(:slug)"),
            {"slug": slug},
        )
        return result.scalar_one()

    # ── Media / Albums ───────────────────────────────────────────────────────

    async def get_albums(self, category: str | None = None) -> Any:
        """List albums with optional category filter."""
        result = await self.session.execute(
            text("SELECT api.get_albums(:category)"),
            {"category": category},
        )
        return result.scalar_one()

    async def get_album_with_media(self, slug: str) -> Any:
        """Fetch a single album with all its media items."""
        result = await self.session.execute(
            text("SELECT api.get_album_with_media(:slug)"),
            {"slug": slug},
        )
        return result.scalar_one()

    async def get_media_by_category(
        self,
        category: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Any:
        """List media items by album category."""
        result = await self.session.execute(
            text("SELECT api.get_media_by_category(:category, :limit, :offset)"),
            {"category": category, "limit": limit, "offset": offset},
        )
        return result.scalar_one()

    async def admin_get_all_media(
        self,
        limit: int = 50,
        offset: int = 0,
    ) -> Any:
        """List all media items for admin use."""
        result = await self.session.execute(
            text("SELECT api.admin_get_all_media(:limit, :offset)"),
            {"limit": limit, "offset": offset},
        )
        return result.scalar_one()

    async def register_media(self, data: dict[str, Any]) -> Any:
        """Register an uploaded media file in the database."""
        result = await self.session.execute(
            text("SELECT api.register_media(CAST(:data AS jsonb))"),
            {"data": json.dumps(data, default=str)},
        )
        return result.scalar_one()

    async def upsert_album(self, data: dict[str, Any]) -> Any:
        """Create or update an album."""
        result = await self.session.execute(
            text("SELECT api.upsert_album(CAST(:data AS jsonb))"),
            {"data": json.dumps(data, default=str)},
        )
        return result.scalar_one()

    async def delete_album(self, slug: str) -> Any:
        """Delete an album by slug."""
        result = await self.session.execute(
            text("SELECT api.delete_album(:slug)"),
            {"slug": slug},
        )
        return result.scalar_one()
