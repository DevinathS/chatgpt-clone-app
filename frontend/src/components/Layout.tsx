import { Box, Drawer, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setSidebarOpen } from '../store/uiSlice';
import { surface } from '../theme';
import ChatPage from './ChatPage';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export const SIDEBAR_WIDTH = 260;

export default function Layout() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const open = useAppSelector((s) => s.ui.sidebarOpen);

  return (
    <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden', bgcolor: 'background.default' }}>
      {isMobile ? (
        <Drawer
          open={open}
          onClose={() => dispatch(setSidebarOpen(false))}
          slotProps={{ paper: { sx: { width: SIDEBAR_WIDTH, bgcolor: surface('sidebar'), backgroundImage: 'none' } } }}
        >
          <Sidebar onNavigate={() => dispatch(setSidebarOpen(false))} />
        </Drawer>
      ) : (
        <Box
          component="aside"
          sx={{
            width: open ? SIDEBAR_WIDTH : 0,
            flexShrink: 0,
            overflow: 'hidden',
            bgcolor: surface('sidebar'),
            borderRight: open ? 1 : 0,
            borderColor: 'divider',
            transition: 'width .2s ease',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          }}
        >
          <Box sx={{ width: SIDEBAR_WIDTH, height: '100%' }}>
            <Sidebar />
          </Box>
        </Box>
      )}

      <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar />
        <ChatPage />
      </Box>
    </Box>
  );
}
