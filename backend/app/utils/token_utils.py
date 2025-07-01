"""
Token counting utilities that leverage database optimization
"""

import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.models.chat import Conversation
from app.utils.rate_limiter import count_tokens

logger = logging.getLogger(__name__)


def get_messages_token_count(
    db: Session,
    thread_id: Optional[str] = None,
    conversation_ids: Optional[List[str]] = None,
) -> int:
    """
    Get total token count for messages using optimized database query.

    Args:
        db: Database session
        thread_id: Optional thread ID to get token count for specific thread
        conversation_ids: Optional list of conversation IDs to get token count for

    Returns:
        int: Total token count from database
    """
    query = db.query(func.sum(Conversation.token_count))

    if thread_id:
        query = query.filter(Conversation.thread_id == thread_id)
    elif conversation_ids:
        query = query.filter(Conversation.id.in_(conversation_ids))

    # Only count non-null token counts
    query = query.filter(Conversation.token_count.isnot(None))

    result = query.scalar()
    return result or 0


def calculate_input_tokens_for_messages(
    messages: List[Dict[str, Any]], db: Optional[Session] = None
) -> int:
    """
    Calculate total input tokens for a list of messages efficiently.
    Uses stored token_count if available, otherwise calculates on-the-fly.

    Args:
        messages: List of message dictionaries
        db: Optional database session for bulk lookups

    Returns:
        int: Total token count
    """
    # Use Python's built-in sum() with generator expression for efficiency
    total_tokens = sum(
        msg.get("token_count") or count_tokens(msg["content"]) for msg in messages
    )

    # Cache calculated token counts back to messages for future use
    for msg in messages:
        if msg.get("token_count") is None:
            msg["token_count"] = count_tokens(msg["content"])

    return total_tokens


def get_thread_total_tokens_optimized(db: Session, thread_id: str) -> int:
    """
    Get total token count for a thread using single optimized database query.
    Replaces inefficient Python loops with database aggregation.

    Args:
        db: Database session
        thread_id: Thread ID

    Returns:
        int: Total token count for the thread
    """
    from sqlalchemy import text

    sql = text(
        """
    SELECT COALESCE(SUM(token_count), 0) as total_tokens
    FROM conversations 
    WHERE thread_id = :thread_id 
    AND token_count IS NOT NULL
    """
    )

    result = db.execute(sql, {"thread_id": thread_id}).scalar()
    return result or 0


def get_thread_token_usage_stats(db: Session, thread_id: str) -> Dict[str, Any]:
    """
    Get comprehensive token usage statistics for a thread.

    Args:
        db: Database session
        thread_id: Thread ID

    Returns:
        Dict with token usage statistics
    """
    # Get token counts by role using efficient aggregation
    user_tokens = (
        db.query(func.sum(Conversation.token_count))
        .filter(
            Conversation.thread_id == thread_id,
            Conversation.role == "user",
            Conversation.token_count.isnot(None),
        )
        .scalar()
        or 0
    )

    assistant_tokens = (
        db.query(func.sum(Conversation.token_count))
        .filter(
            Conversation.thread_id == thread_id,
            Conversation.role.in_(
                ["assistant", "model"]
            ),  # Support both during transition
            Conversation.token_count.isnot(None),
        )
        .scalar()
        or 0
    )

    total_tokens = user_tokens + assistant_tokens

    # Get message counts
    message_count = (
        db.query(func.count(Conversation.id))
        .filter(Conversation.thread_id == thread_id)
        .scalar()
        or 0
    )

    return {
        "total_tokens": total_tokens,
        "user_tokens": user_tokens,
        "assistant_tokens": assistant_tokens,
        "message_count": message_count,
        "average_tokens_per_message": (
            total_tokens / message_count if message_count > 0 else 0
        ),
    }
