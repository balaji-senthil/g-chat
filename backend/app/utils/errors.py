from typing import Any


# Custom exception classes for better error handling
class APIError(Exception):
    """Base class for API errors"""

    def __init__(self, status_code: int, message: str, details: Any = None):
        self.status_code = status_code
        self.message = message
        self.details = details
        super().__init__(self.message)


class ModelNotFoundError(APIError):
    """Raised when a requested model is not found"""

    def __init__(self, model_name: str):
        super().__init__(
            status_code=404,
            message=f"Model '{model_name}' not found",
            details={"requested_model": model_name},
        )


class RateLimitError(APIError):
    """Raised when rate limits are exceeded"""

    def __init__(self, limit_type: str, limit: int):
        super().__init__(
            status_code=429,
            message=f"{limit_type} rate limit exceeded: {limit} per minute",
            details={"limit_type": limit_type, "limit": limit},
        )


class APIKeyMissingError(APIError):
    """Raised when the API key is missing"""

    def __init__(self):
        super().__init__(
            status_code=500,
            message="API key is not configured",
            details={"environment_variable": "GOOGLE_API_KEY"},
        )
