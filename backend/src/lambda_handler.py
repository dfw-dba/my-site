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
    """Purge logs older than 14 days, then VACUUM the table."""
    from sqlalchemy import text

    from src.app.database import engine

    # Purge inside a normal transaction
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT api.maintenance_purge_logs()"))
        purge_result = result.scalar_one()

    logger.info("Purge result: %s", purge_result)

    # VACUUM cannot run inside a transaction — use autocommit
    raw_conn = await engine.raw_connection()
    try:
        await raw_conn.driver_connection.execute("VACUUM internal.app_logs")
        logger.info("VACUUM internal.app_logs completed")
    finally:
        await raw_conn.close()

    return {"statusCode": 200, "body": json.dumps(purge_result)}


def handler(event: dict[str, Any], context: Any) -> Any:
    """Route between API Gateway requests and EventBridge scheduled events."""
    if event.get("source") == "aws.events":
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(_run_maintenance())
        finally:
            loop.close()

    return _mangum(event, context)
