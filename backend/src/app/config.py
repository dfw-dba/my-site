import os

from pydantic_settings import BaseSettings

_LOCAL_DEFAULT_DB_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/mysite"


def resolve_database_url() -> str:
    """Build the DATABASE_URL from env vars.

    In Lambda mode, the URL has no password — IAM auth tokens are injected
    per-connection in database.py via a SQLAlchemy connect event.
    """
    explicit = os.environ.get("DATABASE_URL")
    if explicit:
        return explicit

    if not os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return _LOCAL_DEFAULT_DB_URL

    host = os.environ["DB_HOST"]
    port = os.environ.get("DB_PORT", "5432")
    user = os.environ["DB_USER"]
    name = os.environ.get("DB_NAME", "mysite")

    return f"postgresql+asyncpg://{user}@{host}:{port}/{name}?ssl=require"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    DATABASE_URL: str = resolve_database_url()
    ADMIN_API_KEY: str = "local-dev-admin-key"
    CORS_ORIGINS: str = "http://localhost:5173"

    # Cognito settings (leave empty to use API key fallback)
    COGNITO_USER_POOL_ID: str = ""
    COGNITO_APP_CLIENT_ID: str = ""
    COGNITO_REGION: str = "us-east-1"

    # RDS connection details (Lambda only)
    DB_HOST: str = ""
    DB_PORT: str = "5432"
    DB_USER: str = ""
    DB_NAME: str = "mysite"

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
