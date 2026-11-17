import type { Message } from '../types';
import { API_BASE, authHeaders, toApiError } from './client';

export interface StartEvent {
  conversation: { id: string; title: string; created_at: string; updated_at: string };
  user_message: Message | null;
}

export interface StreamHandlers {
  onStart: (data: StartEvent) => void;
  onToken: (text: string) => void;
  onDone: (message: Message) => void;
}

/**
 * POSTs to an SSE endpoint and parses the stream with fetch + ReadableStream
 * (EventSource can't send POST bodies or Authorization headers).
 */
export async function streamRequest(
  path: string,
  body: unknown,
  handlers: StreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'text/event-stream' }),
    body: JSON.stringify(body ?? {}),
    signal,
  });
  if (!res.ok) throw await toApiError(res);
  if (!res.body) throw new Error('Streaming is not supported by this browser');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const dispatch = (raw: string) => {
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
    }
    if (!dataLines.length) return;
    const data = JSON.parse(dataLines.join('\n'));
    if (event === 'start') handlers.onStart(data as StartEvent);
    else if (event === 'token') handlers.onToken((data as { text: string }).text);
    else if (event === 'done') handlers.onDone((data as { message: Message }).message);
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      dispatch(raw);
    }
  }
}
