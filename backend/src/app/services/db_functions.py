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

    # ── App Logs ────────────────────────────────────────────────────────────

    async def insert_app_log(self, data: dict[str, Any]) -> Any:
        """Insert a single application log row."""
        result = await self.session.execute(
            text("SELECT api.insert_app_log(CAST(:data AS jsonb))"),
            {"data": json.dumps(data, default=str)},
        )
        return result.scalar_one()

    async def get_app_logs(self, filters: dict[str, Any]) -> Any:
        """Fetch paginated application logs with optional filters."""
        result = await self.session.execute(
            text("SELECT api.get_app_logs(CAST(:filters AS jsonb))"),
            {"filters": json.dumps(filters, default=str)},
        )
        return result.scalar_one()

    async def get_app_log_stats(self) -> Any:
        """Fetch application log stats for the last 24 hours."""
        result = await self.session.execute(text("SELECT api.get_app_log_stats()"))
        return result.scalar_one()

    async def purge_app_logs(self, days: int) -> Any:
        """Delete application logs older than N days."""
        result = await self.session.execute(
            text("SELECT api.purge_app_logs(:days)"),
            {"days": days},
        )
        return result.scalar_one()

    async def get_threat_detections(self, filters: dict[str, Any]) -> Any:
        """Fetch threat detection data from app logs."""
        result = await self.session.execute(
            text("SELECT api.get_threat_detections(CAST(:filters AS jsonb))"),
            {"filters": json.dumps(filters, default=str)},
        )
        return result.scalar_one()

    async def maintenance_purge_logs(self) -> Any:
        """Run scheduled maintenance: purge logs older than 14 days."""
        result = await self.session.execute(text("SELECT api.maintenance_purge_logs()"))
        return result.scalar_one()

    # ── Database Metrics ──────────────────────────────────────────────────

    async def capture_db_metrics(self, snapshot_type: str = "scheduled") -> Any:
        """Capture a database performance metrics snapshot."""
        result = await self.session.execute(
            text("SELECT api.capture_db_metrics(:type)"),
            {"type": snapshot_type},
        )
        return result.scalar_one()

    async def get_db_overview(self, filters: dict[str, Any] | None = None) -> Any:
        """Fetch database-level overview stats from latest snapshot."""
        result = await self.session.execute(
            text("SELECT api.get_db_overview(CAST(:filters AS jsonb))"),
            {"filters": json.dumps(filters or {}, default=str)},
        )
        return result.scalar_one()

    async def get_slow_queries(self, filters: dict[str, Any] | None = None) -> Any:
        """Fetch top queries by execution time from latest snapshot."""
        result = await self.session.execute(
            text("SELECT api.get_slow_queries(CAST(:filters AS jsonb))"),
            {"filters": json.dumps(filters or {}, default=str)},
        )
        return result.scalar_one()

    async def get_plan_instability(self, filters: dict[str, Any] | None = None) -> Any:
        """Fetch queries with high execution time variance."""
        result = await self.session.execute(
            text("SELECT api.get_plan_instability(CAST(:filters AS jsonb))"),
            {"filters": json.dumps(filters or {}, default=str)},
        )
        return result.scalar_one()

    async def get_table_stats(self, filters: dict[str, Any] | None = None) -> Any:
        """Fetch table access patterns from latest snapshot."""
        result = await self.session.execute(
            text("SELECT api.get_table_stats(CAST(:filters AS jsonb))"),
            {"filters": json.dumps(filters or {}, default=str)},
        )
        return result.scalar_one()

    async def get_index_usage(self, filters: dict[str, Any] | None = None) -> Any:
        """Fetch index usage stats from latest snapshot."""
        result = await self.session.execute(
            text("SELECT api.get_index_usage(CAST(:filters AS jsonb))"),
            {"filters": json.dumps(filters or {}, default=str)},
        )
        return result.scalar_one()

    async def get_function_stats(self, filters: dict[str, Any] | None = None) -> Any:
        """Fetch function performance stats from latest snapshot."""
        result = await self.session.execute(
            text("SELECT api.get_function_stats(CAST(:filters AS jsonb))"),
            {"filters": json.dumps(filters or {}, default=str)},
        )
        return result.scalar_one()

    async def purge_metric_snapshots(self, days: int = 30) -> Any:
        """Delete metric snapshots older than N days."""
        result = await self.session.execute(
            text("SELECT api.purge_metric_snapshots(:days)"),
            {"days": days},
        )
        return result.scalar_one()

    async def delete_professional_entry(self, entry_id: int) -> Any:
        """Delete a professional entry by ID."""
        result = await self.session.execute(
            text("SELECT api.delete_professional_entry(:id)"),
            {"id": entry_id},
        )
        return result.scalar_one()

    # ── Analytics ────────────────────────────────────────────────────────────

    async def insert_page_view(self, data: dict[str, Any]) -> Any:
        """Insert a page view record with GeoIP enrichment."""
        result = await self.session.execute(
            text("SELECT api.insert_page_view(CAST(:data AS jsonb))"),
            {"data": json.dumps(data, default=str)},
        )
        return result.scalar_one()

    async def insert_visitor_event(self, data: dict[str, Any]) -> Any:
        """Insert a visitor interaction event."""
        result = await self.session.execute(
            text("SELECT api.insert_visitor_event(CAST(:data AS jsonb))"),
            {"data": json.dumps(data, default=str)},
        )
        return result.scalar_one()

    async def get_analytics_summary(self, filters: dict[str, Any] | None = None) -> Any:
        """Fetch visitor analytics summary dashboard data."""
        result = await self.session.execute(
            text("SELECT api.get_analytics_summary(CAST(:filters AS jsonb))"),
            {"filters": json.dumps(filters or {}, default=str)},
        )
        return result.scalar_one()

    async def get_analytics_visitors(self, filters: dict[str, Any] | None = None) -> Any:
        """Fetch visitor-level analytics data."""
        result = await self.session.execute(
            text("SELECT api.get_analytics_visitors(CAST(:filters AS jsonb))"),
            {"filters": json.dumps(filters or {}, default=str)},
        )
        return result.scalar_one()

    async def get_analytics_geo(self, filters: dict[str, Any] | None = None) -> Any:
        """Fetch geographic breakdown of visitors."""
        result = await self.session.execute(
            text("SELECT api.get_analytics_geo(CAST(:filters AS jsonb))"),
            {"filters": json.dumps(filters or {}, default=str)},
        )
        return result.scalar_one()

    async def get_analytics_timeseries(self, filters: dict[str, Any] | None = None) -> Any:
        """Fetch daily page view and unique visitor time series."""
        result = await self.session.execute(
            text("SELECT api.get_analytics_timeseries(CAST(:filters AS jsonb))"),
            {"filters": json.dumps(filters or {}, default=str)},
        )
        return result.scalar_one()

    async def purge_analytics(self, days: int = 90) -> Any:
        """Delete page views and visitor events older than N days."""
        result = await self.session.execute(
            text("SELECT api.purge_analytics(:days)"),
            {"days": days},
        )
        return result.scalar_one()

    # ── GeoIP ───────────────────────────────────────────────────────────────

    async def get_geoip_update_logs(self, filters: dict[str, Any] | None = None) -> Any:
        """Fetch paginated GeoIP update log history."""
        result = await self.session.execute(
            text("SELECT api.get_geoip_update_logs(CAST(:filters AS jsonb))"),
            {"filters": json.dumps(filters or {}, default=str)},
        )
        return result.scalar_one()

    async def get_geoip_task_status(self) -> Any:
        """Fetch the latest GeoIP task run status."""
        result = await self.session.execute(
            text("SELECT api.get_geoip_task_status()"),
        )
        return result.scalar_one()

    async def create_geoip_task_run(self, data: dict[str, Any]) -> Any:
        """Create a new pending GeoIP task run record."""
        result = await self.session.execute(
            text("SELECT api.create_geoip_task_run(CAST(:data AS jsonb))"),
            {"data": json.dumps(data, default=str)},
        )
        return result.scalar_one()

    async def get_geoip_task_progress(self, filters: dict[str, Any] | None = None) -> Any:
        """Fetch progress lines for a GeoIP task run."""
        result = await self.session.execute(
            text("SELECT api.get_geoip_task_progress(CAST(:filters AS jsonb))"),
            {"filters": json.dumps(filters or {}, default=str)},
        )
        return result.scalar_one()
