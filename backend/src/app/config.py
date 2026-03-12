import json
import os
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings

_LOCAL_DEFAULT_DB_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/mysite"


def resolve_database_url() -> str:
    """Build the DATABASE_URL from Secrets Manager when running in Lambda."""
    explicit = os.environ.get("DATABASE_URL")
    if explicit:
        return explicit

    if not os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return _LOCAL_DEFAULT_DB_URL

    secret_name = os.environ.get("DB_SECRET_NAME", "/mysite/db-credentials")

    import boto3

    client = boto3.client("secretsmanager")
    resp = client.get_secret_value(SecretId=secret_name)
    creds = json.loads(resp["SecretString"])

    password = quote_plus(creds["password"])
    return (
        f"postgresql+asyncpg://{creds['username']}:{password}"
        f"@{creds['host']}:{creds['port']}/{creds['dbname']}?ssl=require"
    )


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    DATABASE_URL: str = resolve_database_url()
    ADMIN_API_KEY: str = "local-dev-admin-key"
    CORS_ORIGINS: str = "http://localhost:5173"

    # Cognito settings (leave empty to use API key fallback)
    COGNITO_USER_POOL_ID: str = ""
    COGNITO_APP_CLIENT_ID: str = ""
    COGNITO_REGION: str = "us-east-1"

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
