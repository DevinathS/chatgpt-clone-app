# ChatGPTClone: a full-stack ChatGPT-style chat app

A conversational chat application that reproduces the look and core behaviour of ChatGPT's
interface (sidebar, "Where should we begin?" start screen, streaming replies, light/dark
themes). It is built with **React 19 + TypeScript**, **Redux Toolkit**, **Material UI**,
**FastAPI**, **PostgreSQL**, **Redis** and **Alembic**.

There is **no LLM** behind it. A small rule-based responder (`backend/app/services/responder.py`)
produces the replies so you can focus on the product plumbing: auth, persistence, REST, streaming,
rich rendering. Swap the responder for a real model client later without touching the rest.

---

## Quick start (Docker)

```bash
cp .env.example .env          # optional: set SECRET_KEY
docker compose up --build
```

| Service      | URL                          |
| ------------ | ---------------------------- |
| App (nginx)  | http://localhost:3000        |
| API docs     | http://localhost:8000/docs   |
| Health check | http://localhost:8000/api/health |

On start the backend container runs `alembic upgrade head`, then launches Uvicorn.
Open the app, click **Sign up for free**, and try the suggestion chips.

Stop with `Ctrl+C`; remove data with `docker compose down -v`.

## Local development (without Docker)

Prerequisites: Python 3.12+, Node 20.19+ (or 22+), PostgreSQL 14+, optionally Redis.

**1. Database**

```bash
createdb chatclone            # or: psql -c "create database chatclone"
# default URL expects user/password chat/chat; adjust DATABASE_URL otherwise
```

**2. Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                                  # edit DATABASE_URL / REDIS_URL
alembic upgrade head
uvicorn app.main:app --reload --port 8000
pytest                                                # optional unit tests
```

Leave `REDIS_URL` empty to use the built-in in-memory cache.

**3. Frontend**

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173  (proxies /api -> localhost:8000)
```

Other scripts: `npm run typecheck`, `npm run build`, `npm run preview`.

---

## What to try

Type these into the composer (or click the chips / the **+** menu):

| Prompt                    | Shows                                             |
| ------------------------- | ------------------------------------------------- |
| `Show me a table`         | GitHub-style table rendered with MUI table parts  |
| `Show me an image`        | Inline Markdown images                            |
| `Write some code`         | Highlighted code blocks with a **Copy code** button |
| `Give me a checklist`     | Nested ordered/unordered lists, task list, quote  |
| `Let me choose a topic`   | A dropdown **menu** and quick-answer **buttons**  |
| `What can you do?`        | Capability summary                                |

Press **Stop** while a reply streams to cancel (the partial reply is kept), or **Regenerate**
on the latest answer.

---

## Feature checklist

### Core

| Requirement | Where |
| --- | --- |
| Messaging, conversations, users, settings | `backend/app/models.py`, `routers/*`, `frontend/src/store/*` |
| RESTful chat API (no LLM) | `backend/app/routers/` + scripted `services/responder.py` |
| React + Redux state + MUI theming | `frontend/src/store/`, `frontend/src/theme.ts` (light/dark palettes with custom `surface` tokens) |
| Authentication & persistence | JWT (bcrypt-hashed passwords), PostgreSQL, token kept in `localStorage`, session restored on reload |
| Message streaming | Server-Sent Events: `POST /api/conversations/{id}/messages/stream` parsed in `frontend/src/api/stream.ts` |
| Rich content (images, tables, lists, code) | `frontend/src/components/MarkdownRenderer.tsx` |
| Action buttons / choice menus | Structured `actions` stored as JSONB, rendered by `ActionButtons.tsx` |
| `skill.md` in both repos | `backend/skill.md`, `frontend/skill.md` |

### Bonus

| Feature | Where |
| --- | --- |
| Caching layer | `backend/app/cache.py`: Redis with automatic in-memory fallback |
| Docker + compose, separate Dockerfiles | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` |
| Migrations | Alembic: `backend/alembic/` |
| History search / filter | Sidebar search (title **and** message text, server-side) + date grouping |
| Copy message | Hover any message; code blocks have their own copy button |
| Markdown rendering | `react-markdown` + GFM + `highlight.js` |
| Export conversation | `GET /api/conversations/{id}/export?format=markdown|json|text` (top-bar download icon) |
| README | You are here |

Also included: rename/delete chats, stop & regenerate, response-speed setting, custom instructions,
light/dark/system theme, mobile drawer layout, keyboard-friendly dialogs and ARIA labels.

---

## API reference

All routes are prefixed with `/api`. Authenticated routes need `Authorization: Bearer <token>`.
Interactive docs: `/docs`.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/auth/register` | Create account, returns token + user |
| POST | `/auth/login` | Log in, returns token + user |
| GET / PATCH | `/auth/me` | Current user / update display name |
| GET / PUT | `/settings` | Theme, response speed, custom instructions |
| GET | `/conversations?q=` | List (optionally filter by title or message text) |
| POST | `/conversations` | Create |
| GET | `/conversations/{id}` | Conversation with all messages |
| PATCH | `/conversations/{id}` | Rename |
| DELETE | `/conversations/{id}` | Delete one |
| DELETE | `/conversations` | Delete all |
| POST | `/conversations/{id}/messages` | Send, wait for the full reply (JSON) |
| POST | `/conversations/{id}/messages/stream` | Send, stream the reply (SSE) |
| POST | `/conversations/{id}/regenerate/stream` | Re-answer the last user message (SSE) |
| GET | `/conversations/{id}/export?format=` | Download as `markdown`, `json` or `text` |
| GET | `/health` | Liveness + active cache backend |

