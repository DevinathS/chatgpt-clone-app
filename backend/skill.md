---
name: chatclone-backend
description: Guide to the ChatClone FastAPI backend. Use when adding endpoints, changing the schema, touching streaming/auth/caching, or replacing the scripted responder with a real LLM.
---

# ChatClone backend skill

## 1. What this service is

An async REST + Server-Sent-Events API that stores users, settings, conversations and messages in
PostgreSQL and serves them to the React frontend. It has **no LLM**: replies come from
`app/services/responder.py`, a keyword-driven script that returns Markdown plus optional structured
`actions` (buttons / menus).

**Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async, `asyncpg`), Alembic, Pydantic v2 /
pydantic-settings, PyJWT, bcrypt, Redis (optional, in-memory fallback).

## 2. Layout

```
backend/
├── app/
│   ├── main.py            # app factory, CORS, lifespan (cache connect/close), /api/health
│   ├── config.py          # Settings (env-driven) via get_settings()
│   ├── database.py        # engine, SessionLocal, Base, get_db dependency
│   ├── models.py          # User, UserSettings, Conversation, Message
│   ├── schemas.py         # Pydantic request/response models
│   ├── security.py        # bcrypt hashing, JWT create/decode
│   ├── deps.py            # get_current_user, owned_conversation
│   ├── cache.py           # Cache (Redis | memory) + key helpers + invalidation
│   ├── routers/
│   │   ├── auth.py        # register, login, me (GET/PATCH)
│   │   ├── conversations.py  # CRUD, search (?q=), export
│   │   ├── chat.py        # send, send/stream (SSE), regenerate/stream (SSE)
│   │   └── settings.py    # GET/PUT user settings
│   └── services/
│       ├── responder.py   # build_reply() + tokenize()  <-- the "fake LLM"
│       └── user_settings.py
├── alembic/               # env.py (async), versions/0001_initial.py
├── tests/                 # pure-Python unit tests (responder, security)
├── Dockerfile, requirements*.txt, alembic.ini, pytest.ini, .env.example
```

## 3. Data model

| Table | Key columns | Notes |
| --- | --- | --- |
| `users` | `id` UUID, `email` unique, `display_name`, `password_hash` | emails stored lower-case |
| `user_settings` | `user_id` PK/FK, `theme`, `stream_speed`, `custom_instructions` | created at registration (or lazily) |
| `conversations` | `id` UUID, `user_id` FK, `title`, `created_at`, `updated_at` | index `(user_id, updated_at)`; default title `"New chat"` |
| `messages` | `id` int identity, `conversation_id` FK, `role`, `content`, `actions` JSONB, `status` | `status`: `complete` / `stopped`; order by `id` |

All FKs use `ON DELETE CASCADE`. Deleting a conversation uses a Core `delete()` statement so the
database cascades; there are intentionally **no ORM relationships**, which avoids async lazy-load errors.

## 4. Conventions (follow these)

1. **Always async.** Use `await db.scalar(...)`, `await db.scalars(...)`, `await db.commit()`. Never
   call sync DB APIs or `time.sleep`; use `asyncio.sleep`.
2. **Ownership checks via dependencies.** Use `Depends(get_current_user)` and
   `Depends(owned_conversation)`. `owned_conversation` returns 404 (not 403) for other users' data.
3. **Schemas in, schemas out.** Every route declares `response_model`. ORM objects are converted with
   `Model.model_validate(obj)` (all output schemas set `from_attributes=True`).
4. **Invalidate the cache on every write.** Call `invalidate_conversations(user_id, conv_id)` (or
   `invalidate_all_conversations`, or `cache.delete(settings_key(...))`) after the commit.
5. **Cache stores JSON-safe dicts** (`model_dump(mode="json")`), never ORM objects.
6. **No `from __future__ import annotations` in routers/schemas.** FastAPI resolves types at runtime.
7. **Schema changes require a migration.** Never rely on `create_all`.
8. Keep secrets in env vars via `config.Settings`; never hard-code.

## 5. Streaming design (read before editing `chat.py`)

