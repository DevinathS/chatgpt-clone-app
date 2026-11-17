"""Chat endpoints: send a message (plain JSON or streamed via Server-Sent Events)."""
import asyncio
import json
import uuid
from collections.abc import AsyncIterator
from typing import Any

import anyio
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import invalidate_conversations
from app.database import SessionLocal, get_db
from app.deps import get_current_user, owned_conversation
from app.models import DEFAULT_TITLE, Conversation, Message, User
from app.schemas import ConversationOut, MessageCreate, MessageOut, SendResult
from app.services.responder import SPEED_DELAY, Reply, build_reply, tokenize
from app.services.user_settings import get_or_create_settings

router = APIRouter(prefix="/api/conversations", tags=["chat"])


def _sse(event: str, data: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _title_from(text: str) -> str:
    line = " ".join(text.split())
    return line if len(line) <= 48 else line[:47].rstrip() + "…"


async def _add_user_message(db: AsyncSession, conv: Conversation, content: str, user_id: uuid.UUID) -> Message:
    msg = Message(conversation_id=conv.id, role="user", content=content, status="complete")
    db.add(msg)
    if conv.title == DEFAULT_TITLE:
        conv.title = _title_from(content)
    conv.updated_at = func.now()
    await db.commit()
    await db.refresh(msg)
    await db.refresh(conv)
    await invalidate_conversations(user_id, conv.id)
    return msg


async def _persist_assistant(
    conv_id: uuid.UUID, user_id: uuid.UUID, text: str, actions: list[dict] | None, status_: str
) -> dict | None:
    """Save the assistant reply using its own session (the request's session may be gone)."""
    if not text.strip():
        return None
    async with SessionLocal() as session:
        msg = Message(conversation_id=conv_id, role="assistant", content=text, actions=actions, status=status_)
        session.add(msg)
        conv = await session.get(Conversation, conv_id)
        if conv:
            conv.updated_at = func.now()
        await session.commit()
        await session.refresh(msg)
        data = MessageOut.model_validate(msg).model_dump(mode="json")
    await invalidate_conversations(user_id, conv_id)
    return data


def _stream_reply(
    request: Request,
    conv: Conversation,
    user: User,
    reply: Reply,
    delay: float,
    user_message: Message | None,
) -> StreamingResponse:
    conv_id, user_id = conv.id, user.id
    start_payload = {
        "conversation": ConversationOut.model_validate(conv).model_dump(mode="json"),
        "user_message": MessageOut.model_validate(user_message).model_dump(mode="json") if user_message else None,
    }

    async def event_stream() -> AsyncIterator[str]:
        parts: list[str] = []
        stopped = False
        try:
            yield _sse("start", start_payload)
            for chunk in tokenize(reply.text):
                parts.append(chunk)
                yield _sse("token", {"text": chunk})
                await asyncio.sleep(delay)
                if await request.is_disconnected():
                    stopped = True
                    break
        except (asyncio.CancelledError, GeneratorExit):
            # Client pressed "Stop" / closed the tab: keep what was generated so far.
            with anyio.CancelScope(shield=True):
                await _persist_assistant(conv_id, user_id, "".join(parts), None, "stopped")
            raise

        saved = await _persist_assistant(
            conv_id,
            user_id,
            "".join(parts),
            None if stopped else reply.actions,
            "stopped" if stopped else "complete",
        )
        if saved and not stopped:
            yield _sse("done", {"message": saved})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@router.post("/{conversation_id}/messages", response_model=SendResult, status_code=status.HTTP_201_CREATED)
async def send_message(
    payload: MessageCreate,
    conv: Conversation = Depends(owned_conversation),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Non-streaming variant: returns both messages once the reply is complete."""
    prefs = await get_or_create_settings(db, user.id)
    user_msg = await _add_user_message(db, conv, payload.content, user.id)
    reply = build_reply(payload.content, user.display_name, prefs.custom_instructions)
    saved = await _persist_assistant(conv.id, user.id, reply.text, reply.actions, "complete")
    await db.refresh(conv)
    return SendResult(
        conversation=ConversationOut.model_validate(conv),
        user_message=MessageOut.model_validate(user_msg),
        assistant_message=MessageOut.model_validate(saved),
    )


@router.post("/{conversation_id}/messages/stream")
async def stream_message(
    payload: MessageCreate,
    request: Request,
    conv: Conversation = Depends(owned_conversation),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Server-Sent Events: `start` -> many `token` -> `done`."""
    prefs = await get_or_create_settings(db, user.id)
    user_msg = await _add_user_message(db, conv, payload.content, user.id)
    reply = build_reply(payload.content, user.display_name, prefs.custom_instructions)
    return _stream_reply(request, conv, user, reply, SPEED_DELAY.get(prefs.stream_speed, 0.035), user_msg)


@router.post("/{conversation_id}/regenerate/stream")
async def regenerate_stream(
    request: Request,
    conv: Conversation = Depends(owned_conversation),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Drop the last assistant message and stream a fresh answer to the last user message."""
    last = await db.scalar(select(Message).where(Message.conversation_id == conv.id).order_by(Message.id.desc()).limit(1))
    if last is not None and last.role == "assistant":
        await db.execute(delete(Message).where(Message.id == last.id))
        await db.commit()
    prompt_msg = await db.scalar(
        select(Message)
        .where(Message.conversation_id == conv.id, Message.role == "user")
        .order_by(Message.id.desc())
        .limit(1)
    )
    if prompt_msg is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nothing to regenerate")
    await invalidate_conversations(user.id, conv.id)
    prefs = await get_or_create_settings(db, user.id)
    reply = build_reply(prompt_msg.content, user.display_name, prefs.custom_instructions)
    return _stream_reply(request, conv, user, reply, SPEED_DELAY.get(prefs.stream_speed, 0.035), None)
