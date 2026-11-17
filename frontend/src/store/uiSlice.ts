import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  authDialog: 'login' | 'signup' | null;
}

const initialState: UiState = {
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 900 : true,
  settingsOpen: false,
  authDialog: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    setSettingsOpen(state, action: PayloadAction<boolean>) {
      state.settingsOpen = action.payload;
    },
    openAuth(state, action: PayloadAction<'login' | 'signup' | null>) {
      state.authDialog = action.payload;
    },
  },
});

export const { setSidebarOpen, setSettingsOpen, openAuth } = uiSlice.actions;
export default uiSlice.reducer;
