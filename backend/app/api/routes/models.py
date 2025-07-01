import logging
from fastapi import APIRouter, Request
from app.utils.rate_limiter import track_request
from app.config.settings import AVAILABLE_MODELS

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/models")
async def get_models():
    """Return available Gemini models"""
    return AVAILABLE_MODELS
