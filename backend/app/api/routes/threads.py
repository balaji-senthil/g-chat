import logging
from typing import List
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.models.chat import Thread
from app.models.user import User
from app.schemas.chat import (
    ThreadCreate,
    ThreadUpdate,
    ThreadResponse,
    ConversationResponse,
    ThreadPreviewResponse,
)
from app.auth.auth import get_current_active_user
from app.utils.rate_limiter import track_request
from app.threads.thread_service import (
    create_thread,
    get_thread,
    get_all_threads,
    update_thread,
    delete_thread,
    get_thread_messages,
    get_thread_preview,
    get_all_thread_previews,
)
from app.database.database import get_db
from app.models.chat import Conversation

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("", response_model=ThreadResponse)
async def create_new_thread(
    request: Request,
    thread_data: ThreadCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Create a new conversation thread.
    """
    try:
        # Track this request
        track_request()

        thread = create_thread(db, title=thread_data.title, user_id=current_user.id)
        return thread

    except Exception as e:
        logger.error(f"Error creating thread: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating thread: {str(e)}")


@router.get("", response_model=List[ThreadResponse])
async def list_all_threads(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    List all conversation threads for the current user.
    """
    # Track this request
    track_request()

    # Get threads for the current user
    return get_all_threads(db, user_id=current_user.id)


@router.get("/previews", response_model=List[ThreadPreviewResponse])
async def get_thread_previews(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get thread previews with last message content and timestamp for the current user.
    """
    # Track this request
    track_request()

    # Get thread previews for the current user
    return get_all_thread_previews(db, user_id=current_user.id)


@router.get("/{thread_id}", response_model=ThreadResponse)
async def get_thread_by_id(
    request: Request,
    thread_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get a specific thread by ID.
    """
    # Track this request
    track_request()

    thread = get_thread(db, thread_id)
    if not thread:
        raise HTTPException(
            status_code=404, detail=f"Thread with ID {thread_id} not found"
        )

    # Verify user owns this thread
    if thread.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to access this thread",
        )

    return thread


@router.put("/{thread_id}", response_model=ThreadResponse)
async def update_thread_by_id(
    request: Request,
    thread_id: uuid.UUID,
    thread_data: ThreadUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Update a specific thread.
    """
    try:
        # Track this request
        track_request()

        # First check if thread exists and belongs to user
        thread = get_thread(db, thread_id)
        if not thread:
            raise HTTPException(
                status_code=404, detail=f"Thread with ID {thread_id} not found"
            )

        if thread.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to update this thread",
            )

        updated_thread = update_thread(db, thread_id, thread_data)
        if not updated_thread:
            raise HTTPException(
                status_code=500, detail=f"Error updating thread {thread_id}"
            )

        return updated_thread

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating thread: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{thread_id}")
async def delete_thread_by_id(
    request: Request,
    thread_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Delete a specific thread.
    """
    try:
        # Track this request
        track_request()

        # First check if thread exists and belongs to user
        thread = get_thread(db, thread_id)
        if not thread:
            raise HTTPException(
                status_code=404, detail=f"Thread with ID {thread_id} not found"
            )

        if thread.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to delete this thread",
            )

        success = delete_thread(db, thread_id)
        if not success:
            raise HTTPException(
                status_code=500, detail=f"Error deleting thread {thread_id}"
            )

        return {"message": f"Thread '{thread.title}' deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting thread: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{thread_id}/messages", response_model=List[ConversationResponse])
async def get_messages_for_thread(
    request: Request,
    thread_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get all messages in a thread.
    """
    # Track this request
    track_request()

    thread = get_thread(db, thread_id)
    if not thread:
        raise HTTPException(
            status_code=404, detail=f"Thread with ID {thread_id} not found"
        )

    # Verify user owns this thread
    if thread.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to access this thread",
        )

    return get_thread_messages(db, thread_id)


@router.delete("/{thread_id}/messages")
async def clear_thread_messages(
    request: Request,
    thread_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Clear all messages in a thread.
    """
    # Track this request
    track_request()

    thread = get_thread(db, thread_id)
    if not thread:
        raise HTTPException(
            status_code=404, detail=f"Thread with ID {thread_id} not found"
        )

    # Verify user owns this thread
    if thread.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to clear messages in this thread",
        )

    # Delete all conversations for this thread
    db.query(Conversation).filter(Conversation.thread_id == thread_id).delete()
    db.commit()

    return {"message": "Messages cleared successfully"}