### Streaming protocol

```
event: start   data: {"conversation": {...}, "user_message": {...}}
event: token   data: {"text": "Hello "}        (repeated)
event: done    data: {"message": {...saved assistant message...}}
```

If the client disconnects mid-stream, the server saves what was generated so far with
`status: "stopped"`.

### Message `actions` shape

```json
[
  { "type": "buttons", "label": "Quick answers",
    "options": [{ "label": "Yes, continue", "value": "Yes, continue" }] },
  { "type": "menu", "label": "Pick a topic",
    "options": [{ "label": "FastAPI", "value": "Tell me about FastAPI" }] }
]
```

Selecting an option sends its `value` as the next user message.

---

## Architecture

```
Browser ── React 19 / Redux / MUI ──► nginx (prod) or Vite proxy (dev)
                                          │  /api
                                          ▼
                                   FastAPI (async)
                                    ├─ SQLAlchemy 2 + asyncpg ──► PostgreSQL
                                    └─ Cache (Redis | memory)
```

```
chatgpt-clone/
├── docker-compose.yml
├── backend/
│   ├── skill.md              # backend guide
│   ├── app/                  # main.py, config, database, models, schemas, security, cache, deps
│   │   ├── routers/          # auth, conversations, chat, settings
│   │   └── services/         # responder (scripted replies), user_settings
│   ├── alembic/              # migrations
│   └── tests/
└── frontend/
    ├── skill.md              # frontend guide
    └── src/
        ├── api/              # fetch client + SSE parser
        ├── store/            # Redux slices, listener middleware
        ├── components/       # Layout, Sidebar, TopBar, ChatPage, Composer, MessageItem, ...
        ├── hooks/ utils/ types/
        └── theme.ts
```

### Database schema

`users` 1─1 `user_settings`; `users` 1─* `conversations` 1─* `messages` (all cascade on delete).
`messages.actions` is `JSONB`. Conversations are indexed on `(user_id, updated_at)`.

### Caching

* Conversation list (unfiltered), conversation detail and settings are cached for
  `CACHE_TTL_SECONDS` (default 60).
* Every write invalidates the affected keys (`cache.py → invalidate_*`).
* Redis is used when `REDIS_URL` is set and reachable; otherwise the app falls back to a
  process-local TTL cache (fine for one worker; use Redis for several).

---

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql+asyncpg://chat:chat@localhost:5432/chatclone` | Must use the `asyncpg` driver |
| `REDIS_URL` | *(empty)* | Empty = in-memory cache |
| `SECRET_KEY` | `change-me` | **Change in production** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` | 7 days |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Only needed if the browser calls the API cross-origin |
| `CACHE_TTL_SECONDS` | `60` | |
| `VITE_API_URL` (frontend, build-time) | `/api` | Override to call a remote API directly |

## Migrations

```bash
cd backend
alembic revision --autogenerate -m "describe change"   # after editing models.py
alembic upgrade head
alembic downgrade -1
```

## Troubleshooting

* **Replies appear all at once** — something between browser and API is buffering. nginx needs
  `proxy_buffering off` (already set in `frontend/nginx.conf`); check any extra reverse proxy.
* **`password authentication failed`** — your local Postgres user/password don't match `DATABASE_URL`.
* **Port already in use** — change the left side of the `ports:` mappings in `docker-compose.yml`.
* **Images don't load** — the demo images come from `picsum.photos`, so they need internet access.
* **Clipboard copy does nothing on a non-localhost http URL** — browsers restrict the Clipboard API to
  secure contexts; the app falls back to `execCommand`, which some browsers also block.

## Production notes

Set a strong `SECRET_KEY`, serve over HTTPS, run Redis, add rate limiting on `/auth/*`, and consider
httpOnly cookies instead of `localStorage` for tokens. For fast `ILIKE` search on large datasets add a
`pg_trgm` GIN index on `messages.content`.
