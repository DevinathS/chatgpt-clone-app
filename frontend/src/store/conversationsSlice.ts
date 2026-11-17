import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { api } from '../api/client';
import type { Conversation } from '../types';
import { loggedOut } from './actions';

interface ConversationsState {
  items: Conversation[];
  query: string;
  loading: boolean;
}

const initialState: ConversationsState = { items: [], query: '', loading: false };

export const fetchConversations = createAsyncThunk('conversations/fetch', async (q: string | undefined) =>
  api.listConversations(q),
);

export const renameConversation = createAsyncThunk(
  'conversations/rename',
  async ({ id, title }: { id: string; title: string }) => api.renameConversation(id, title),
);

export const deleteConversation = createAsyncThunk('conversations/delete', async (id: string) => {
  await api.deleteConversation(id);
  return id;
});

export const deleteAllConversations = createAsyncThunk('conversations/deleteAll', async () => {
  await api.deleteAllConversations();
});

const conversationsSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    /** Insert or update a conversation, moving it to the top of the (unfiltered) list. */
    conversationUpserted(state, action: PayloadAction<Conversation>) {
      const idx = state.items.findIndex((c) => c.id === action.payload.id);
      if (state.query) {
        if (idx >= 0) state.items[idx] = action.payload;
        return;
      }
      if (idx >= 0) state.items.splice(idx, 1);
      state.items.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (s) => {
        s.loading = true;
      })
      .addCase(fetchConversations.fulfilled, (s, a) => {
        s.loading = false;
        // Ignore responses for a query the user has already moved on from.
        if ((a.meta.arg ?? '') === s.query) s.items = a.payload;
      })
      .addCase(fetchConversations.rejected, (s) => {
        s.loading = false;
      })
      .addCase(renameConversation.fulfilled, (s, a) => {
        const i = s.items.findIndex((c) => c.id === a.payload.id);
        if (i >= 0) s.items[i] = a.payload;
      })
      .addCase(deleteConversation.fulfilled, (s, a) => {
        s.items = s.items.filter((c) => c.id !== a.payload);
      })
      .addCase(deleteAllConversations.fulfilled, (s) => {
        s.items = [];
      })
      .addCase(loggedOut, () => initialState);
  },
});

export const { setQuery, conversationUpserted } = conversationsSlice.actions;
export default conversationsSlice.reducer;
