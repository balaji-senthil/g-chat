import time
import logging
import tiktoken
from typing import Dict, Any
from app.utils.errors import RateLimitError
from app.config.settings import REQUESTS_PER_MINUTE, TOKENS_PER_MINUTE
from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger(__name__)

# Global tracking dictionary for rate limits
usage_tracking: Dict[str, Any] = {
    "last_reset": time.time(),
    "tokens_used": 0,
    "requests_used": 0,
}


def check_and_reset_counters() -> None:
    """
    Check if a minute has passed and reset usage counters if needed.

    This function is called before any rate-limited operation to ensure
    that the usage tracking is accurate for the current minute.
    """
    global usage_tracking

    current_time = time.time()
    if current_time - usage_tracking["last_reset"] > 60:
        # Reset counters every minute
        logger.debug(
            f"Resetting rate limit counters. Previous usage: "
            f"{usage_tracking['requests_used']}/{REQUESTS_PER_MINUTE} requests, "
            f"{usage_tracking['tokens_used']}/{TOKENS_PER_MINUTE} tokens"
        )
        usage_tracking = {
            "last_reset": current_time,
            "tokens_used": 0,
            "requests_used": 0,
        }
        logger.info("Rate limit counters reset")


def count_tokens(text: str) -> int:
    """
    Count tokens in the text using tiktoken or a fallback method.

    Args:
        text: The input text to count tokens for

    Returns:
        int: The number of tokens in the text

    This uses OpenAI's tokenizer as an approximation for Gemini.
    A more accurate approach would use the specific model's tokenizer.
    """
    try:
        # Try to use tiktoken if available
        enc = tiktoken.get_encoding(
            "cl100k_base"
        )  # Using OpenAI's tokenizer as an approximation
        return len(enc.encode(text))
    except Exception as e:
        logger.warning(f"Error with tiktoken: {str(e)}")
        # Fallback to a simple approximation
        return len(text) // 4  # Very rough approximation, ~4 chars per token


def check_token_rate_limit(token_count: int) -> bool:
    """
    Check if the token usage exceeds the rate limit.
    Resets the counter after 60 seconds.

    Args:
        token_count: Number of tokens to check against the limit

    Returns:
        bool: True if within limit, False if exceeding limit

    Raises:
        RateLimitError: If token limit would be exceeded
    """
    global usage_tracking

    # Check if we need to reset counters
    check_and_reset_counters()

    # Check if adding these tokens would exceed the limit
    if usage_tracking["tokens_used"] + token_count > TOKENS_PER_MINUTE:
        logger.warning(
            f"Token rate limit would be exceeded: "
            f"{usage_tracking['tokens_used']} + {token_count} > {TOKENS_PER_MINUTE}"
        )
        return False

    # Update token usage
    usage_tracking["tokens_used"] += token_count
    logger.debug(
        f"Token usage updated: {usage_tracking['tokens_used']}/{TOKENS_PER_MINUTE}"
    )
    return True


def track_request() -> None:
    """
    Track a new API request against the rate limit.

    Raises:
        RateLimitError: If request limit is exceeded
    """
    global usage_tracking

    # Check if we need to reset counters
    check_and_reset_counters()

    # Check if adding this request would exceed the limit
    if usage_tracking["requests_used"] >= REQUESTS_PER_MINUTE:
        logger.warning(
            f"Request rate limit exceeded: {REQUESTS_PER_MINUTE} requests per minute"
        )
        raise RateLimitError("Request", REQUESTS_PER_MINUTE)

    # Update request count
    usage_tracking["requests_used"] += 1

    # Log request count every 10 requests
    if usage_tracking["requests_used"] % 10 == 0:
        logger.info(
            f"Request count: {usage_tracking['requests_used']}/{REQUESTS_PER_MINUTE}"
        )


def get_rate_limit_status():
    """
    Get the current rate limit status

    Returns:
        dict: Dictionary with rate limit information
    """
    global usage_tracking

    # Check if we need to reset counters
    check_and_reset_counters()

    # Calculate time until reset
    time_until_reset = max(0, 60 - (time.time() - usage_tracking["last_reset"]))

    # Calculate remaining requests
    remaining_requests = max(0, REQUESTS_PER_MINUTE - usage_tracking["requests_used"])

    return {
        "requests": {
            "limit": REQUESTS_PER_MINUTE,
            "used": usage_tracking["requests_used"],
            "remaining": remaining_requests,
            "reset_after_seconds": int(time_until_reset),
        },
        "tokens": {
            "limit": TOKENS_PER_MINUTE,
            "used": usage_tracking["tokens_used"],
            "remaining": TOKENS_PER_MINUTE - usage_tracking["tokens_used"],
            "reset_after_seconds": int(time_until_reset),
        },
    }


async def handle_rate_limit(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle rate limit exceeded requests and return a proper response.
    """
    if not isinstance(exc, RateLimitExceeded):
        raise exc

    client_ip = request.client.host if request.client else "unknown"
    logger.warning(f"Rate limit exceeded for {client_ip}")
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": str(exc),
        },
    )
