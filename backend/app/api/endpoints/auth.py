from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import EmailStr
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import Optional
from app.auth.auth import (
    create_access_token,
    verify_password,
)
from app.config.settings import JWT_ACCESS_TOKEN_EXPIRE_MINUTES
from app.models.base import Token, User
from app.database.database import get_db
from app.crud import user as user_crud
from app.schemas.user import UserCreate as DBUserCreate
import uuid

router = APIRouter()


class UserCreate(DBUserCreate):
    username: str  # This will be mapped to username via alias

    class Config:
        populate_by_name = True


@router.post("/register", response_model=Token)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = user_crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

    # Create new user
    db_user = user_crud.create_user(
        db=db,
        user=DBUserCreate(
            email=user.email, username=user.username, password=user.password
        ),
    )

    # Create access token
    access_token_expires = timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(db_user.id)}, expires_delta=access_token_expires
    )

    # Calculate expiration time as Unix timestamp
    expires_at = int((datetime.utcnow() + access_token_expires).timestamp())

    return Token(access_token=access_token, token_type="bearer", expires_at=expires_at)


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
