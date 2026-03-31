from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.app.config import settings


def configure_cors(app: FastAPI) -> None:
    """Add CORS middleware to the FastAPI application."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "X-Admin-Key",
            "X-Regression-Key",
        ],
    )
