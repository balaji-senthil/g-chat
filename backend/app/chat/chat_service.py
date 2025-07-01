import logging
import asyncio
import json
from google import genai
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional, Union
from sqlalchemy.orm import Session
from app.threads.thread_service import add_messages_to_thread
from app.config.settings import GOOGLE_API_KEY, DEFAULT_MODEL
from app.utils.rate_limiter import check_token_rate_limit, count_tokens
from sqlalchemy.sql import func

logger = logging.getLogger(__name__)


def get_total_tokens_from_db(db: Session, thread_id: str) -> int:
    """Get total token count for a thread directly from database - no loops needed"""
    from app.models.chat import Conversation

    result = (
        db.query(func.sum(Conversation.token_count))
        .filter(
            Conversation.thread_id == thread_id, Conversation.token_count.isnot(None)
        )
        .scalar()
    )
    return result or 0


async def process_chat_request(
    question: str,
    history: List[Dict[str, Any]],
    model: str,
    thread_id: str,
    db: Session,
):
    """
    Process a chat request and return a response from Google Gemini

    Args:
        question: The user's question
        history: List of message objects with 'role' and 'parts'
        model: The model ID to use
        thread_id: The thread ID to store the response in
        db: Database session

    Returns:
        Streaming response from the model
    """

    try:
        from google.genai import types

        # Create chat session with the new API
        client = genai.Client(api_key=GOOGLE_API_KEY)

        # Create chat session with properly formatted history
        chat = client.chats.create(model=model, history=history)  # type: ignore

        return StreamingResponse(
            stream_response(chat, question, thread_id, db, model),
            media_type="text/event-stream",
        )

    except Exception as e:
        logger.error(f"Error in chat request: {str(e)}")
        return {
            "role": "model",
            "content": f"⚠️ Error processing request: {str(e)}",
        }


async def stream_response(chat, question, thread_id, db, model):
    """Stream the response using the new Gemini API"""
    try:
        # Extract the latest message content for the chat
        response = chat.send_message_stream(question)
        accumulated_text = ""

        for chunk in response:
            if hasattr(chunk, "text") and chunk.text:
                new_text = chunk.text
                accumulated_text += new_text

                # Check token rate limit for each chunk
                chunk_tokens = count_tokens(new_text)
                if not check_token_rate_limit(chunk_tokens):
                    yield f"data: {json.dumps({'content': '⚠️ Token rate limit exceeded. Response truncated.'})}\n\n"
                    yield "data: [DONE]\n\n"
                    return

                # Format as SSE (Server-Sent Events)
                yield f"data: {json.dumps({'content': new_text})}\n\n"
                await asyncio.sleep(0.01)  # Small delay to simulate streaming

        # Store the complete response in the database
        assistant_message = {
            "role": "model",
            "content": accumulated_text,
            "model": model,  # Use the model parameter passed from the request
            "token_count": count_tokens(accumulated_text),
        }
        add_messages_to_thread(
            db,
            thread_id=thread_id,
            user_message=None,
            assistant_response=assistant_message,
        )

        yield "data: [DONE]\n\n"

    except Exception as e:
        logger.error(f"Error in streaming response: {str(e)}")
        yield f"data: {json.dumps({'content': f'⚠️ Error: {str(e)}'})}\n\n"
        yield "data: [DONE]\n\n"
