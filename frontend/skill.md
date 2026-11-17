---
name: chatclone-frontend
description: Guide to the ChatClone React 19 + TypeScript frontend (Redux Toolkit, Material UI, SSE streaming). Use when adding UI, state, API calls, theming, or changing how messages render.
---

# ChatClone frontend skill

## 1. What this app is

A ChatGPT-style single-page app: collapsible sidebar with searchable history, a "Where should we
begin?" start screen, streaming assistant replies, Markdown/rich content, action buttons and menus,
settings, and light/dark themes. It talks to the FastAPI backend under `/api`.

**Stack:** React 19, TypeScript (strict), Vite, Redux Toolkit + react-redux, React Router,
Material UI v7 (+ Emotion), react-markdown + remark-gfm + rehype-highlight.

## 2. Layout

```
src/
├── main.tsx              # Provider + BrowserRouter, global 401 handler
├── App.tsx               # builds the MUI theme from settings, bootstraps the session
├── theme.ts              # buildTheme(mode), custom palette.surface tokens, surface() sx helper
├── api/
│   ├── client.ts         # fetch wrapper, token store, typed `api.*`, ApiError
│   └── stream.ts         # POST + SSE parser (fetch ReadableStream)
├── store/
│   ├── index.ts          # configureStore + RootState/AppDispatch
│   ├── hooks.ts          # useAppDispatch / useAppSelector / useAppStore
│   ├── actions.ts        # loggedOut (shared action; avoids circular imports)
│   ├── authSlice.ts      # user, bootstrap/login/register/updateProfile/logout
│   ├── conversationsSlice.ts  # sidebar list + search query
│   ├── chatSlice.ts      # active conversation, messages, streaming, send/regenerate/abort
│   ├── settingsSlice.ts  # theme, stream_speed, custom_instructions
│   ├── uiSlice.ts        # sidebar open, settings dialog, auth dialog
│   └── listeners.ts      # after login/register/bootstrap → fetch settings + conversations
├── hooks/useChatActions.ts   # send / stop / regenerate (route + auth aware)
├── components/
│   ├── Layout.tsx  Sidebar.tsx  ConversationRow.tsx  TopBar.tsx
│   ├── ChatPage.tsx  MessageList.tsx  MessageItem.tsx  Composer.tsx
│   ├── MarkdownRenderer.tsx  ActionButtons.tsx  CopyButton.tsx  TypingIndicator.tsx
│   └── AuthDialog.tsx  SettingsDialog.tsx
├── utils/                # clipboard, export (download), dates (sidebar grouping)
└── types/index.ts
```

## 3. Architecture rules

1. **The URL is the source of truth for the open conversation.** Routes: `/` (new chat) and
   `/c/:conversationId`. `ChatPage` watches the route id and dispatches `loadConversation` or
   `resetChat`. When a send creates a conversation, the thunk sets `activeId` first and then calls
   `onCreated(id)` → `navigate`, so the effect sees "already active" and does not reload.
2. **Redux holds shared state; components hold ephemeral UI state** (menu anchors, text drafts).
3. **Thunks own side effects.** Components dispatch; reducers stay pure. Cross-slice reactions go through
   `extraReducers` (for actions like `loggedOut`) or `listeners.ts`.
4. **No circular value imports between slices.** Slices import `RootState` as `import type`. Shared
   actions live in `store/actions.ts`.
5. **Typed hooks only.** Use `useAppDispatch` / `useAppSelector`, never the untyped react-redux hooks.
6. **All HTTP goes through `api/client.ts`** (adds the bearer token, normalises FastAPI errors, triggers
   the global 401 handler). Streaming goes through `api/stream.ts`.
7. **Colours and surfaces come from the theme**, via `theme.palette.*` and `surface('sidebar')`-style sx
   helpers. Don't hard-code hex values in components (the only exceptions are code blocks, which are
   dark in both modes by design).

## 4. Streaming flow (read before editing `chatSlice.ts`)

1. `sendMessage` (thunk): create a conversation if needed → push optimistic user message (`tmp-user`) →
   push empty assistant placeholder (`tmp-assistant`, `status: 'streaming'`) → `runStream`.
2. `runStream` opens an `AbortController` (module-level `controller`) and calls `streamRequest`:
   * `start` → replace `tmp-user` with the saved message, upsert the conversation in the sidebar
   * `token` → `tokenAppended` (appends to the placeholder; only the last message re-renders)
   * `done` → `streamFinished` replaces the placeholder with the persisted message (real id + `actions`)
