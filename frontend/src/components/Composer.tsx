import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import StopIcon from '@mui/icons-material/Stop';
import { Box, IconButton, InputBase, Menu, MenuItem, Tooltip } from '@mui/material';
import { useRef, useState, type KeyboardEvent } from 'react';
import { useChatActions } from '../hooks/useChatActions';
import { useAppSelector } from '../store/hooks';
import { surface } from '../theme';

const EXAMPLES = [
  'Show me a table',
  'Show me an image',
  'Write some code',
  'Give me a checklist',
  'Let me choose a topic',
];

export default function Composer() {
  const { send, stop, streaming } = useChatActions();
  const user = useAppSelector((s) => s.auth.user);
  const [text, setText] = useState('');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    if (send(text)) setText('');
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!streaming) submit();
    }
  };

  const canSend = text.trim().length > 0 && !streaming;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 0.5,
        px: 1,
        py: 0.75,
        borderRadius: '28px',
        bgcolor: surface('composer'),
        border: 1,
        borderColor: 'divider',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        '&:focus-within': { borderColor: 'text.secondary' },
      }}
    >
      <Tooltip title="Try an example">
        <IconButton aria-label="Insert an example prompt" onClick={(e) => setAnchor(e.currentTarget)} sx={{ mb: 0.25 }}>
          <AddIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {EXAMPLES.map((ex) => (
          <MenuItem
            key={ex}
            onClick={() => {
              setText(ex);
              setAnchor(null);
              input.current?.focus();
            }}
          >
            {ex}
          </MenuItem>
        ))}
      </Menu>

      <InputBase
        inputRef={input}
        multiline
        maxRows={8}
        fullWidth
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={user ? 'Ask anything' : 'Log in to start chatting'}
        inputProps={{ 'aria-label': 'Message' }}
        sx={{ py: 1, fontSize: '1rem', lineHeight: 1.5 }}
      />

      {streaming ? (
        <Tooltip title="Stop generating">
          <IconButton
            aria-label="Stop generating"
            onClick={stop}
            sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.main', opacity: 0.85 }, width: 36, height: 36, mb: 0.25, borderRadius: '50%' }}
          >
            <StopIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Send message">
          <span>
            <IconButton
              aria-label="Send message"
              onClick={submit}
              disabled={!canSend}
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                width: 36,
                height: 36,
                mb: 0.25,
                borderRadius: '50%',
                '&:hover': { bgcolor: 'primary.main', opacity: 0.85 },
                '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
              }}
            >
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
}
