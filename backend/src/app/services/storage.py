"""S3/MinIO storage service for file uploads."""

import boto3

from src.app.config import settings


class StorageService:
    """Upload and delete files from S3-compatible storage."""

    def __init__(self) -> None:
        client_kwargs: dict = {
            "region_name": settings.AWS_REGION,
        }
        if settings.S3_ENDPOINT:
            # Local dev (MinIO) — use explicit endpoint and credentials
            client_kwargs["endpoint_url"] = settings.S3_ENDPOINT
            if settings.AWS_ACCESS_KEY_ID:
                client_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
                client_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

        self.client = boto3.client("s3", **client_kwargs)
        self.bucket = settings.MEDIA_BUCKET

    def upload_file(self, file_data: bytes, key: str, content_type: str) -> str:
        """Upload file bytes to S3 and return the public URL."""
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=file_data,
            ContentType=content_type,
        )
        return self._public_url(key)

    def delete_file(self, key: str) -> None:
        """Delete a file from S3."""
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def _public_url(self, key: str) -> str:
        if settings.S3_ENDPOINT:
            # MinIO local dev — rewrite internal URL to localhost for browser access
            host_url = settings.S3_ENDPOINT.replace("minio", "localhost")
            return f"{host_url}/{self.bucket}/{key}"
        return f"https://{self.bucket}.s3.amazonaws.com/{key}"
