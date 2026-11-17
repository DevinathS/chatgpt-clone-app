import { createTheme, type PaletteMode, type Theme } from '@mui/material/styles';

/** Extra, app-specific colour tokens on top of MUI's palette. */
interface Surface {
  sidebar: string;
  bubble: string;
  composer: string;
  hover: string;
  code: string;
  codeHeader: string;
}

declare module '@mui/material/styles' {
  interface Palette {
    surface: Surface;
  }
  interface PaletteOptions {
    surface?: Surface;
  }
}

/** sx helper: `bgcolor: surface('sidebar')` */
export const surface = (key: keyof Surface) => (t: Theme) => t.palette.surface[key];

export function buildTheme(mode: PaletteMode) {
  const dark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: dark ? '#ececec' : '#0d0d0d',
        contrastText: dark ? '#0d0d0d' : '#ffffff',
      },
      background: {
        default: dark ? '#212121' : '#ffffff',
        paper: dark ? '#2a2a2a' : '#ffffff',
      },
      text: {
        primary: dark ? '#ececec' : '#0d0d0d',
        secondary: dark ? '#afafaf' : '#5d5d5d',
      },
      divider: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      surface: dark
        ? {
            sidebar: '#181818',
            bubble: '#303030',
            composer: '#303030',
            hover: 'rgba(255,255,255,0.08)',
            code: '#0d0d0d',
            codeHeader: '#2f2f2f',
          }
        : {
            sidebar: '#f9f9f9',
            bubble: '#f4f4f4',
            composer: '#ffffff',
            hover: 'rgba(0,0,0,0.05)',
            code: '#0d0d0d',
            codeHeader: '#2f2f2f',
          },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '"Inter", ui-sans-serif, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: 14.5,
      h4: { fontWeight: 500, letterSpacing: '-0.01em' },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { WebkitFontSmoothing: 'antialiased' },
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)',
            borderRadius: 8,
            border: '2px solid transparent',
            backgroundClip: 'content-box',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 999 } },
      },
      MuiIconButton: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 20, backgroundImage: 'none' } } },
      MuiMenu: {
        styleOverrides: { paper: { borderRadius: 14, backgroundImage: 'none', border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` } },
      },
      MuiTooltip: { styleOverrides: { tooltip: { fontSize: 12, borderRadius: 8 } } },
    },
  });
}
