export interface User {
  id: string;
  email: string;
  display_name: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type StreamSpeed = 'slow' | 'normal' | 'fast';

export interface UserSettings {
  theme: ThemeMode;
  stream_speed: StreamSpeed;
  custom_instructions: string;
}

export interface ActionOption {
  label: string;
  value: string;
}

export interface ActionGroup {
  type: 'buttons' | 'menu';
  label?: string | null;
  options: ActionOption[];
}

export interface Message {
  id: number | string;
  role: 'user' | 'assistant';
  content: string;
  actions?: ActionGroup[] | null;
  status?: 'complete' | 'stopped' | 'streaming';
  created_at?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export type ExportFormat = 'markdown' | 'json' | 'text';