Endpoint: `POST /api/conversations/{id}/messages/stream` → `text/event-stream`.

```
event: start  → {conversation, user_message}
event: token  → {text}                (one per chunk)
event: done   → {message}             (the saved assistant message)
```

Rules that keep it correct:

* **Do all DB work that needs the request session *before* returning `StreamingResponse`**
  (validate, insert the user message, load settings, build the reply). The generator must not use the
  request-scoped session; it opens its own via `SessionLocal()` inside `_persist_assistant`.
* **Persist on cancel.** The generator catches `asyncio.CancelledError` / `GeneratorExit` and saves the
  partial text with `status="stopped"` inside `anyio.CancelScope(shield=True)` so the write isn't
  cancelled too. It also polls `request.is_disconnected()` between chunks.
* **Disable proxy buffering** (`X-Accel-Buffering: no`, nginx `proxy_buffering off`).
* Empty partial replies are not saved.
* `actions` are only attached to *completed* replies.

## 6. Replacing the scripted responder with a real LLM

1. Keep the contract: produce text chunks plus optional `actions` list of
   `{type: "buttons"|"menu", label?, options: [{label, value}]}`.
2. In `chat.py`, `_stream_reply` currently iterates `tokenize(reply.text)`. Replace that loop with
   `async for chunk in llm.stream(history)`; keep appending to `parts`, yielding `token` events, and the
   cancel/persist logic.
3. Build `history` from `load_messages()` (see `conversations.py`) and pass
   `UserSettings.custom_instructions` as the system prompt.
4. Remove the `asyncio.sleep(delay)` throttle (or keep it only for the demo responder).

## 7. How to add things

**New endpoint:** add a function in the relevant router, declare `response_model`, use the
dependencies above, invalidate cache keys if it writes, add it to the README API table.

**New column/table:**
1. Edit `models.py`.
2. `alembic revision --autogenerate -m "add x"` and **read the generated file** (JSONB/UUID types and
   server defaults often need manual fixes).
3. `alembic upgrade head`.
4. Update `schemas.py` and any cache serialisation.

**New canned reply:** add a `_xxx_reply()` in `responder.py`, route to it from `build_reply()` (order
matters: earlier checks win), and cover it in `tests/test_responder.py`.

**New setting:** add the column + migration, extend `SettingsOut` / `SettingsUpdate` in `schemas.py`
(use `Literal` for enums), and surface it in the frontend settings slice.

## 8. Running & testing

```bash
pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload
pytest                       # responder + security tests, no DB required
```

Manual smoke test with curl:

```bash
TOKEN=$(curl -s localhost:8000/api/auth/register -H 'content-type: application/json' \
  -d '{"email":"a@b.co","password":"password1","display_name":"Ann"}' | python -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
CID=$(curl -s -X POST localhost:8000/api/conversations -H "authorization: Bearer $TOKEN" | python -c 'import sys,json;print(json.load(sys.stdin)["id"])')
curl -N -X POST localhost:8000/api/conversations/$CID/messages/stream \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"content":"show me a table"}'
```

## 9. Gotchas

* `DATABASE_URL` must start with `postgresql+asyncpg://`.
* Alembic env is async and reads the URL from `Settings`, not `alembic.ini`.
* bcrypt is CPU-bound; auth routes call it through `run_in_threadpool`.
* The in-memory cache is per-process; with multiple Uvicorn workers use Redis or caches will diverge.
* Search uses `ILIKE` with escaped wildcards. For large data sets add a `pg_trgm` GIN index.
* JWTs are stateless: logout is client-side. Add a deny-list in Redis if you need revocation.
* Anything the responder echoes back is rendered as Markdown by the frontend, which does **not** render
  raw HTML. Keep it that way (don't add `rehype-raw`) to avoid XSS.

## 10. Definition of done for a backend change

- [ ] Route has `response_model` and ownership checks
- [ ] Cache invalidated on writes
- [ ] Migration created and applied if the schema changed
- [ ] Unit test added/updated (`pytest` green)
- [ ] README API table updated
