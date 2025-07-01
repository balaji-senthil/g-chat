from app.models.user import User
from app.models.chat import Thread, Conversation

# This ensures all models are imported and registered with SQLAlchemy
__all__ = ["User", "Thread", "Conversation"]
