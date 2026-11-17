import CloseIcon from '@mui/icons-material/Close';
import DataIcon from '@mui/icons-material/StorageOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import TuneIcon from '@mui/icons-material/Tune';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, updateProfile } from '../store/authSlice';
import { deleteAllConversations } from '../store/conversationsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { saveSettings, THEME_KEY } from '../store/settingsSlice';
import { openAuth, setSettingsOpen } from '../store/uiSlice';
import type { StreamSpeed, ThemeMode } from '../types';

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 1.75, borderBottom: 1, borderColor: 'divider' }}>
      <Box>
        <Typography sx={{ fontWeight: 500 }}>{title}</Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Box>
      {children}
    </Box>
  );
}

function General() {
  const dispatch = useAppDispatch();
  const { theme, stream_speed } = useAppSelector((s) => s.settings);
  return (
    <>
      <Row title="Theme">
        <Select
          size="small"
          value={theme}
          onChange={(e) => {
            const value = e.target.value as ThemeMode;
            localStorage.setItem(THEME_KEY, value);
            dispatch(saveSettings({ theme: value }));
          }}
          inputProps={{ 'aria-label': 'Theme' }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="system">System</MenuItem>
          <MenuItem value="light">Light</MenuItem>
          <MenuItem value="dark">Dark</MenuItem>
        </Select>
      </Row>
      <Row title="Response speed" hint="How quickly replies stream in">
        <Select
          size="small"
          value={stream_speed}
          onChange={(e) => dispatch(saveSettings({ stream_speed: e.target.value as StreamSpeed }))}
          inputProps={{ 'aria-label': 'Response speed' }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="slow">Slow</MenuItem>
          <MenuItem value="normal">Normal</MenuItem>
          <MenuItem value="fast">Fast</MenuItem>
        </Select>
      </Row>
    </>
  );
}

function LoginPrompt({ what }: { what: string }) {
  const dispatch = useAppDispatch();
  return (
    <Alert
      severity="info"
      action={
        <Button
          color="inherit"
          size="small"
          onClick={() => {
            dispatch(setSettingsOpen(false));
            dispatch(openAuth('login'));
          }}
        >
          Log in
        </Button>
      }
    >
      Log in to manage {what}.
    </Alert>
  );
}

function Personalization() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const saved = useAppSelector((s) => s.settings.custom_instructions);
  const [name, setName] = useState(user?.display_name ?? '');
  const [instructions, setInstructions] = useState(saved);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => setInstructions(saved), [saved]);
  useEffect(() => setName(user?.display_name ?? ''), [user]);

  if (!user) return <LoginPrompt what="personalization" />;

  const dirty = instructions !== saved || name.trim() !== user.display_name;

  const save = async () => {
    if (name.trim() && name.trim() !== user.display_name) await dispatch(updateProfile(name.trim()));
    if (instructions !== saved) await dispatch(saveSettings({ custom_instructions: instructions }));
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
      <TextField label="Display name" value={name} onChange={(e) => setName(e.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} />
      <TextField
        label="Custom instructions"
        placeholder="Anything the assistant should keep in mind"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        multiline
        minRows={4}
        maxRows={10}
        helperText={`${instructions.length}/2000`}
        slotProps={{ htmlInput: { maxLength: 2000 } }}
      />
      <Box>
        <Button variant="contained" onClick={save} disabled={!dirty || !name.trim()}>
          {justSaved ? 'Saved' : 'Save changes'}
        </Button>
      </Box>
    </Box>
  );
}

function DataControls({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [confirm, setConfirm] = useState(false);

  if (!user) return <LoginPrompt what="your data" />;

  return (
    <>
      <Row title="Delete all chats" hint="Permanently removes every conversation">
        <Button variant="outlined" color="error" onClick={() => setConfirm(true)}>
          Delete all
        </Button>
      </Row>
      <Row title="Log out" hint={user.email}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={() => {
            onClose();
            dispatch(logout());
            navigate('/');
          }}
        >
          Log out
        </Button>
      </Row>
      <Dialog open={confirm} onClose={() => setConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete all chats?</DialogTitle>
        <DialogContent>
          <DialogContentText>This can't be undone.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              setConfirm(false);
              await dispatch(deleteAllConversations());
              navigate('/');
            }}
          >
            Delete all
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function SettingsDialog() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const open = useAppSelector((s) => s.ui.settingsOpen);
  const [tab, setTab] = useState(0);
  const close = () => dispatch(setSettingsOpen(false));

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md" fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600 }}>
        Settings
        <IconButton aria-label="Close settings" onClick={close}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 3, minHeight: 380 }}>
        <Tabs
          orientation={isMobile ? 'horizontal' : 'vertical'}
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          variant={isMobile ? 'scrollable' : 'standard'}
          sx={{ minWidth: isMobile ? 0 : 200, flexShrink: 0, borderRight: isMobile ? 0 : 1, borderColor: 'divider' }}
        >
          <Tab icon={<TuneIcon fontSize="small" />} iconPosition="start" label="General" sx={{ justifyContent: 'flex-start', minHeight: 48 }} />
          <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="Personalization" sx={{ justifyContent: 'flex-start', minHeight: 48 }} />
          <Tab icon={<DataIcon fontSize="small" />} iconPosition="start" label="Data controls" sx={{ justifyContent: 'flex-start', minHeight: 48 }} />
        </Tabs>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {tab === 0 && <General />}
          {tab === 1 && <Personalization />}
          {tab === 2 && <DataControls onClose={close} />}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
