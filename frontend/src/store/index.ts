import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import chatReducer from './chatSlice';
import conversationsReducer from './conversationsSlice';
import { listenerMiddleware } from './listeners';
import settingsReducer from './settingsSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    conversations: conversationsReducer,
    chat: chatReducer,
    settings: settingsReducer,
    ui: uiReducer,
  },
  middleware: (getDefault) => getDefault().prepend(listenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
