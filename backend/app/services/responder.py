"""Scripted "assistant". There is intentionally NO language model here.

`build_reply` picks a canned markdown answer based on keywords in the prompt and
`tokenize` splits it into word-sized chunks so the API can stream it. Replace
`build_reply` with a real LLM client later without touching the streaming code.
"""
import re
from dataclasses import dataclass

TOKEN_RE = re.compile(r"\S+\s*|\s+")
SPEED_DELAY = {"slow": 0.07, "normal": 0.035, "fast": 0.012}


@dataclass
class Reply:
    text: str
    actions: list[dict] | None = None


def tokenize(text: str) -> list[str]:
    """Split into chunks whose concatenation equals the original text."""
    return TOKEN_RE.findall(text)


def _opt(label: str, value: str | None = None) -> dict:
    return {"label": label, "value": value or label}


def _buttons(options: list[dict], label: str | None = None) -> dict:
    return {"type": "buttons", "label": label, "options": options}


def _menu(options: list[dict], label: str | None = None) -> dict:
    return {"type": "menu", "label": label, "options": options}


SHOWCASE = _buttons(
    [
        _opt("Show me a table"),
        _opt("Show me an image"),
        _opt("Write some code"),
        _opt("Give me a checklist"),
        _opt("Let me choose a topic"),
    ],
    "Try another demo",
)

TOPICS = {
    "fastapi": (
        "FastAPI",
        "**FastAPI** is an async Python web framework built on Starlette and Pydantic. "
        "It generates OpenAPI docs automatically (open `/docs` on this backend) and "
        "streams responses with `StreamingResponse`, which is how this chat shows tokens as they arrive.",
    ),
    "react": (
        "React",
        "**React 19** powers the UI. Messages live in a Redux store, and each streamed "
        "token updates only the last message, so the rest of the transcript doesn't re-render.",
    ),
    "postgresql": (
        "PostgreSQL",
        "**PostgreSQL** stores users, settings, conversations and messages. Assistant "
        "actions are saved in a `JSONB` column and the schema is managed with Alembic migrations.",
    ),
    "redux": (
        "Redux Toolkit",
        "**Redux Toolkit** keeps auth, conversations, the active chat and settings in slices. "
        "Async work (login, streaming) lives in thunks, and a listener middleware loads user data after sign-in.",
    ),
}


def _table_reply() -> Reply:
    text = """Here's a comparison table, rendered from GitHub-flavoured Markdown:

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | React 19 + TypeScript | UI, routing, streaming client |
| State | Redux Toolkit | Auth, chats, settings |
| Styling | Material UI | Theme, light/dark mode |
| API | FastAPI | REST + Server-Sent Events |
| Database | PostgreSQL | Users, chats, messages |
| Cache | Redis (or memory) | Fast conversation reads |

Tables scroll horizontally on narrow screens."""
    return Reply(text, [SHOWCASE])


def _image_reply() -> Reply:
    text = """Images are plain Markdown too. Here are two placeholders:

![Mountain lake at sunrise](https://picsum.photos/seed/mountain-lake/800/420)

![City skyline at night](https://picsum.photos/seed/city-night/800/420)

They load lazily and never overflow the message column."""
    return Reply(text, [SHOWCASE])


def _code_reply() -> Reply:
    text = """Here are two snippets with syntax highlighting. Use the **Copy code** button on each block.

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()


@app.get("/count")
async def count():
    async def gen():
        for i in range(5):
            yield f"data: {i}\\n\\n"

    return StreamingResponse(gen(), media_type="text/event-stream")
```

```typescript
const res = await fetch('/api/conversations/ID/messages/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'Hello' }),
});
const reader = res.body!.getReader();
```"""
    return Reply(text, [SHOWCASE])


def _list_reply() -> Reply:
    text = """Here's a launch checklist with nested lists:

1. **Backend**
   - Run migrations with `alembic upgrade head`
   - Set a strong `SECRET_KEY`
   - Point `REDIS_URL` at a Redis instance
2. **Frontend**
   - Build with `npm run build`
   - Serve behind nginx with buffering disabled for `/api`
3. **Verify**
   - [x] Sign up and sign in
   - [x] Stream a reply
   - [ ] Export a conversation

> Task lists, ordered lists and block quotes all come from Markdown."""
    return Reply(text, [SHOWCASE])


def _choice_reply() -> Reply:
    text = (
        "Pick a topic below. Buttons and menus come back from the API as structured "
        "`actions`; choosing one sends its value as your next message."
    )
    topics = _menu([_opt(label, f"Tell me about {label}") for label, _ in TOPICS.values()], "Pick a topic")
    quick = _buttons([_opt("Yes, continue"), _opt("No, stop here"), _opt("Show me a table")], "Quick answers")
    return Reply(text, [topics, quick])


def _capabilities_reply() -> Reply:
    text = """I'm a **demo assistant** with no language model behind me. I follow simple rules, but everything around me is real:

- Streaming replies over Server-Sent Events
- Markdown with tables, lists, images and code
- Saved conversations with search, rename, delete and export
- Buttons and menus returned by the API

Choose something to see it in action."""
    return Reply(text, [SHOWCASE])


def build_reply(prompt: str, display_name: str | None = None, custom_instructions: str | None = None) -> Reply:
    p = prompt.lower().strip()

    if "tell me about" in p:
        for key, (_, body) in TOPICS.items():
            if key in p:
                return Reply(body, [SHOWCASE])
    if "what can you do" in p or re.search(r"\bhelp\b", p):
        return _capabilities_reply()
    if any(w in p for w in ("table", "compare", "comparison")):
        return _table_reply()
    if any(w in p for w in ("image", "picture", "photo", "gallery")):
        return _image_reply()
    if any(w in p for w in ("code", "function", "script", "snippet")):
        return _code_reply()
    if any(w in p for w in ("list", "steps", "checklist", "todo", "plan")):
        return _list_reply()
    if any(w in p for w in ("choose", "option", "menu", "button", "pick", "decide")):
        return _choice_reply()
    if p in ("yes, continue", "no, stop here"):
        return Reply("Got it. Ask for anything else, or try one of the demos below.", [SHOWCASE])
    if re.match(r"^(hi|hello|hey|yo)\b", p):
        who = f", {display_name}" if display_name else ""
        return Reply(f"Hello{who}! What would you like to see?", [SHOWCASE])

    quoted = "\n".join("> " + line for line in prompt.strip()[:400].splitlines())
    text = (
        f"You said:\n\n{quoted}\n\n"
        "I can't reason about that because there's no language model here, but I can show what the "
        "interface can render. Try one of the demos below."
    )
    if custom_instructions and custom_instructions.strip():
        note = custom_instructions.strip().replace("`", "'")[:80]
        text += f"\n\nYour custom instructions are saved (`{note}`)."
    return Reply(text, [SHOWCASE])
