import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Button, IconButton, Tooltip } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { copyToClipboard } from '../utils/clipboard';

interface Props {
  text: string;
  /** `icon` renders a small icon button; `text` renders a labelled button (used on code blocks). */
  variant?: 'icon' | 'text';
  label?: string;
}

export default function CopyButton({ text, variant = 'icon', label = 'Copy' }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = async () => {
    if (await copyToClipboard(text)) {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    }
  };

  if (variant === 'text') {
    return (
      <Button
        size="small"
        onClick={onClick}
        startIcon={copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
        sx={{ color: '#b4b4b4', fontWeight: 500, fontSize: 12, '&:hover': { color: '#fff', bgcolor: 'transparent' } }}
      >
        {copied ? 'Copied!' : label}
      </Button>
    );
  }
  return (
    <Tooltip title={copied ? 'Copied' : label}>
      <IconButton size="small" onClick={onClick} aria-label={label} sx={{ color: 'text.secondary' }}>
        {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
