from fastapi import FastAPI

from src.app._version import __version__
from src.app.middleware.cors import configure_cors
from src.app.middleware.logging import RequestLoggingMiddleware
from src.app.middleware.rate_limit import configure_rate_limiting
from src.app.routers import admin, analytics, health, resume


def create_app() -> FastAPI:
    """Application factory — creates and configures the FastAPI instance."""
    application = FastAPI(
        title="My Site API",
        description="Backend API for personal website — resume.",
        version=__version__,
    )

    # Middleware (order matters: last added = first executed)
    configure_cors(application)
    configure_rate_limiting(application)
    application.add_middleware(RequestLoggingMiddleware)

    # Routers
    application.include_router(health.router, prefix="/api")
    application.include_router(resume.router, prefix="/api/resume", tags=["resume"])
    application.include_router(admin.router, prefix="/api/admin", tags=["admin"])
    application.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])

    return application


app = create_app()
