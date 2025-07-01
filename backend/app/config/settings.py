import os
from dotenv import load_dotenv
import logging
from typing import List

# Load environment variables from .env file (if it exists)
load_dotenv()

# Basic configuration
PORT = int(os.environ.get("PORT", 8000))
HOST = os.environ.get("HOST", "0.0.0.0")
DEBUG = os.environ.get("DEBUG", "False").lower() in ("true", "1", "t")
DEFAULT_MODEL = os.environ.get("DEFAULT_MODEL", "gemini-2.0-flash")

# API Keys
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

# Rate limiting configuration
REQUESTS_PER_MINUTE = int(
    os.environ.get("REQUESTS_PER_MINUTE", "60")
)  # Default: 60 RPM
TOKENS_PER_MINUTE = int(
    os.environ.get("TOKENS_PER_MINUTE", "60000")
)  # Default: 60K TPM

# Authentication settings
JWT_SECRET_KEY = os.environ.get(
    "JWT_SECRET_KEY", "a_very_secret_key_please_change_in_production"
)
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 30

# File upload configuration
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")
MAX_UPLOAD_SIZE = int(
    os.environ.get("MAX_UPLOAD_SIZE", str(10 * 1024 * 1024))
)  # 10 MB default
ALLOWED_EXTENSIONS = {
    # Images
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".webp",
    # Documents
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".md",
    ".csv",
    ".xlsx",
    ".xls",
    # Code
    ".py",
    ".js",
    ".html",
    ".css",
    ".json",
    ".xml",
    ".yaml",
    ".yml",
}

# CORS configuration
allowed_origins_str = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins_str.split(",")]

# Available Gemini models
AVAILABLE_MODELS = {
    "gemini-2.0-flash-lite": {
        "name": "Gemini 2.0 Flash Lite",
        "description": "Fastest and most efficient text-only model",
    },
    "gemini-2.0-flash": {
        "name": "Gemini 2.0 Flash",
        "description": "Fast and efficient text-only model",
    },
    "gemini-2.5-flash-preview-04-17": {
        "name": "Gemini 2.5 Flash Preview",
        "description": "Fast and efficient text-only model with improved performance",
    },
    "gemini-2.5-pro-exp-03-25": {
        "name": "Gemini 2.5 Pro Experimental",
        "description": "Experimental model with advanced features",
    },
}

# CORS Settings
CORS_ORIGINS: List[str] = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # React dev server
    "http://localhost:8000",  # FastAPI dev server
    "https://ai-chat-app-jqav.vercel.app",  # Vercel deployment
]
CORS_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
CORS_HEADERS = ["*"]

# Rate Limiting
RATE_LIMIT_PER_MINUTE = 60

# Database Settings
DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ai_chat"
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)
