import { api } from '../api/client';
import type { ExportFormat } from '../types';

const EXT: Record<ExportFormat, string> = { markdown: 'md', json: 'json', text: 'txt' };

const slug = (title: string) =>
  title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60) || 'conversation';

/** Downloads a conversation from the API as a file in the browser. */
export async function downloadConversation(id: string, title: string, format: ExportFormat) {
  const blob = await api.exportConversation(id, format);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug(title)}.${EXT[format]}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
