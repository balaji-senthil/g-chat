from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database.database import Base


class Thread(Base):
    __tablename__ = "threads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_archived = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="threads")
    conversations = relationship(
        "Conversation",
        back_populates="thread",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    thread_id = Column(
        UUID(as_uuid=True), ForeignKey("threads.id", ondelete="CASCADE"), nullable=False
    )
    role = Column(
        String(50), nullable=False
    )  # 'user' or 'model' (formerly 'assistant')
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    model = Column(String(100), nullable=True)  # The AI model used for this response
    token_count = Column(
        Integer, nullable=True, default=0
    )  # Number of tokens in the content

    # Relationships
    thread = relationship("Thread", back_populates="conversations")
