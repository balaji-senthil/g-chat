from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional
from uuid import UUID


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Username for the account",
        alias="name",
    )

    class Config:
        populate_by_name = True


class UserCreate(UserBase):
    password: str = Field(
        ..., min_length=8, description="Password must be at least 8 characters long"
    )


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(
        None,
        min_length=3,
        max_length=50,
        description="Username for the account",
        alias="name",
    )
    password: Optional[str] = Field(
        None, min_length=8, description="Password must be at least 8 characters long"
    )
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None

    class Config:
        populate_by_name = True


class UserInDB(UserBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_active: bool = True
    is_admin: bool = False

    class Config:
        from_attributes = True


class User(UserBase):
    id: UUID
    created_at: str
    is_active: bool = True
    is_admin: bool = False

    class Config:
        from_attributes = True
        populate_by_name = True
