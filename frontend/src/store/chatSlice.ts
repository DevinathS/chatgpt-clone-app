import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { api, errorMessage } from '../api/client';
import { streamRequest } from '../api/stream';
import type { Message } from '../types';
import { loggedOut } from './actions';
import { conversationUpserted } from './conversationsSlice';
import type { RootState } from './index';

interface ChatState {
  activeId: string | null;
  messages: Message[];
  loading: boolean;
  streaming: boolean;
  error: string | null;
}

const initialState: ChatState = { activeId: null, messages: [], loading: false, streaming: false, error: null };

const TEMP_USER = 'tmp-user';
const TEMP_ASSISTANT = 'tmp-assistant';

/** Give leftover temporary messages unique ids so a later send can't collide with them. */
function retireTemps(messages: Message[]) {
  messages.forEach((m, i) => {
    if (m.id === TEMP_USER || m.id === TEMP_ASSISTANT) m.id = `local-${i}`;
  });
}

// ------------------------------------------------------------------ thunks
export const loadConversation = createAsyncThunk('chat/load', async (id: string) => api.getConversation(id));

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    resetChat: () => initialState,
    activated(state, action: PayloadAction<string>) {
      state.activeId = action.payload;
      state.messages = [];
      state.error = null;
      state.loading = false;
      state.streaming = false;
    },
    userMessageAdded(state, action: PayloadAction<string>) {
      state.messages.push({ id: TEMP_USER, role: 'user', content: action.payload });
    },
    userMessageConfirmed(state, action: PayloadAction<Message>) {
      const i = state.messages.findIndex((m) => m.id === TEMP_USER);
      if (i >= 0) state.messages[i] = action.payload;
      else state.messages.push(action.payload);
    },
    streamStarted(state) {
      state.streaming = true;
      state.error = null;
      state.messages.push({ id: TEMP_ASSISTANT, role: 'assistant', content: '', status: 'streaming' });
    },
    tokenAppended(state, action: PayloadAction<string>) {
      const m = state.messages.find((x) => x.id === TEMP_ASSISTANT);
      if (m) m.content += action.payload;
    },
    streamFinished(state, action: PayloadAction<Message>) {
      const i = state.messages.findIndex((m) => m.id === TEMP_ASSISTANT);
      if (i >= 0) state.messages[i] = action.payload;
      else state.messages.push(action.payload);
      state.streaming = false;
    },
    /** Stream ended without a `done` event (user pressed Stop, or the connection dropped). */
    streamEnded(state, action: PayloadAction<string | null>) {
      const i = state.messages.findIndex((m) => m.id === TEMP_ASSISTANT);
      if (i >= 0) {
        if (state.messages[i].content.trim()) state.messages[i].status = 'stopped';
        else state.messages.splice(i, 1);
      }
      retireTemps(state.messages);
      state.streaming = false;
      if (action.payload) state.error = action.payload;
    },
    lastAssistantRemoved(state) {
      const last = state.messages[state.messages.length - 1];
      if (last?.role === 'assistant') state.messages.pop();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadConversation.pending, (s, a) => {
        s.activeId = a.meta.arg;
        s.messages = [];
        s.loading = true;
        s.streaming = false;
        s.error = null;
      })
      .addCase(loadConversation.fulfilled, (s, a) => {
        if (a.meta.arg !== s.activeId) return;
        s.loading = false;
        s.messages = a.payload.messages;
      })
      .addCase(loadConversation.rejected, (s, a) => {
        if (a.meta.arg !== s.activeId) return;
        s.loading = false;
        s.error = a.error.message ?? 'Could not load this conversation';
      })
      .addCase(loggedOut, () => initialState);
  },
});

export const {
  resetChat,
  activated,
  userMessageAdded,
  userMessageConfirmed,
  streamStarted,
  tokenAppended,
  streamFinished,
  streamEnded,
  lastAssistantRemoved,
} = chatSlice.actions;

export default chatSlice.reducer;

let controller: AbortController | null = null;

/** Stops the in-flight stream (the server keeps the partial reply). */
export function abortCurrent() {
  controller?.abort();
  controller = null;
}

type Dispatch = (action: unknown) => unknown;

async function runStream(path: string, body: unknown, dispatch: Dispatch) {
  const ctl = new AbortController();
  controller = ctl;
  const live = () => !ctl.signal.aborted;
  try {
    await streamRequest(
      path,
      body,
      {
        onStart: ({ conversation, user_message }) => {
          if (!live()) return;
          if (user_message) dispatch(userMessageConfirmed(user_message));
          dispatch(conversationUpserted(conversation));
        },
        onToken: (text) => {
          if (live()) dispatch(tokenAppended(text));
        },
        onDone: (message) => {
          if (live()) dispatch(streamFinished(message));
        },
      },
      ctl.signal,
    );
    if (live()) dispatch(streamEnded(null)); // no-op if `done` already arrived
  } catch (e) {
    dispatch(streamEnded(live() ? errorMessage(e) : null));
  } finally {
    if (controller === ctl) controller = null;
  }
}

interface SendArgs {
  content: string;
  conversationId: string | null;
  /** Called after a new conversation was created so the UI can update the URL. */
  onCreated?: (id: string) => void;
}

export const sendMessage = createAsyncThunk<void, SendArgs>(
  'chat/send',
  async ({ content, conversationId, onCreated }, { dispatch, getState }) => {
    if ((getState() as RootState).chat.streaming) return;
    let id = conversationId;
    if (!id) {
      const conv = await api.createConversation();
      id = conv.id;
      dispatch(activated(conv.id));
      dispatch(conversationUpserted(conv));
      onCreated?.(conv.id);
    }
    dispatch(userMessageAdded(content));
    dispatch(streamStarted());
    await runStream(`/conversations/${id}/messages/stream`, { content }, dispatch as Dispatch);
  },
);

export const regenerate = createAsyncThunk<void, void>('chat/regenerate', async (_, { dispatch, getState }) => {
  const { activeId, streaming } = (getState() as RootState).chat;
  if (!activeId || streaming) return;
  dispatch(lastAssistantRemoved());
  dispatch(streamStarted());
  await runStream(`/conversations/${activeId}/regenerate/stream`, {}, dispatch as Dispatch);
});
