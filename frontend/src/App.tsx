import { Box, CircularProgress, CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';
import { useEffect, useMemo } from 'react';
import AuthDialog from './components/AuthDialog';
import Layout from './components/Layout';
import SettingsDialog from './components/SettingsDialog';
import { bootstrap } from './store/authSlice';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { THEME_KEY } from './store/settingsSlice';
import { buildTheme } from './theme';

export default function App() {
  const dispatch = useAppDispatch();
  const initialized = useAppSelector((s) => s.auth.initialized);
  const themePref = useAppSelector((s) => s.settings.theme);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const mode = themePref === 'system' ? (prefersDark ? 'dark' : 'light') : themePref;
  const theme = useMemo(() => buildTheme(mode), [mode]);

  useEffect(() => {
    dispatch(bootstrap());
  }, [dispatch]);

  // Remember the theme so signed-out visitors (and the first paint after reload) keep it.
  useEffect(() => {
    localStorage.setItem(THEME_KEY, themePref);
  }, [themePref]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {initialized ? (
        <>
          <Layout />
          <AuthDialog />
          <SettingsDialog />
        </>
      ) : (
        <Box sx={{ height: '100dvh', display: 'grid', placeItems: 'center' }}>
          <CircularProgress aria-label="Loading" />
        </Box>
      )}
    </ThemeProvider>
  );
}
