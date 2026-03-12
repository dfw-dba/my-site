import os

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

# In Lambda: inject a fresh IAM auth token as the password on each new connection.
# generate_db_auth_token() is a local SigV4 signing operation — no network call needed.
if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    import boto3

    _rds_client = boto3.client("rds")

    @event.listens_for(engine.sync_engine, "do_connect")
    def _inject_iam_token(dialect, conn_rec, cargs, cparams):
        cparams["password"] = _rds_client.generate_db_auth_token(
            DBHostname=settings.DB_HOST,
            Port=int(settings.DB_PORT),
            DBUsername=settings.DB_USER,
        )


async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
