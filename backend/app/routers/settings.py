from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import cache, settings_key
from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import SettingsOut, SettingsUpdate
from app.services.user_settings import get_or_create_settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsOut)
async def read_settings(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cached = await cache.get(settings_key(user.id))
    if cached is not None:
        return cached
    row = await get_or_create_settings(db, user.id)
    data = SettingsOut.model_validate(row).model_dump()
    await cache.set(settings_key(user.id), data, get_settings().cache_ttl_seconds)
    return data


@router.put("", response_model=SettingsOut)
async def update_settings(
    payload: SettingsUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    row = await get_or_create_settings(db, user.id)
    for field, value in payload.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(row, field, value)
    await db.commit()
    await db.refresh(row)
    await cache.delete(settings_key(user.id))
    return row
