import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { api } from '../api/client';
import type { ThemeMode, UserSettings } from '../types';
import { loggedOut } from './actions';
import type { RootState } from './index';

export const THEME_KEY = 'chatclone.theme';

function storedTheme(): ThemeMode {
  const v = localStorage.getItem(THEME_KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

const initialState: UserSettings = {
  theme: storedTheme(),
  stream_speed: 'normal',
  custom_instructions: '',
};

export const fetchSettings = createAsyncThunk('settings/fetch', async () => api.getSettings());

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    settingsPatched(state, action: PayloadAction<Partial<UserSettings>>) {
      Object.assign(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.fulfilled, (s, a) => {
        Object.assign(s, a.payload);
      })
      .addCase(loggedOut, (s) => {
        s.custom_instructions = '';
        s.stream_speed = 'normal';
      });
  },
});

export const { settingsPatched } = settingsSlice.actions;
export default settingsSlice.reducer;

/** Applies the change locally right away, then persists it if the user is signed in. */
export const saveSettings = createAsyncThunk(
  'settings/save',
  async (patch: Partial<UserSettings>, { dispatch, getState }) => {
    dispatch(settingsPatched(patch));
    if ((getState() as RootState).auth.user) await api.updateSettings(patch);
  },
);
