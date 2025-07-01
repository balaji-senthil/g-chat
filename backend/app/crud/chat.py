from sqlalchemy.orm import Session
from app.models.chat import Thread, Conversation
from app.schemas.chat import ThreadCreate, ThreadUpdate, ConversationCreate
from typing import List, Optional
import uuid
from sqlalchemy.sql import func
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def create_thread(db: Session, thread: ThreadCreate, user_id: uuid.UUID) -> Thread:
    db_thread = Thread(title=thread.title, user_id=user_id)
    db.add(db_thread)
    db.commit()
    db.refresh(db_thread)
    return db_thread


def get_thread(db: Session, thread_id: uuid.UUID) -> Optional[Thread]:
    return db.query(Thread).filter(Thread.id == thread_id).first()


def get_user_threads(db: Session, user_id: uuid.UUID) -> List[Thread]:
    return db.query(Thread).filter(Thread.user_id == user_id).all()


def update_thread(
    db: Session, thread_id: uuid.UUID, thread: ThreadUpdate
) -> Optional[Thread]:
    """
    Update a thread with the provided data.
    Only updates fields that are provided (not None).
    """
    try:
        db_thread = get_thread(db, thread_id)
        if not db_thread:
            return None

        # Get update data, excluding None values
        update_data = thread.model_dump(exclude_unset=True)

        # Update only the fields that were provided
        for field, value in update_data.items():
            setattr(db_thread, field, value)

        # The updated_at field will be automatically updated by SQLAlchemy
        # due to the onupdate=func.now() in the model

        db.commit()
        db.refresh(db_thread)
        return db_thread
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating thread {thread_id}: {str(e)}")
        raise


def delete_thread(db: Session, thread_id: uuid.UUID) -> bool:
    db_thread = get_thread(db, thread_id)
    if not db_thread:
        return False

    db.delete(db_thread)
    db.commit()
    return True


def create_conversation(db: Session, conversation: ConversationCreate) -> Conversation:
    db_conversation = Conversation(
        thread_id=conversation.thread_id,
        role=conversation.role,
        content=conversation.content,
        model=conversation.model,
        token_count=conversation.token_count,
    )
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    return db_conversation


def get_thread_conversations(
    db: Session, thread_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> List[Conversation]:
    return (
        db.query(Conversation)
        .filter(Conversation.thread_id == thread_id)
        .order_by(Conversation.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
