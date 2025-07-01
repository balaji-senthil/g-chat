import logging
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.models.base import Token
from app.schemas.user import UserCreate, User
from app.auth.auth import (
    create_access_token,
    get_current_active_user,
)
from app.config.settings import JWT_ACCESS_TOKEN_EXPIRE_MINUTES
from app.database.database import get_db
from app.crud import user as user_crud
from app.utils.password import verify_password

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=User)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.

    Args:
        user_data: User registration data
        db: Database session

    Returns:
        User: The newly created user

    Raises:
        HTTPException: If the email is already registered
    """
    # Check if email already exists
    if user_crud.get_user_by_email(db, email=user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    try:
        # Create new user in database
        db_user = user_crud.create_user(db=db, user=user_data)

        logger.info(f"User registered: {db_user.id} - {user_data.email}")

        # Return user without password hash
        return User(
            id=db_user.id,
            email=db_user.email,
            name=db_user.username,
            created_at=db_user.created_at.isoformat() if db_user.created_at else None,
            is_active=db_user.is_active,
            is_admin=db_user.is_admin,
        )

    except Exception as e:
        logger.error(f"Error registering user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error registering user: {str(e)}",
        )


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """
    Login to get an access token.

    Args:
        form_data: OAuth2 form with username (email) and password
        db: Database session

    Returns:
        Token: JWT access token

    Raises:
        HTTPException: If authentication fails
    """
    # Get user from database
    user = user_crud.get_user_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token_expires = timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    # Calculate expiration time as Unix timestamp
    expires_at = int((datetime.utcnow() + access_token_expires).timestamp())

    return Token(access_token=access_token, token_type="bearer", expires_at=expires_at)


@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Get information about the current authenticated user.

    Args:
        current_user: The current authenticated user

    Returns:
        User: Information about the current user
    """
    return current_user
