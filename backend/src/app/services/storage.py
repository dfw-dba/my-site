"""StorageService — S3/MinIO presigned URL generation."""

import boto3
from botocore.config import Config


class StorageService:
    """Generates presigned URLs for S3-compatible object storage (MinIO)."""

    def __init__(
        self,
        endpoint_url: str,
        access_key: str,
        secret_key: str,
        bucket: str,
    ) -> None:
        self.bucket = bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )

    def generate_upload_url(
        self,
        key: str,
        content_type: str,
        expires: int = 3600,
    ) -> str:
        """Generate a presigned PUT URL for uploading an object."""
        return self.client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self.bucket,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=expires,
        )

    def generate_download_url(
        self,
        key: str,
        expires: int = 3600,
    ) -> str:
        """Generate a presigned GET URL for downloading an object."""
        return self.client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self.bucket,
                "Key": key,
            },
            ExpiresIn=expires,
        )
