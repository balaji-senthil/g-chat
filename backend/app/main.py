import logging
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.routes import chat, files, models, rate_limits, threads, auth
from app.config.settings import (
    CORS_ORIGINS,
    CORS_METHODS,
    CORS_HEADERS,
)
from app.utils.rate_limiter import handle_rate_limit
from app.database.database import engine, Base

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AI Chat API",
    description="API for AI-powered chat application",
    version="1.0.0",
)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, handle_rate_limit)
app.add_middleware(SlowAPIMiddleware)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=CORS_METHODS,
    allow_headers=CORS_HEADERS,
    max_age=6000,
)

# Create main API router
api_router = APIRouter(prefix="/api")

# Include all route modules
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(files.router, tags=["files"])
api_router.include_router(models.router, tags=["models"])
api_router.include_router(rate_limits.router, tags=["rate-limits"])
api_router.include_router(threads.router, prefix="/threads", tags=["threads"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Include API router
app.include_router(api_router)


@app.get("/")
async def root():
    """Root endpoint to verify API is running"""
    return {"message": "AI Chat API is running", "status": "healthy"}


@app.get("/health")
async def health_check():
    """Health check endpoint for deployment platforms"""
    return {"status": "healthy", "message": "AI Chat API is running"}


@app.on_event("startup")
async def startup_event():
    """Create database tables on startup"""
    try:
        logger.info("Creating database tables...")
        # Import all models to register them with Base
        from app.models import chat, user

        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        # Don't crash the app, just log the error
        pass
