import json
import re
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import delete, exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import (
    cache,
    conv_detail_key,
    conv_list_key,
    invalidate_all_conversations,
    invalidate_conversations,
)
from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user, owned_conversation
from app.models import DEFAULT_TITLE, Conversation, Message, User
from app.schemas import (
    ConversationCreate,
    ConversationDetail,
    ConversationOut,
    ConversationUpdate,
    MessageOut,
)

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


async def load_messages(db: AsyncSession, conv_id: uuid.UUID) -> list[Message]:
    rows = await db.scalars(select(Message).where(Message.conversation_id == conv_id).order_by(Message.id))
    return list(rows)


@router.get("", response_model=list[ConversationOut])
async def list_conversations(
    q: str | None = Query(default=None, max_length=200, description="Filter by title or message text"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (q or "").strip()
    if not q:
        cached = await cache.get(conv_list_key(user.id))
        if cached is not None:
            return cached

    stmt = select(Conversation).where(Conversation.user_id == user.id)
    if q:
        pattern = f"%{_escape_like(q)}%"
        stmt = stmt.where(
            or_(
                Conversation.title.ilike(pattern, escape="\\"),
                exists().where(
                    Message.conversation_id == Conversation.id,
                    Message.content.ilike(pattern, escape="\\"),
                ),
            )
        )
    rows = (await db.scalars(stmt.order_by(Conversation.updated_at.desc()).limit(200))).all()
    data = [ConversationOut.model_validate(r).model_dump(mode="json") for r in rows]
    if not q:
        await cache.set(conv_list_key(user.id), data, get_settings().cache_ttl_seconds)
    return data


@router.post("", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: ConversationCreate | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    title = (payload.title.strip() if payload and payload.title else "") or DEFAULT_TITLE
    conv = Conversation(user_id=user.id, title=title)
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    await invalidate_conversations(user.id)
    return conv


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_conversations(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Conversation).where(Conversation.user_id == user.id))
    await db.commit()
    await invalidate_all_conversations(user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conv: Conversation = Depends(owned_conversation),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    key = conv_detail_key(user.id, conv.id)
    cached = await cache.get(key)
    if cached is not None:
        return cached
    messages = await load_messages(db, conv.id)
    data = ConversationDetail(
        **ConversationOut.model_validate(conv).model_dump(),
        messages=[MessageOut.model_validate(m) for m in messages],
    ).model_dump(mode="json")
    await cache.set(key, data, get_settings().cache_ttl_seconds)
    return data


@router.patch("/{conversation_id}", response_model=ConversationOut)
async def rename_conversation(
    payload: ConversationUpdate,
    conv: Conversation = Depends(owned_conversation),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv.title = payload.title.strip()
    await db.commit()
    await db.refresh(conv)
    await invalidate_conversations(user.id, conv.id)
    return conv


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conv: Conversation = Depends(owned_conversation),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv_id = conv.id
    await db.execute(delete(Conversation).where(Conversation.id == conv_id))  # messages cascade in the DB
    await db.commit()
    await invalidate_conversations(user.id, conv_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------- export
def _slug(title: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "-", title).strip("-").lower()[:60] or "conversation"


@router.get("/{conversation_id}/export")
async def export_conversation(
    fmt: Literal["markdown", "json", "text"] = Query(default="markdown", alias="format"),
    conv: Conversation = Depends(owned_conversation),
    db: AsyncSession = Depends(get_db),
):
    messages = await load_messages(db, conv.id)
    who = {"user": "You", "assistant": "Assistant"}
    if fmt == "json":
        body = json.dumps(
            {
                "id": str(conv.id),
                "title": conv.title,
                "created_at": conv.created_at.isoformat(),
                "messages": [
                    {"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
                    for m in messages
                ],
            },
            indent=2,
            ensure_ascii=False,
        )
        media, ext = "application/json", "json"
    elif fmt == "text":
        body = "\n\n".join(f"{who[m.role]}:\n{m.content}" for m in messages)
        body = f"{conv.title}\n{'=' * len(conv.title)}\n\n{body}\n"
        media, ext = "text/plain; charset=utf-8", "txt"
    else:
        body = f"# {conv.title}\n\n" + "\n\n".join(f"### {who[m.role]}\n\n{m.content}" for m in messages) + "\n"
        media, ext = "text/markdown; charset=utf-8", "md"

    return Response(
        content=body,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{_slug(conv.title)}.{ext}"'},
    )
