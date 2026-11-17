import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.cache import cache
from app.config import get_settings
from app.routers import auth, chat, conversations, settings

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await cache.connect(get_settings().redis_url)
    yield
    await cache.close()


app = FastAPI(title="ChatClone API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(conversations.router)
app.include_router(chat.router)
app.include_router(settings.router)


@app.get("/api/health", tags=["meta"])
async def health():
    return {"status": "ok", "cache": cache.backend}
