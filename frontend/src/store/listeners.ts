import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { bootstrap, login, register } from './authSlice';
import { fetchConversations } from './conversationsSlice';
import { fetchSettings } from './settingsSlice';
import type { RootState } from './index';

export const listenerMiddleware = createListenerMiddleware();

// Whenever a session becomes active (sign in, sign up, or restored from a saved token),
// load that user's settings and conversation history.
listenerMiddleware.startListening({
  matcher: isAnyOf(login.fulfilled, register.fulfilled, bootstrap.fulfilled),
  effect: async (_action, api) => {
    if (!(api.getState() as RootState).auth.user) return;
    api.dispatch(fetchSettings());
    api.dispatch(fetchConversations(undefined));
  },
});
