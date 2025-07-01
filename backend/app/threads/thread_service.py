import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
import uuid
from sqlalchemy.sql import func

from app.models.chat import Thread, Conversation
from app.schemas.chat import ThreadCreate, ThreadUpdate, ConversationCreate
from app.crud import chat as chat_crud
from app.utils.rate_limiter import count_tokens

logger = logging.getLogger(__name__)


def create_thread(db: Session, title: str, user_id: uuid.UUID) -> Thread:
    """
    Create a new conversation thread

    Args:
        db: Database session
        title: The title of the thread
        user_id: User ID to associate with the thread

    Returns:
        Thread: The newly created thread
    """
    thread_data = ThreadCreate(title=title)
    thread = chat_crud.create_thread(db, thread_data, user_id)
    logger.info(f"Thread created: {thread.id} - '{title}'")
    return thread


def get_thread(db: Session, thread_id: uuid.UUID) -> Optional[Thread]:
    """
    Get a specific thread by ID

    Args:
        db: Database session
        thread_id: The UUID of the thread to retrieve

    Returns:
        Thread: The requested thread or None if not found
    """
    return chat_crud.get_thread(db, thread_id)


def get_all_threads(db: Session, user_id: uuid.UUID) -> List[Thread]:
    """
    Get all threads for a user

    Args:
        db: Database session
        user_id: User ID to filter threads by

    Returns:
        List[Thread]: List of threads
    """
    return chat_crud.get_user_threads(db, user_id)


def update_thread(
    db: Session, thread_id: uuid.UUID, thread_data: ThreadUpdate
) -> Optional[Thread]:
    """
    Update a thread's title

    Args:
        db: Database session
        thread_id: The UUID of the thread to update
        thread_data: The new thread data

    Returns:
        Thread: The updated thread or None if not found
    """
    return chat_crud.update_thread(db, thread_id, thread_data)


def delete_thread(db: Session, thread_id: uuid.UUID) -> bool:
    """
    Delete a thread

    Args:
        db: Database session
        thread_id: The UUID of the thread to delete

    Returns:
        bool: True if deleted, False if not found
    """
    return chat_crud.delete_thread(db, thread_id)


def get_thread_messages(db: Session, thread_id: uuid.UUID) -> List[Conversation]:
    """
    Get all messages in a thread

    Args:
        db: Database session
        thread_id: The UUID of the thread to get messages from

    Returns:
        List[Conversation]: List of messages in the thread
    """
    return chat_crud.get_thread_conversations(db, thread_id)


def get_thread_token_count(db: Session, thread_id: uuid.UUID) -> int:
    """
    Get total token count for all messages in a thread from the database

    Args:
        db: Database session
        thread_id: The UUID of the thread

    Returns:
        int: Total token count for the thread
    """
    result = (
        db.query(func.sum(Conversation.token_count))
        .filter(
            Conversation.thread_id == thread_id, Conversation.token_count.isnot(None)
        )
        .scalar()
    )

    return result or 0


def get_thread_messages_optimized(
    db: Session, thread_id: uuid.UUID
) -> List[Dict[str, Any]]:
    """
    Get thread messages in optimal format directly from database - no Python loops!
    Returns data in exact format needed by chat service.

    Args:
        db: Database session
        thread_id: The UUID of the thread

    Returns:
        List[Dict]: Messages in format expected by chat service
    """
    # Single optimized query that gets exactly what we need
    results = (
        db.query(Conversation.role, Conversation.content)
        .filter(Conversation.thread_id == thread_id)
        .order_by(Conversation.created_at.asc())
        .all()
    )

    # Convert SQLAlchemy results directly to required format
    # This is much faster than individual object access in loops
    return [{"role": row.role, "parts": [{"text": row.content}]} for row in results]


def add_messages_to_thread(
    db: Session,
    thread_id: uuid.UUID,
    user_message: Optional[Dict[str, Any]] = None,
    assistant_response: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Add user message and/or assistant response to a thread

    Args:
        db: Database session
        thread_id: The UUID of the thread to add messages to
        user_message: The user's message (optional)
        assistant_response: The assistant's response (optional)

    Returns:
        bool: True if messages were added, False if thread not found
    """
    thread = get_thread(db, thread_id)
    if not thread:
        return False

    # Add user message if provided
    if user_message is not None:
        user_token_count = user_message.get("token_count") or count_tokens(
            user_message["content"]
        )
        conversation = ConversationCreate(
            thread_id=thread_id,
            role="user",
            content=user_message["content"],
            model=None,
            token_count=user_token_count,
        )
        chat_crud.create_conversation(db, conversation)

    # Add assistant response if provided
    if assistant_response is not None:
        assistant_token_count = assistant_response.get("token_count") or count_tokens(
            assistant_response["content"]
        )
        conversation = ConversationCreate(
            thread_id=thread_id,
            role="model",
            content=assistant_response["content"],
            model=assistant_response.get("model"),
            token_count=assistant_token_count,
        )
        chat_crud.create_conversation(db, conversation)

    # Update the thread's updated_at timestamp to reflect the new activity
    db.query(Thread).filter(Thread.id == thread_id).update(
        {"updated_at": datetime.utcnow()}
    )
    db.commit()

    return True


def get_thread_preview(db: Session, thread_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Get thread preview with last message content and timestamp

    Args:
        db: Database session
        thread_id: The UUID of the thread

    Returns:
        Dict[str, Any]: Thread preview data or None if not found
    """
    thread = get_thread(db, thread_id)
    if not thread:
        return None

    # Get the last message in the thread
    last_conversation = (
        db.query(Conversation)
        .filter(Conversation.thread_id == thread_id)
        .order_by(Conversation.created_at.desc())
        .first()
    )

    return {
        "id": thread.id,
        "title": thread.title,
        "last_message_content": (
            last_conversation.content if last_conversation else None
        ),
        "last_message_timestamp": (
            last_conversation.created_at if last_conversation else None
        ),
        "updated_at": thread.updated_at,
    }


def get_all_thread_previews(db: Session, user_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Get all thread previews for a user with last message content and timestamp

    Args:
        db: Database session
        user_id: User ID to filter threads by

    Returns:
        List[Dict[str, Any]]: List of thread previews
    """
    threads = get_all_threads(db, user_id)
    previews = []

    for thread in threads:
        # Get the last message in the thread
        last_conversation = (
            db.query(Conversation)
            .filter(Conversation.thread_id == thread.id)
            .order_by(Conversation.created_at.desc())
            .first()
        )

        preview = {
            "id": thread.id,
            "title": thread.title,
            "last_message_content": (
                last_conversation.content if last_conversation else None
            ),
            "last_message_timestamp": (
                last_conversation.created_at if last_conversation else None
            ),
            "updated_at": thread.updated_at,
        }
        previews.append(preview)

    return previews
