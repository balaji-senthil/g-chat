import logging
from fastapi import APIRouter, Depends, Request, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import List, Dict, Any, Optional, Union
from sqlalchemy.orm import Session
import uuid


from app.models.base import ChatRequestWithThread
from app.auth.auth import get_current_active_user
from app.utils.rate_limiter import count_tokens, track_request
from app.utils.errors import RateLimitError
from app.chat.chat_service import process_chat_request
from app.threads.thread_service import create_thread, get_thread, add_messages_to_thread
from app.database.database import get_db


logger = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/chat/{thread_id}")
@limiter.limit("60/minute")
async def chat_with_thread(
    request: Request,
    chat_request: ChatRequestWithThread,
    thread_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Process a chat request within a specific thread.
    The backend automatically retrieves conversation history from the database.
    """
    try:
        question = chat_request.question

        existing_conversation_history = []
        try:
            from app.threads.thread_service import get_thread_messages_optimized

            # Single optimized database query - no Python loops!
            existing_conversation_history = get_thread_messages_optimized(db, thread_id)

        except Exception as e:
            logger.warning(f"Failed to get existing thread messages: {str(e)}")

        # Build the complete conversation context: history + new message
        complete_messages = existing_conversation_history

        new_user_message = {
            "role": "user",
            "content": question,
            "token_count": count_tokens(question),
        }

        # Store the new user message in the thread
        add_messages_to_thread(
            db,
            thread_id=thread_id,
            user_message=new_user_message,
            assistant_response=None,
        )

        # Process with complete conversation context
        response_stream = await process_chat_request(
            question=question,
            history=complete_messages,  # Use complete conversation context
            model=chat_request.model,
            thread_id=thread_id,
            db=db,
        )

        return response_stream

    except RateLimitError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error processing chat request with thread: {str(e)}")
        if isinstance(e, HTTPException):
            raise
        else:
            raise HTTPException(status_code=500, detail=str(e))
