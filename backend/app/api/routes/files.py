import logging
from typing import List
from fastapi import APIRouter, Depends, Request, HTTPException, UploadFile, File

from app.models.base import UploadedFile, User
from app.auth.auth import get_current_active_user
from app.utils.rate_limiter import track_request
from app.file_management.file_service import (
    save_uploaded_file,
    get_file_info,
    list_files,
    delete_file,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload", response_model=UploadedFile)
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """
    Upload a file to be used in the chat.

    The file will be stored temporarily and can be referenced in future chat messages.
    There are size and file type restrictions.
    """
    try:
        # Track this request
        track_request()

        return await save_uploaded_file(file)

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")


@router.get("/files", response_model=List[UploadedFile])
async def get_files(
    request: Request, current_user: User = Depends(get_current_active_user)
):
    """
    List all uploaded files.
    """
    # Track this request
    track_request()

    return list_files()


@router.get("/files/{file_id}", response_model=UploadedFile)
async def get_file_by_id(request: Request, file_id: str):
    """
    Get information about a specific uploaded file.
    """
    # Track this request
    track_request()

    file_data = get_file_info(file_id)
    if not file_data:
        raise HTTPException(status_code=404, detail=f"File with ID {file_id} not found")

    return file_data


@router.delete("/files/{file_id}")
async def remove_file(request: Request, file_id: str):
    """
    Delete an uploaded file.
    """
    # Track this request
    track_request()

    if not get_file_info(file_id):
        raise HTTPException(status_code=404, detail=f"File with ID {file_id} not found")

    try:
        file_data = get_file_info(file_id)
        success = delete_file(file_id)

        if success:
            return {"message": f"File {file_data.filename} deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete file")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file {file_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")
