import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import UserSettings


async def get_or_create_settings(db: AsyncSession, user_id: uuid.UUID) -> UserSettings:
    row = await db.get(UserSettings, user_id)
    if row is None:
        row = UserSettings(user_id=user_id, theme="system", stream_speed="normal", custom_instructions="")
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row
