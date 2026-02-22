from fastapi import FastAPI

from src.app.middleware.cors import configure_cors
from src.app.routers import admin, blog, health, media, personal, resume, showcase


def create_app() -> FastAPI:
    """Application factory — creates and configures the FastAPI instance."""
    application = FastAPI(
        title="My Site API",
        description="Backend API for personal website — resume, blog, showcase, and media.",
        version="0.1.0",
    )

    # Middleware
    configure_cors(application)

    # Routers
    application.include_router(health.router, prefix="/api")
    application.include_router(resume.router, prefix="/api/resume", tags=["resume"])
    application.include_router(blog.router, prefix="/api/blog", tags=["blog"])
    application.include_router(showcase.router, prefix="/api/showcase", tags=["showcase"])
    application.include_router(personal.router, prefix="/api/personal", tags=["personal"])
    application.include_router(media.router, prefix="/api/media", tags=["media"])
    application.include_router(admin.router, prefix="/api/admin", tags=["admin"])

    return application


app = create_app()
