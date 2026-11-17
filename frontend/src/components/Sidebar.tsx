import EditNoteIcon from '@mui/icons-material/EditNoteOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebarOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  InputBase,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { logout } from '../store/authSlice';
import { fetchConversations, setQuery } from '../store/conversationsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { openAuth, setSettingsOpen, setSidebarOpen } from '../store/uiSlice';
import { surface } from '../theme';
import { groupByDate } from '../utils/dates';
import ConversationRow from './ConversationRow';

const navItemSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  width: '100%',
  px: 1.5,
  py: 1,
  borderRadius: 2.5,
  border: 0,
  bgcolor: 'transparent',
  color: 'text.primary',
  font: 'inherit',
  fontSize: 14,
  textAlign: 'left' as const,
  cursor: 'pointer',
  '&:hover': { bgcolor: surface('hover') },
};

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { items, query, loading } = useAppSelector((s) => s.conversations);
  const match = useMatch('/c/:conversationId');
  const activeId = match?.params.conversationId ?? null;

  const [text, setText] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  // Debounced server-side search across titles and message text.
  useEffect(() => {
    if (!user || text === query) return;
    const t = window.setTimeout(() => {
      dispatch(setQuery(text));
      dispatch(fetchConversations(text));
    }, 250);
    return () => window.clearTimeout(t);
  }, [text, query, user, dispatch]);

  const groups = useMemo(() => groupByDate(items), [items]);

  const open = (to: string) => {
    navigate(to);
    onNavigate?.();
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: surface('sidebar'), width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, height: 56, flexShrink: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 17, px: 0.5 }}>ChatClone</Typography>
        <IconButton aria-label="Close sidebar" onClick={() => dispatch(setSidebarOpen(false))}>
          <ViewSidebarIcon />
        </IconButton>
      </Box>

      <Box sx={{ px: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Box component="button" type="button" sx={navItemSx} onClick={() => open('/')}>
          <EditNoteIcon fontSize="small" /> New chat
        </Box>
        {user && (
          <Box
            sx={{ ...navItemSx, cursor: 'text', py: 0.5, '&:focus-within': { bgcolor: surface('hover') } }}
            onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
          >
            <SearchIcon fontSize="small" />
            <InputBase
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search chats"
              inputProps={{ 'aria-label': 'Search chats', maxLength: 200 }}
              sx={{ flex: 1, fontSize: 14 }}
            />
            {text && (
              <IconButton size="small" aria-label="Clear search" onClick={() => setText('')}>
                <ClearIcon fontSize="inherit" />
              </IconButton>
            )}
          </Box>
        )}
        <Box
          component="button"
          type="button"
          sx={navItemSx}
          onClick={() => {
            dispatch(setSettingsOpen(true));
            onNavigate?.();
          }}
        >
          <SettingsIcon fontSize="small" /> Settings
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1, pt: 2, pb: 1 }}>
        {user ? (
          groups.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1.5 }}>
              {loading ? 'Loading…' : query ? 'No chats match your search.' : 'No chats yet. Start one above.'}
            </Typography>
          ) : (
            groups.map((g) => (
              <Box key={g.label} sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, fontWeight: 600, display: 'block', mb: 0.5 }}>
                  {query ? 'Results' : g.label}
                </Typography>
                {g.items.map((c) => (
                  <ConversationRow key={c.id} conversation={c} active={c.id === activeId} onOpen={() => open(`/c/${c.id}`)} />
                ))}
              </Box>
            ))
          )
        ) : null}
      </Box>

      <Box sx={{ borderTop: 1, borderColor: 'divider', p: 1.5 }}>
        {user ? (
          <>
            <Box
              component="button"
              type="button"
              aria-haspopup="menu"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ ...navItemSx, py: 0.75 }}
            >
              <Avatar sx={{ width: 30, height: 30, fontSize: 14, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                {user.display_name.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 14, fontWeight: 600 }}>
                  {user.display_name}
                </Typography>
                <Typography noWrap variant="caption" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
            </Box>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)} anchorOrigin={{ vertical: 'top', horizontal: 'left' }} transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  dispatch(setSettingsOpen(true));
                }}
              >
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Settings</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  setText('');
                  dispatch(logout());
                  navigate('/');
                }}
              >
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Log out</ListItemText>
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Box sx={{ px: 0.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Get responses tailored to you</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, mb: 1.5 }}>
              Log in to get answers based on saved chats, and keep your conversations across devices.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              color="inherit"
              onClick={() => dispatch(openAuth('login'))}
              sx={{ bgcolor: surface('hover'), color: 'text.primary', py: 1.25, '&:hover': { bgcolor: surface('hover'), opacity: 0.8 } }}
            >
              Log in
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
