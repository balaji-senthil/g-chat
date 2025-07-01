import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

logger = logging.getLogger(__name__)


# Request ID middleware to track requests
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all requests and responses"""

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Log request details
        logger.info(
            f"Request {request_id} started: {request.method} {request.url.path}"
        )

        start_time = time.time()
        try:
            response = await call_next(request)
            process_time = time.time() - start_time

            # Log response details
            logger.info(
                f"Request {request_id} completed: {response.status_code} in {process_time:.3f}s"
            )

            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"Request {request_id} failed after {process_time:.3f}s: {str(e)}"
            )
            raise