3. **Stop** = `abortCurrent()`. The reader throws `AbortError`, `streamEnded(null)` marks the partial
   message `stopped`; the server keeps the partial text because the disconnect is detected.
4. **Failure** = `streamEnded(errorMessage)` keeps any partial text and shows an inline error.
5. `retireTemps` renames leftover temp ids so later sends never collide.
6. All handlers check `live()` so late events from an aborted stream can't leak into another chat.

## 5. Rendering rich content

`MarkdownRenderer` is the only place assistant text is turned into UI.

* GFM (tables, task lists, strikethrough) via `remark-gfm`.
* Code: `rehype-highlight`; the `pre` override renders `CodeBlock` (language label + **Copy code**).
  `nodeText()` flattens highlighted nodes back to plain text for copying.
* Tables map to MUI `Table*` components inside an outlined `Paper` (scrolls horizontally).
* Images: lazy, `max-width: 100%`, rounded.
* Links open in a new tab with `rel="noopener noreferrer"`.
* **Do not enable raw HTML** (`rehype-raw`). Rendering is intentionally XSS-safe.

Message `actions` (`ActionGroup[]`) render in `ActionButtons`: `buttons` → outlined pill buttons;
`menu` → button + MUI `Menu`. Selecting calls `send(value)`. They're disabled unless the message is the
latest one and nothing is streaming.

## 6. Theming

`buildTheme(mode)` returns a MUI theme with a custom palette extension:

```ts
palette.surface = { sidebar, bubble, composer, hover, code, codeHeader }
```

Use in `sx` as `bgcolor: surface('bubble')` (a function of the theme). Mode comes from
`settings.theme` (`light` | `dark` | `system`); `system` follows `prefers-color-scheme`. The theme choice is
mirrored to `localStorage` so signed-out visitors keep it, and synced to the server for signed-in users.

## 7. Authentication & persistence

* Token in `localStorage` (`chatclone.token`); `bootstrap` calls `/auth/me` on load, and the app waits
  for `auth.initialized` before rendering, so there's no logged-out flash.
* After login/register/bootstrap, `listeners.ts` loads settings and conversations.
* Signed-out users see the landing UI; sending a message opens the login dialog.
* Any 401 while a token exists → `loggedOut` (clears all slices).

## 8. How to add things

**A new API call:** add a typed method to `api` in `client.ts` → a thunk in the relevant slice →
`extraReducers` → select it in the component.

**A new setting:** add the field to `UserSettings` (`types`) and `initialState` (`settingsSlice`), add a
control in `SettingsDialog`, and `dispatch(saveSettings({ field }))` (applies locally, then persists).

**A new message-level action** (e.g. thumbs up): add the button to the tools row in `MessageItem.tsx`;
put request logic in a thunk. Keep the `.msg-tools` hover/touch behaviour.

**A new route:** `ChatPage` handles only `/` and `/c/:id` and redirects others to `/`. Add a `Routes`
block in `Layout` before introducing new pages.

## 9. Accessibility & UX checklist

* Every icon-only button has `aria-label` (and a `Tooltip` where helpful).
* Dialogs trap focus (MUI) and close on Esc; inputs use proper `autoComplete`.
* Keyboard: Enter sends, Shift+Enter newline (IME composition respected).
* `@media (hover: none)` shows hover-only controls on touch devices.
* Motion respects `prefers-reduced-motion`.
* Auto-scroll pins to the bottom only when the reader hasn't scrolled up.

## 10. Commands

```bash
npm install
npm run dev          # http://localhost:5173 (proxy /api → :8000)
npm run typecheck    # tsc --noEmit
npm run build        # typecheck + production bundle into dist/
```

In Docker the app is built and served by nginx (`nginx.conf`), which proxies `/api/` to the backend with
buffering disabled (required for SSE).

## 11. Gotchas

* `EventSource` can't POST or send headers, so streaming uses `fetch` + `ReadableStream`.
* React 19 StrictMode runs effects twice in dev; effects here are idempotent (e.g. `bootstrap`).
* react-markdown v9+ has no `inline` prop for `code`; block vs inline is decided by the `pre` override.
* Vite 7 needs Node 20.19+ or 22.12+.
* `index.html` loads Inter from Google Fonts; offline, the system font stack is used.

## 12. Definition of done for a frontend change

- [ ] `npm run typecheck` passes
- [ ] Works in light **and** dark mode and at mobile width
- [ ] New controls are keyboard-accessible and labelled
- [ ] State changes go through slices/thunks (no fetches inside components)
- [ ] README / this file updated if behaviour or structure changed
