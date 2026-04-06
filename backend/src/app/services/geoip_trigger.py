"""GeoIP trigger service — S3-based trigger and status feedback for ECS tasks."""

import json
import logging

import boto3
from botocore.exceptions import ClientError

from src.app.config import settings

logger = logging.getLogger(__name__)


def trigger_geoip_update(run_id: int) -> None:
    """Write a trigger file to S3, which invokes the non-VPC trigger Lambda."""
    if not settings.GEOIP_TRIGGER_BUCKET:
        raise RuntimeError("GEOIP_TRIGGER_BUCKET is not configured")

    s3 = boto3.client("s3")
    s3.put_object(
        Bucket=settings.GEOIP_TRIGGER_BUCKET,
        Key=f"triggers/{run_id}.json",
        Body=json.dumps({"run_id": run_id}),
        ContentType="application/json",
    )


def check_geoip_trigger_status(run_id: int) -> dict | None:
    """Read the status file written by the trigger Lambda.

    Returns the parsed JSON (e.g. {"status": "started", "task_arn": "..."} or
    {"status": "failed", "error": "..."}), or None if no status file exists yet.
    """
    if not settings.GEOIP_TRIGGER_BUCKET:
        return None

    s3 = boto3.client("s3")
    try:
        obj = s3.get_object(
            Bucket=settings.GEOIP_TRIGGER_BUCKET,
            Key=f"triggers/{run_id}.status.json",
        )
        return json.loads(obj["Body"].read())
    except ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchKey":
            return None
        logger.warning("Failed to read GeoIP trigger status: %s", e)
        return None


def trigger_schedule_update(cron_expression: str) -> None:
    """Write a schedule update file to S3, which invokes the schedule manager Lambda."""
    if not settings.GEOIP_TRIGGER_BUCKET:
        raise RuntimeError("GEOIP_TRIGGER_BUCKET is not configured")

    import time

    s3 = boto3.client("s3")
    s3.put_object(
        Bucket=settings.GEOIP_TRIGGER_BUCKET,
        Key=f"schedule/{int(time.time())}.json",
        Body=json.dumps({"cron_expression": cron_expression}),
        ContentType="application/json",
    )
