from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
import uuid


# Model for chat messages
class Message(BaseModel):
    role: str  # 'user' or 'model'
    content: str


# Model for chat request with thread
class ChatRequestWithThread(BaseModel):
    """Chat request model with thread ID"""

    model: str
    question: str


# Model for rate limit status
class RateLimitStatus(BaseModel):
    requests: Dict[str, Any]
    tokens: Dict[str, Any]


# User models
class UserBase(BaseModel):
    """Base model for user data"""

    email: EmailStr
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Username for the account",
        alias="name",
    )


class UserCreate(UserBase):
    """Model for creating a new user"""

    password: str = Field(
        ..., min_length=8, description="Password must be at least 8 characters long"
    )

    class Config:
        populate_by_name = True  # This allows using 'name' field to populate 'username'


class User(UserBase):
    """Model for user information"""

    user_id: str
    created_at: str
    is_active: bool = True
    is_admin: bool = False

    class Config:
        populate_by_name = (
            True  # This allows the model to use alias names when populating
        )


class UserInDB(User):
    """Model for user data in the database"""

    hashed_password: str

    class Config:
        populate_by_name = (
            True  # This allows the model to use alias names when populating
        )


class Token(BaseModel):
    """Model for JWT token response"""

    access_token: str
    token_type: str
    expires_at: int  # Unix timestamp


# Models for file upload
class UploadedFile(BaseModel):
    """Model for an uploaded file"""

    file_id: str
    filename: str
    content_type: str
    size: int
    upload_time: str


# Thread models
class Thread(BaseModel):
    """Model for a conversation thread"""

    thread_id: uuid.UUID
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0
    last_message_preview: Optional[str] = None
    user_id: Optional[str] = None  # ID of the user who owns this thread


class ThreadCreate(BaseModel):
    """Model for creating a new thread"""

    title: str


class ThreadUpdate(BaseModel):
    """Model for updating a thread"""

    title: str
