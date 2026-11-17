import RefreshIcon from '@mui/icons-material/Refresh';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { memo } from 'react';
import { useChatActions } from '../hooks/useChatActions';
import { surface } from '../theme';
import type { Message } from '../types';
import ActionButtons from './ActionButtons';
import CopyButton from './CopyButton';
import MarkdownRenderer from './MarkdownRenderer';
import TypingIndicator from './TypingIndicator';

interface Props {
  message: Message;
  isLast: boolean;
}

function MessageItem({ message, isLast }: Props) {
  const { send, regenerate, streaming } = useChatActions();
  const isUser = message.role === 'user';
  const pending = message.status === 'streaming';

  if (isUser) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', py: 1.5, '&:hover .msg-tools': { opacity: 1 } }}>
        <Box
          sx={{
            maxWidth: '85%',
            px: 2.5,
            py: 1.25,
            borderRadius: '20px',
            bgcolor: surface('bubble'),
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: 1.6,
          }}
        >
          {message.content}
        </Box>
        <Box className="msg-tools" sx={{ opacity: 0, transition: 'opacity .15s', '@media (hover: none)': { opacity: 1 } }}>
          <CopyButton text={message.content} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 1.5, '&:hover .msg-tools': { opacity: 1 } }}>
      {pending && !message.content ? <TypingIndicator /> : <MarkdownRenderer content={message.content} />}

      {message.status === 'stopped' && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Response stopped
        </Typography>
      )}

      {!pending && message.actions && message.actions.length > 0 && (
        <ActionButtons groups={message.actions} disabled={!isLast || streaming} onSelect={send} />
      )}

      {!pending && (
        <Box
          className="msg-tools"
          sx={{ mt: 0.5, ml: -0.5, display: 'flex', gap: 0.25, opacity: isLast ? 1 : 0, transition: 'opacity .15s', '@media (hover: none)': { opacity: 1 } }}
        >
          <CopyButton text={message.content} />
          {isLast && (
            <Tooltip title="Regenerate">
              <span>
                <IconButton size="small" aria-label="Regenerate response" onClick={regenerate} disabled={streaming} sx={{ color: 'text.secondary' }}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      )}
    </Box>
  );
}

export default memo(MessageItem);
