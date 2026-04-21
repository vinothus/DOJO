import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppLayout } from './layout/AppLayout';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { LineItemNewPage } from './pages/LineItemNewPage';
import { LineItemWorkspacePage } from './pages/LineItemWorkspacePage';
import { LoginPage } from './pages/LoginPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ProjectNewPage } from './pages/ProjectNewPage';
import { AdminWorkspaceSettingsPage } from './pages/AdminWorkspaceSettingsPage';
import { OllsCostPage } from './pages/OllsCostPage';
import { OllsStatsPage } from './pages/OllsStatsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ReportsPage } from './pages/ReportsPage';
import { canCreateProjects } from './utils/workflowRoles';

const queryClient = new QueryClient();
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0d47a1' },
    secondary: { main: '#00838f' },
    background: { default: '#eceff1', paper: '#fff' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return null;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user?.roles.includes('admin')) {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
}

function RequireProjectCreator({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!canCreateProjects(user?.roles ?? [])) {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/olls/stats" element={<OllsStatsPage />} />
        <Route path="/olls/cost" element={<OllsCostPage />} />
        <Route
          path="/projects/new"
          element={
            <RequireProjectCreator>
              <ProjectNewPage />
            </RequireProjectCreator>
          }
        />
        <Route
          path="/admin/workspace-settings"
          element={
            <RequireAdmin>
              <AdminWorkspaceSettingsPage />
            </RequireAdmin>
          }
        />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route
          path="/projects/:id/lines/new"
          element={
            <RequireProjectCreator>
              <LineItemNewPage />
            </RequireProjectCreator>
          }
        />
        <Route
          path="/projects/:projectId/lines/:lineId"
          element={<LineItemWorkspacePage />}
        />
        <Route path="/projects/:id/reports" element={<ReportsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
