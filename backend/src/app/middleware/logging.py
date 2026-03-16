"""Request logging middleware — writes each request to internal.app_logs via PostgreSQL."""

import logging
import time
import traceback

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from src.app.database import async_session_factory
from src.app.services.db_functions import DatabaseAPI

logger = logging.getLogger(__name__)

_SKIP_PATHS = {"/api/health", "/api/admin/logs", "/api/admin/logs/stats"}


def _log_level_for_status(status_code: int) -> str:
    if status_code >= 500:
        return "ERROR"
    if status_code >= 400:
        return "WARNING"
    return "INFO"


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log every request to PostgreSQL for admin dashboard visibility."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path in _SKIP_PATHS:
            return await call_next(request)

        start = time.monotonic()
        error_detail = None

        try:
            response = await call_next(request)
        except Exception:
            error_detail = traceback.format_exc()
            raise
        else:
            duration_ms = int((time.monotonic() - start) * 1000)
            level = _log_level_for_status(response.status_code)

            log_data = {
                "level": level,
                "message": f"{request.method} {request.url.path} {response.status_code}",
                "logger": "request",
                "request_method": request.method,
                "request_path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "client_ip": request.client.host if request.client else None,
                "error_detail": error_detail,
            }

            # Fire-and-forget DB write using a dedicated session
            try:
                async with async_session_factory() as session:
                    db = DatabaseAPI(session)
                    await db.insert_app_log(log_data)
                    await session.commit()
            except Exception:
                logger.warning("Failed to write request log to DB", exc_info=True)

            return response
        finally:
            # If an exception was raised, still try to log it
            if error_detail is not None:
                duration_ms = int((time.monotonic() - start) * 1000)
                log_data = {
                    "level": "ERROR",
                    "message": f"{request.method} {request.url.path} 500",
                    "logger": "request",
                    "request_method": request.method,
                    "request_path": request.url.path,
                    "status_code": 500,
                    "duration_ms": duration_ms,
                    "client_ip": request.client.host if request.client else None,
                    "error_detail": error_detail,
                }
                try:
                    async with async_session_factory() as session:
                        db = DatabaseAPI(session)
                        await db.insert_app_log(log_data)
                        await session.commit()
                except Exception:
                    logger.warning("Failed to write error log to DB", exc_info=True)
