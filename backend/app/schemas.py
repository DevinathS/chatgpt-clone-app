import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

ThemeMode = Literal["light", "dark", "system"]
StreamSpeed = Literal["slow", "normal", "fast"]


# ---------- auth / users ----------
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: EmailStr
    display_name: str


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProfileUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)


# ---------- settings ----------
class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    theme: ThemeMode
    stream_speed: StreamSpeed
    custom_instructions: str


class SettingsUpdate(BaseModel):
    theme: ThemeMode | None = None
    stream_speed: StreamSpeed | None = None
    custom_instructions: str | None = Field(default=None, max_length=2000)


# ---------- messages / conversations ----------
class ActionOption(BaseModel):
    label: str
    value: str


class ActionGroup(BaseModel):
    type: Literal["buttons", "menu"]
    label: str | None = None
    options: list[ActionOption]


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    role: Literal["user", "assistant"]
    content: str
    actions: list[ActionGroup] | None = None
    status: str = "complete"
    created_at: datetime


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime


class ConversationDetail(ConversationOut):
    messages: list[MessageOut]


class ConversationCreate(BaseModel):
    title: str | None = Field(default=None, max_length=200)


class ConversationUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=20000)


class SendResult(BaseModel):
    conversation: ConversationOut
    user_message: MessageOut
    assistant_message: MessageOut
