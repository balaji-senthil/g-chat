from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
import uuid


class ConversationBase(BaseModel):
    """Base schema for conversation data"""

    role: str = Field(..., description="The role of the message sender (user/model)")
    content: str = Field(..., description="The content of the message")
    model: Optional[str] = Field(
        None, description="The model used to generate the response"
    )
    token_count: Optional[int] = Field(
        None, description="Number of tokens in the content"
    )


class ConversationCreate(ConversationBase):
    """Schema for creating a new conversation"""

    thread_id: uuid.UUID = Field(
        ..., description="The ID of the thread this conversation belongs to"
    )


class ConversationResponse(ConversationBase):
    """Schema for conversation responses"""

    id: uuid.UUID = Field(..., description="The unique identifier of the conversation")
    thread_id: uuid.UUID = Field(
        ..., description="The ID of the thread this conversation belongs to"
    )
    created_at: datetime = Field(..., description="When the conversation was created")
    updated_at: Optional[datetime] = Field(
        None, description="When the conversation was last updated"
    )

    class Config:
        from_attributes = True  # This enables ORM mode for SQLAlchemy models


class Conversation(ConversationBase):
    id: uuid.UUID
    thread_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ThreadBase(BaseModel):
    """Base schema for thread data"""

    title: Optional[str] = Field(None, description="The title of the thread")


class ThreadCreate(ThreadBase):
    """Schema for creating a new thread"""

    title: str = Field(..., description="The title of the thread")


class ThreadUpdate(ThreadBase):
    """Schema for updating a thread"""

    title: Optional[str] = Field(None, description="The new title of the thread")
    is_archived: Optional[bool] = Field(
        None, description="Whether the thread is archived"
    )


class ThreadResponse(ThreadBase):
    """Schema for thread responses"""

    id: uuid.UUID = Field(..., description="The unique identifier of the thread")
    user_id: uuid.UUID = Field(
        ..., description="The ID of the user who owns this thread"
    )
    title: str = Field(..., description="The title of the thread")
    created_at: datetime = Field(..., description="When the thread was created")
    updated_at: Optional[datetime] = Field(
        None, description="When the thread was last updated"
    )

    class Config:
        from_attributes = True  # This enables ORM mode for SQLAlchemy models


class Thread(ThreadBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_archived: bool
    conversations: List[Conversation] = []

    class Config:
        from_attributes = True


class ThreadPreviewResponse(BaseModel):
    """Schema for thread preview with last message"""

    id: uuid.UUID = Field(..., description="The unique identifier of the thread")
    title: str = Field(..., description="The title of the thread")
    last_message_content: Optional[str] = Field(
        None, description="Content of the last message in the thread"
    )
    last_message_timestamp: Optional[datetime] = Field(
        None, description="Timestamp of the last message"
    )
    updated_at: Optional[datetime] = Field(
        None, description="When the thread was last updated"
    )

    class Config:
        from_attributes = True
