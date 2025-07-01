# This file is intentionally left empty as routes are now configured in main.py

from fastapi import APIRouter

from app.api.routes import chat, files, models, rate_limits, threads, auth

# Create main API router
api_router = APIRouter(prefix="/api")

# Include all route modules
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(files.router, tags=["files"])
api_router.include_router(models.router, tags=["models"])
api_router.include_router(
    rate_limits.router, prefix="/rate-limits", tags=["rate-limits"]
)
api_router.include_router(threads.router, prefix="/threads", tags=["threads"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
