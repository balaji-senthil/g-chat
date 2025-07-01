import logging
from fastapi import APIRouter, Request
from app.models.base import RateLimitStatus
from app.utils.rate_limiter import get_rate_limit_status, track_request

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/rate-limits", response_model=RateLimitStatus)
async def get_rate_limits(request: Request):
    """Return rate limit status"""
    # Track this request
    track_request()

    # Get the current rate limit status
    status = get_rate_limit_status()
    return RateLimitStatus(**status)
