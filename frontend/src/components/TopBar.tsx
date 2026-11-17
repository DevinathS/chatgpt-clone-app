import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebarOutlined';
import { Box, Button, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, ListSubheader, Tooltip, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { saveSettings } from '../store/settingsSlice';
import { openAuth, setSidebarOpen } from '../store/uiSlice';
import type { ExportFormat, StreamSpeed } from '../types';
import { downloadConversation } from '../utils/export';

const SPEEDS: { value: StreamSpeed; label: string }[] = [
  { value: 'slow', label: 'Slow' },
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Fast' },
];

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'markdown', label: 'Markdown (.md)' },
  { value: 'json', label: 'JSON (.json)' },
  { value: 'text', label: 'Plain text (.txt)' },
];

export default function TopBar() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);
  const user = useAppSelector((s) => s.auth.user);
  const speed = useAppSelector((s) => s.settings.stream_speed);
  const activeId = useAppSelector((s) => s.chat.activeId);
  const title = useAppSelector((s) => s.conversations.items.find((c) => c.id === s.chat.activeId)?.title ?? 'conversation');

  const [speedAnchor, setSpeedAnchor] = useState<HTMLElement | null>(null);
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);

  return (
    <Box component="header" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, height: 56, flexShrink: 0 }}>
      {(isMobile || !sidebarOpen) && (
        <IconButton aria-label="Open sidebar" onClick={() => dispatch(setSidebarOpen(true))}>
          <ViewSidebarIcon />
        </IconButton>
      )}

      <Button color="inherit" endIcon={<ExpandMoreIcon />} onClick={(e) => setSpeedAnchor(e.currentTarget)} sx={{ fontSize: 17, fontWeight: 600, px: 1.5 }}>
        ChatClone
      </Button>
      <Menu anchorEl={speedAnchor} open={Boolean(speedAnchor)} onClose={() => setSpeedAnchor(null)}>
        <ListSubheader sx={{ lineHeight: '32px', bgcolor: 'transparent' }}>Response speed</ListSubheader>
        {SPEEDS.map((s) => (
          <MenuItem
            key={s.value}
            selected={s.value === speed}
            onClick={() => {
              dispatch(saveSettings({ stream_speed: s.value }));
              setSpeedAnchor(null);
            }}
          >
            <ListItemText>{s.label}</ListItemText>
            {s.value === speed && (
              <ListItemIcon sx={{ minWidth: 'auto', ml: 2 }}>
                <CheckIcon fontSize="small" />
              </ListItemIcon>
            )}
          </MenuItem>
        ))}
      </Menu>

      <Box sx={{ flex: 1 }} />

      {user ? (
        activeId && (
          <>
            <Tooltip title="Export conversation">
              <IconButton aria-label="Export conversation" onClick={(e) => setExportAnchor(e.currentTarget)}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
              {FORMATS.map((f) => (
                <MenuItem
                  key={f.value}
                  onClick={() => {
                    setExportAnchor(null);
                    downloadConversation(activeId, title, f.value);
                  }}
                >
                  {f.label}
                </MenuItem>
              ))}
            </Menu>
          </>
        )
      ) : (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={() => dispatch(openAuth('login'))}>
            Log in
          </Button>
          <Button variant="outlined" color="inherit" onClick={() => dispatch(openAuth('signup'))} sx={{ borderColor: 'divider' }}>
            Sign up for free
          </Button>
        </Box>
      )}
    </Box>
  );
}
