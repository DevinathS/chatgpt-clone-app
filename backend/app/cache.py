"""Tiny cache abstraction: Redis when REDIS_URL is set and reachable,
otherwise a process-local in-memory TTL cache. Values are JSON-serialisable."""
import json
import logging
import time
import uuid
from typing import Any

logger = logging.getLogger("chatclone.cache")


class Cache:
    def __init__(self) -> None:
        self._redis: Any = None
        self._mem: dict[str, tuple[float, str]] = {}

    @property
    def backend(self) -> str:
        return "redis" if self._redis else "memory"

    async def connect(self, url: str | None) -> None:
        if not url:
            logger.info("Cache backend: in-memory")
            return
        try:
            import redis.asyncio as aioredis

            client = aioredis.from_url(url, decode_responses=True)
            await client.ping()
            self._redis = client
            logger.info("Cache backend: redis (%s)", url)
        except Exception as exc:  # noqa: BLE001 - any failure falls back to memory
            logger.warning("Redis unavailable (%s); using in-memory cache", exc)
            self._redis = None

    async def close(self) -> None:
        if self._redis:
            await self._redis.aclose()

    async def get(self, key: str) -> Any | None:
        if self._redis:
            try:
                raw = await self._redis.get(key)
                return json.loads(raw) if raw is not None else None
            except Exception:  # noqa: BLE001
                return None
        item = self._mem.get(key)
        if not item:
            return None
        expires, raw = item
        if expires < time.monotonic():
            self._mem.pop(key, None)
            return None
        return json.loads(raw)

    async def set(self, key: str, value: Any, ttl: int) -> None:
        raw = json.dumps(value)
        if self._redis:
            try:
                await self._redis.set(key, raw, ex=ttl)
            except Exception:  # noqa: BLE001
                pass
            return
        if len(self._mem) > 5000:
            now = time.monotonic()
            self._mem = {k: v for k, v in self._mem.items() if v[0] > now}
        self._mem[key] = (time.monotonic() + ttl, raw)

    async def delete(self, *keys: str) -> None:
        if not keys:
            return
        if self._redis:
            try:
                await self._redis.delete(*keys)
            except Exception:  # noqa: BLE001
                pass
            return
        for k in keys:
            self._mem.pop(k, None)

    async def delete_prefix(self, prefix: str) -> None:
        if self._redis:
            try:
                keys = [k async for k in self._redis.scan_iter(match=f"{prefix}*")]
                if keys:
                    await self._redis.delete(*keys)
            except Exception:  # noqa: BLE001
                pass
            return
        for k in [k for k in self._mem if k.startswith(prefix)]:
            self._mem.pop(k, None)


cache = Cache()


# ---- key helpers (one place so invalidation stays consistent) ----
def conv_list_key(user_id: uuid.UUID) -> str:
    return f"u:{user_id}:convs"


def conv_detail_key(user_id: uuid.UUID, conv_id: uuid.UUID) -> str:
    return f"u:{user_id}:conv:{conv_id}"


def settings_key(user_id: uuid.UUID) -> str:
    return f"u:{user_id}:settings"


async def invalidate_conversations(user_id: uuid.UUID, conv_id: uuid.UUID | None = None) -> None:
    keys = [conv_list_key(user_id)]
    if conv_id:
        keys.append(conv_detail_key(user_id, conv_id))
    await cache.delete(*keys)


async def invalidate_all_conversations(user_id: uuid.UUID) -> None:
    await cache.delete_prefix(f"u:{user_id}:conv")
