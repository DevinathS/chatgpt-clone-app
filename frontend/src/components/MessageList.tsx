import { Alert, Box, CircularProgress } from '@mui/material';
import { useEffect, useRef } from 'react';
import { useAppSelector } from '../store/hooks';
import MessageItem from './MessageItem';

export default function MessageList() {
  const { messages, loading, error } = useAppSelector((s) => s.chat);
  const scroller = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);

  const onScroll = () => {
    const el = scroller.current;
    if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };

  // Keep pinned to the newest token unless the reader scrolled up; always jump on a new user message.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const last = messages[messages.length - 1];
    if (nearBottom.current || last?.role === 'user') {
      el.scrollTo({ top: el.scrollHeight });
      nearBottom.current = true;
    }
  }, [messages]);

  return (
    <Box ref={scroller} onScroll={onScroll} sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <Box sx={{ maxWidth: 768, mx: 'auto', px: 2, py: 2 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={26} aria-label="Loading conversation" />
          </Box>
        )}
        {messages.map((m, i) => (
          <MessageItem key={m.id} message={m} isLast={i === messages.length - 1} />
        ))}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Box>
  );
}
