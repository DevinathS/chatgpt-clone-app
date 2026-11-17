import type {
  Conversation,
  ConversationDetail,
  ExportFormat,
  User,
  UserSettings,
} from '../types';

export const API_BASE: string = import.meta.env.VITE_API_URL ?? '/api';
const TOKEN_KEY = 'chatclone.token';

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : 'Something went wrong';

export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = tokenStore.get();
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

/** Turns a failed Response into an ApiError, reading FastAPI's `detail` field. */
export async function toApiError(res: Response): Promise<ApiError> {
  let detail = res.statusText || 'Request failed';
  try {
    const data = await res.json();
    if (typeof data.detail === 'string') detail = data.detail;
    else if (Array.isArray(data.detail)) detail = data.detail.map((d: { msg: string }) => d.msg).join(', ');
  } catch {
    /* body was not JSON */
  }
  if (res.status === 401 && tokenStore.get()) onUnauthorized?.();
  return new ApiError(res.status, detail);
}

async function request<T>(path: string, init: { method?: string; json?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method ?? 'GET',
    headers: authHeaders(init.json !== undefined ? { 'Content-Type': 'application/json' } : {}),
    body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
  });
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

interface TokenResponse {
  access_token: string;
  user: User;
}

export const api = {
  register: (email: string, password: string, display_name: string) =>
    request<TokenResponse>('/auth/register', { method: 'POST', json: { email, password, display_name } }),
  login: (email: string, password: string) =>
    request<TokenResponse>('/auth/login', { method: 'POST', json: { email, password } }),
  me: () => request<User>('/auth/me'),
  updateProfile: (display_name: string) => request<User>('/auth/me', { method: 'PATCH', json: { display_name } }),

  getSettings: () => request<UserSettings>('/settings'),
  updateSettings: (patch: Partial<UserSettings>) => request<UserSettings>('/settings', { method: 'PUT', json: patch }),

  listConversations: (q?: string) =>
    request<Conversation[]>(`/conversations${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createConversation: (title?: string) => request<Conversation>('/conversations', { method: 'POST', json: { title } }),
  getConversation: (id: string) => request<ConversationDetail>(`/conversations/${id}`),
  renameConversation: (id: string, title: string) =>
    request<Conversation>(`/conversations/${id}`, { method: 'PATCH', json: { title } }),
  deleteConversation: (id: string) => request<void>(`/conversations/${id}`, { method: 'DELETE' }),
  deleteAllConversations: () => request<void>('/conversations', { method: 'DELETE' }),

  exportConversation: async (id: string, format: ExportFormat): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/conversations/${id}/export?format=${format}`, { headers: authHeaders() });
    if (!res.ok) throw await toApiError(res);
    return res.blob();
  },
};
