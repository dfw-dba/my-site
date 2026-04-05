"""GeoIP trigger service — writes a trigger file to S3 to invoke the ECS task."""

import json

import boto3

from src.app.config import settings


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
