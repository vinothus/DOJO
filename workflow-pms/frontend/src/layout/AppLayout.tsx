import AddIcon from '@mui/icons-material/Add';
import BarChartIcon from '@mui/icons-material/BarChart';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PaidIcon from '@mui/icons-material/Paid';
import UpdateIcon from '@mui/icons-material/Update';
import {
  AppBar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { canCreateProjects } from '../utils/workflowRoles';

const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_ICON = 72;
const BOTTOM_NAV_PX = 56;

function pathToBottomValue(pathname: string, canCreate: boolean): string {
  if (pathname === '/') return 'home';
  if (canCreate && pathname === '/projects/new') return 'new';
  if (pathname.startsWith('/projects') || pathname.startsWith('/olls')) return 'projects';
  return 'home';
}

export function AppLayout() {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isSm);
  const [ollsOpen, setOllsOpen] = useState(true);
  const nav = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.roles.includes('admin') ?? false;
  const allowNewProject = canCreateProjects(user?.roles ?? []);

  const closeDrawerIfMobile = () => {
    if (isSm) setOpen(false);
  };

  useEffect(() => {
    if (!isSm) setOpen(true);
  }, [isSm]);

  const bottomValue =
    open && isSm ? 'more' : pathToBottomValue(location.pathname, allowNewProject);

  const handleBottomChange = (_: React.SyntheticEvent, newValue: string) => {
    if (newValue === 'more') {
      setOpen(true);
      return;
    }
    setOpen(false);
    if (newValue === 'home') nav('/');
    if (newValue === 'projects') nav('/projects');
    if (newValue === 'new' && allowNewProject) nav('/projects/new');
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box
        sx={{
          px: { xs: 1, md: 2 },
          py: 2,
          background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: 'white',
            fontWeight: 700,
            letterSpacing: 0.5,
            display: { xs: 'none', md: 'block' },
          }}
        >
          Workflow PMS
        </Typography>
        <Typography
          variant="h6"
          sx={{
            color: 'white',
            fontWeight: 700,
            display: { xs: 'block', md: 'none' },
            textAlign: 'center',
          }}
        >
          W
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255,255,255,0.85)',
            display: { xs: 'none', md: 'block' },
            mt: 0.5,
          }}
        >
          Industrial line tracking
        </Typography>
      </Box>
      <Divider />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <List sx={{ py: 1, flexShrink: 0 }} disablePadding>
          <Tooltip title="Dashboard" placement="right">
            <ListItemButton
              selected={location.pathname === '/'}
              onClick={() => {
                nav('/');
                closeDrawerIfMobile();
              }}
              sx={{ justifyContent: { xs: 'center', md: 'flex-start' }, px: { xs: 1, md: 2 } }}
            >
              <ListItemIcon sx={{ minWidth: { xs: 0, md: 56 }, justifyContent: 'center' }}>
                <DashboardIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                sx={{ display: { xs: 'none', md: 'block' } }}
                primary="Dashboard"
                secondary="Summary & charts"
                slotProps={{
                  primary: { variant: 'body2', sx: { fontWeight: 600 } },
                  secondary: { variant: 'caption' },
                }}
              />
            </ListItemButton>
          </Tooltip>
          <Tooltip title="Olls projects" placement="right">
            <ListItemButton
              onClick={() => setOllsOpen(!ollsOpen)}
              selected={
                location.pathname.startsWith('/projects') ||
                location.pathname.startsWith('/olls')
              }
              sx={{
                pr: { xs: 1, md: 1 },
                justifyContent: { xs: 'center', md: 'flex-start' },
                px: { xs: 1, md: 2 },
              }}
            >
              <ListItemIcon sx={{ minWidth: { xs: 0, md: 56 }, justifyContent: 'center' }}>
                <FolderOpenIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                sx={{ display: { xs: 'none', md: 'block' } }}
                primary="Olls Project"
                secondary="Portfolio & jobs"
                slotProps={{
                  primary: { variant: 'body2', sx: { fontWeight: 600 } },
                  secondary: { variant: 'caption' },
                }}
              />
              {ollsOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </Tooltip>
          <Collapse in={ollsOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <Tooltip title="Olls update" placement="right">
                <ListItemButton
                  sx={{
                    pl: { xs: 1, md: 4 },
                    py: 0.75,
                    justifyContent: { xs: 'center', md: 'flex-start' },
                  }}
                  selected={
                    location.pathname === '/projects' ||
                    (location.pathname.startsWith('/projects/') &&
                      !location.pathname.startsWith('/olls'))
                  }
                  onClick={() => {
                    nav('/projects');
                    closeDrawerIfMobile();
                  }}
                >
                  <ListItemIcon sx={{ minWidth: { xs: 0, md: 36 }, justifyContent: 'center' }}>
                    <UpdateIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    sx={{ display: { xs: 'none', md: 'block' } }}
                    primary="Olls update"
                    slotProps={{ primary: { variant: 'body2' } }}
                  />
                </ListItemButton>
              </Tooltip>
              <Tooltip title="Olls stats" placement="right">
                <ListItemButton
                  sx={{
                    pl: { xs: 1, md: 4 },
                    py: 0.75,
                    justifyContent: { xs: 'center', md: 'flex-start' },
                  }}
                  selected={location.pathname === '/olls/stats'}
                  onClick={() => {
                    nav('/olls/stats');
                    closeDrawerIfMobile();
                  }}
                >
                  <ListItemIcon sx={{ minWidth: { xs: 0, md: 36 }, justifyContent: 'center' }}>
                    <BarChartIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    sx={{ display: { xs: 'none', md: 'block' } }}
                    primary="Olls stats"
                    slotProps={{ primary: { variant: 'body2' } }}
                  />
                </ListItemButton>
              </Tooltip>
              <Tooltip title="Olls cost" placement="right">
                <ListItemButton
                  sx={{
                    pl: { xs: 1, md: 4 },
                    py: 0.75,
                    justifyContent: { xs: 'center', md: 'flex-start' },
                  }}
                  selected={location.pathname === '/olls/cost'}
                  onClick={() => {
                    nav('/olls/cost');
                    closeDrawerIfMobile();
                  }}
                >
                  <ListItemIcon sx={{ minWidth: { xs: 0, md: 36 }, justifyContent: 'center' }}>
                    <PaidIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    sx={{ display: { xs: 'none', md: 'block' } }}
                    primary="Olls cost"
                    slotProps={{ primary: { variant: 'body2' } }}
                  />
                </ListItemButton>
              </Tooltip>
            </List>
          </Collapse>
        </List>
        {allowNewProject && (
          <List sx={{ py: 0, flexShrink: 0 }} disablePadding>
            <Tooltip title="New project" placement="right">
              <ListItemButton
                onClick={() => {
                  nav('/projects/new');
                  closeDrawerIfMobile();
                }}
                sx={{ justifyContent: { xs: 'center', md: 'flex-start' }, px: { xs: 1, md: 2 } }}
              >
                <ListItemIcon sx={{ minWidth: { xs: 0, md: 56 }, justifyContent: 'center' }}>
                  <AddIcon color="primary" />
                </ListItemIcon>
                <ListItemText sx={{ display: { xs: 'none', md: 'block' } }} primary="New project" />
              </ListItemButton>
            </Tooltip>
          </List>
        )}
        {isAdmin && (
          <List sx={{ py: 0, flexShrink: 0 }} disablePadding>
            <Tooltip title="Workspace settings" placement="right">
              <ListItemButton
                onClick={() => {
                  nav('/admin/workspace-settings');
                  closeDrawerIfMobile();
                }}
                selected={location.pathname === '/admin/workspace-settings'}
                sx={{ justifyContent: { xs: 'center', md: 'flex-start' }, px: { xs: 1, md: 2 } }}
              >
                <ListItemIcon sx={{ minWidth: { xs: 0, md: 56 }, justifyContent: 'center' }}>
                  <UpdateIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  sx={{ display: { xs: 'none', md: 'block' } }}
                  primary="Workspace settings"
                />
              </ListItemButton>
            </Tooltip>
          </List>
        )}
      </Box>
      <Divider />
      <Box sx={{ px: { xs: 1, md: 2 }, py: 2 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ display: { xs: 'none', md: 'block' } }}
        >
          {user?.email}
        </Typography>
        <Tooltip title={user?.email ? `${user.email} — Log out` : 'Log out'} placement="right">
          <ListItemButton
            onClick={() => {
              logout();
              nav('/login');
            }}
            sx={{
              borderRadius: 1,
              mt: { xs: 0, md: 1 },
              bgcolor: 'grey.100',
              justifyContent: { xs: 'center', md: 'flex-start' },
            }}
          >
            <ListItemIcon sx={{ minWidth: { xs: 0, md: 56 }, justifyContent: 'center' }}>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText sx={{ display: { xs: 'none', md: 'block' } }} primary="Log out" />
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.100' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'white',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 48, sm: 56, md: 64 }, px: { xs: 1, sm: 2 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setOpen(true)}
            sx={{ mr: 1, display: { md: 'none' } }}
            aria-label="open menu"
            size="medium"
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            {user?.name ?? user?.email}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }}
          anchor="left"
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH_ICON,
              maxWidth: '100%',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: { xs: 6, sm: 7, md: 8 },
          height: {
            xs: `calc(100vh - ${48 + BOTTOM_NAV_PX}px)`,
            sm: `calc(100vh - ${56 + BOTTOM_NAV_PX}px)`,
            md: 'calc(100vh - 64px)',
          },
          maxHeight: {
            xs: `calc(100vh - ${48 + BOTTOM_NAV_PX}px)`,
            sm: `calc(100vh - ${56 + BOTTOM_NAV_PX}px)`,
            md: 'calc(100vh - 64px)',
          },
          pb: { xs: 0, md: 0 },
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Outlet />
      </Box>

      {/* Mobile: Material-style bottom bar with icons + labels */}
      <Paper
        elevation={8}
        sx={{
          display: { xs: 'block', md: 'none' },
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.appBar,
          borderTop: 1,
          borderColor: 'divider',
          borderRadius: 0,
          pb: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <BottomNavigation
          value={bottomValue}
          onChange={handleBottomChange}
          showLabels
          sx={{
            height: BOTTOM_NAV_PX,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              maxWidth: 'none',
              px: 0.5,
              py: 0.5,
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.65rem',
              lineHeight: 1.2,
              '&.Mui-selected': { fontSize: '0.65rem' },
            },
          }}
        >
          <BottomNavigationAction
            label="Home"
            value="home"
            icon={<DashboardIcon />}
          />
          <BottomNavigationAction
            label="Projects"
            value="projects"
            icon={<FolderOpenIcon />}
          />
          {allowNewProject && (
            <BottomNavigationAction label="New" value="new" icon={<AddIcon />} />
          )}
          <BottomNavigationAction
            label="More"
            value="more"
            icon={<MoreHorizIcon />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
