from fastapi import FastAPI

from src.app.middleware.cors import configure_cors
from src.app.routers import admin, health, resume


def create_app() -> FastAPI:
    """Application factory — creates and configures the FastAPI instance."""
    application = FastAPI(
        title="My Site API",
        description="Backend API for personal website — resume.",
        version="0.1.0",
    )

    # Middleware
    configure_cors(application)

    # Routers
    application.include_router(health.router, prefix="/api")
    application.include_router(resume.router, prefix="/api/resume", tags=["resume"])
    application.include_router(admin.router, prefix="/api/admin", tags=["admin"])

    return application


app = create_app()
