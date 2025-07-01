import os
import logging
import hashlib
import uuid
import mimetypes
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import HTTPException, UploadFile

from app.config.settings import UPLOAD_DIR, MAX_UPLOAD_SIZE, ALLOWED_EXTENSIONS
from app.models.base import UploadedFile

logger = logging.getLogger(__name__)

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Storage for uploaded files
uploaded_files: Dict[str, UploadedFile] = {}


async def save_uploaded_file(file: UploadFile) -> UploadedFile:
    """
    Save an uploaded file and return metadata

    Args:
        file: The uploaded file

    Returns:
        UploadedFile: Metadata about the uploaded file

    Raises:
        HTTPException: For invalid file types, sizes, or server errors
    """
    # Extract file extension and check if it's allowed
    filename = file.filename
    file_extension = os.path.splitext(filename)[1].lower()

    if file_extension not in ALLOWED_EXTENSIONS:
        logger.warning(f"Rejected file upload with extension: {file_extension}")
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Generate a unique file ID using hash of filename and timestamp
    timestamp = datetime.now().isoformat()
    unique_id = hashlib.md5(f"{filename}{timestamp}{uuid.uuid4()}".encode()).hexdigest()

    # Create a path with the unique ID while preserving the original extension
    safe_filename = f"{unique_id}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    # Read file content in chunks to avoid loading large files into memory
    file_size = 0
    with open(file_path, "wb") as buffer:
        # Read and write in 1MB chunks
        chunk_size = 1024 * 1024  # 1MB
        while chunk := await file.read(chunk_size):
            file_size += len(chunk)

            # Check file size limit
            if file_size > MAX_UPLOAD_SIZE:
                # Remove the partially uploaded file
                buffer.close()
                os.remove(file_path)
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size: {MAX_UPLOAD_SIZE / (1024 * 1024):.1f} MB",
                )

            buffer.write(chunk)

    # Determine the content type
    content_type = (
        file.content_type
        or mimetypes.guess_type(filename)[0]
        or "application/octet-stream"
    )

    # Store file metadata
    file_data = UploadedFile(
        file_id=unique_id,
        filename=filename,
        content_type=content_type,
        size=file_size,
        upload_time=timestamp,
    )

    uploaded_files[unique_id] = file_data

    logger.info(
        f"File uploaded successfully: {filename} ({file_size} bytes, type: {content_type})"
    )

    return file_data


def get_file_info(file_id: str) -> Optional[UploadedFile]:
    """
    Get information about a specific uploaded file

    Args:
        file_id: The ID of the file to get information for

    Returns:
        UploadedFile: Metadata about the requested file or None if not found
    """
    return uploaded_files.get(file_id)


def list_files() -> List[UploadedFile]:
    """
    List all uploaded files

    Returns:
        List[UploadedFile]: List of metadata for all uploaded files
    """
    return list(uploaded_files.values())


def delete_file(file_id: str) -> bool:
    """
    Delete an uploaded file

    Args:
        file_id: The ID of the file to delete

    Returns:
        bool: True if file was deleted, False otherwise

    Raises:
        HTTPException: If the file cannot be deleted
    """
    if file_id not in uploaded_files:
        return False

    file_data = uploaded_files[file_id]
    file_extension = os.path.splitext(file_data.filename)[1].lower()
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_extension}")

    # Delete the file if it exists
    if os.path.exists(file_path):
        os.remove(file_path)

    # Remove from our tracking
    del uploaded_files[file_id]

    logger.info(f"File deleted: {file_data.filename} (ID: {file_id})")
    return True


def prepare_file_parts(file_ids: List[str]) -> List[dict]:
    """
    Prepare file parts for use in chat requests

    Args:
        file_ids: List of file IDs to include in the chat

    Returns:
        List[dict]: List of file parts in the format expected by Gemini

    Raises:
        HTTPException: If any file is not found
    """
    file_parts = []

    for file_id in file_ids:
        if file_id not in uploaded_files:
            raise HTTPException(
                status_code=404, detail=f"File with ID {file_id} not found"
            )

        file_data = uploaded_files[file_id]
        file_extension = os.path.splitext(file_data.filename)[1].lower()
        file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_extension}")

        # Check if the file exists
        if not os.path.exists(file_path):
            logger.error(f"File {file_id} exists in registry but not on disk")
            raise HTTPException(
                status_code=404, detail=f"File with ID {file_id} is missing"
            )

        # Add file to parts based on its MIME type
        mime_type = file_data.content_type

        # Handle different file types - currently we're just handling images
        # which is what the Gemini model supports natively
        if mime_type.startswith("image/"):
            logger.info(f"Adding image file to request: {file_data.filename}")

            # Create an image part
            with open(file_path, "rb") as img_file:
                image_bytes = img_file.read()
                file_parts.append({"mime_type": mime_type, "data": image_bytes})
        else:
            # For non-image files, we can extract text if it's a text-based file
            # and add it as context, or otherwise just mention the file
            logger.info(f"Adding reference to non-image file: {file_data.filename}")
            # Add a text note about the file reference
            file_parts.append(
                {"text": f"[Reference to uploaded file: {file_data.filename}]"}
            )

    return file_parts
