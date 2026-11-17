import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, errorMessage, tokenStore } from '../api/client';
import type { User } from '../types';
import { loggedOut } from './actions';

interface AuthState {
  user: User | null;
  initialized: boolean; // true once we've checked for a saved session
  status: 'idle' | 'loading';
  error: string | null;
}

const initialState: AuthState = { user: null, initialized: false, status: 'idle', error: null };

export const bootstrap = createAsyncThunk('auth/bootstrap', async (): Promise<User | null> => {
  if (!tokenStore.get()) return null;
  try {
    return await api.me();
  } catch {
    tokenStore.clear();
    return null;
  }
});

export const login = createAsyncThunk<User, { email: string; password: string }, { rejectValue: string }>(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await api.login(email, password);
      tokenStore.set(res.access_token);
      return res.user;
    } catch (e) {
      return rejectWithValue(errorMessage(e));
    }
  },
);

export const register = createAsyncThunk<
  User,
  { email: string; password: string; display_name: string },
  { rejectValue: string }
>('auth/register', async ({ email, password, display_name }, { rejectWithValue }) => {
  try {
    const res = await api.register(email, password, display_name);
    tokenStore.set(res.access_token);
    return res.user;
  } catch (e) {
    return rejectWithValue(errorMessage(e));
  }
});

export const updateProfile = createAsyncThunk<User, string, { rejectValue: string }>(
  'auth/updateProfile',
  async (displayName, { rejectWithValue }) => {
    try {
      return await api.updateProfile(displayName);
    } catch (e) {
      return rejectWithValue(errorMessage(e));
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async (_: void, { dispatch }) => {
  tokenStore.clear();
  dispatch(loggedOut());
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrap.fulfilled, (s, a) => {
        s.user = a.payload;
        s.initialized = true;
      })
      .addCase(bootstrap.rejected, (s) => {
        s.initialized = true;
      })
      .addCase(login.pending, (s) => {
        s.status = 'loading';
        s.error = null;
      })
      .addCase(login.fulfilled, (s, a) => {
        s.status = 'idle';
        s.user = a.payload;
      })
      .addCase(login.rejected, (s, a) => {
        s.status = 'idle';
        s.error = a.payload ?? 'Something went wrong';
      })
      .addCase(register.pending, (s) => {
        s.status = 'loading';
        s.error = null;
      })
      .addCase(register.fulfilled, (s, a) => {
        s.status = 'idle';
        s.user = a.payload;
      })
      .addCase(register.rejected, (s, a) => {
        s.status = 'idle';
        s.error = a.payload ?? 'Something went wrong';
      })
      .addCase(updateProfile.fulfilled, (s, a) => {
        s.user = a.payload;
      })
      .addCase(loggedOut, (s) => {
        s.user = null;
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
