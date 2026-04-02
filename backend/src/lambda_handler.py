from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from mangum import Mangum

from src.app.main import app

logger = logging.getLogger(__name__)

_mangum = Mangum(app, lifespan="off")


async def _run_maintenance() -> dict[str, Any]:
    """Purge logs older than 14 days, purge metric snapshots older than 30 days, then VACUUM."""
    from sqlalchemy import text

    from src.app.database import engine

    # Purge inside a normal transaction
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT api.maintenance_purge_logs()"))
        purge_result = result.scalar_one()
        logger.info("Log purge result: %s", purge_result)

        metrics_result = await conn.execute(text("SELECT api.purge_metric_snapshots(30)"))
        metrics_purge = metrics_result.scalar_one()
        logger.info("Metrics purge result: %s", metrics_purge)

    # VACUUM cannot run inside a transaction — use autocommit
    raw_conn = await engine.raw_connection()
    try:
        await raw_conn.driver_connection.execute("VACUUM internal.app_logs")
        logger.info("VACUUM internal.app_logs completed")
        await raw_conn.driver_connection.execute("VACUUM internal.metric_snapshots")
        logger.info("VACUUM internal.metric_snapshots completed")
        await raw_conn.driver_connection.execute("VACUUM internal.stat_statements_history")
        logger.info("VACUUM internal.stat_statements_history completed")
        await raw_conn.driver_connection.execute("VACUUM internal.stat_tables_history")
        logger.info("VACUUM internal.stat_tables_history completed")
        await raw_conn.driver_connection.execute("VACUUM internal.stat_indexes_history")
        logger.info("VACUUM internal.stat_indexes_history completed")
        await raw_conn.driver_connection.execute("VACUUM internal.stat_functions_history")
        logger.info("VACUUM internal.stat_functions_history completed")
        await raw_conn.driver_connection.execute("VACUUM internal.stat_database_history")
        logger.info("VACUUM internal.stat_database_history completed")
    finally:
        await raw_conn.close()

    return {"statusCode": 200, "body": json.dumps(purge_result)}


async def _run_metrics_capture() -> dict[str, Any]:
    """Capture database performance metrics snapshot."""
    from sqlalchemy import text

    from src.app.database import engine

    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT api.capture_db_metrics('scheduled')"))
        capture_result = result.scalar_one()

    logger.info("Metrics capture result: %s", capture_result)

    return {"statusCode": 200, "body": json.dumps(capture_result)}


def handler(event: dict[str, Any], context: Any) -> Any:
    """Route between API Gateway requests and EventBridge scheduled events."""
    source = event.get("source")
    if source in ("aws.events", "mysite.scheduled"):
        action = event.get("action")
        loop = asyncio.new_event_loop()
        try:
            if action == "capture_metrics":
                return loop.run_until_complete(_run_metrics_capture())
            return loop.run_until_complete(_run_maintenance())
        finally:
            loop.close()

    return _mangum(event, context)
