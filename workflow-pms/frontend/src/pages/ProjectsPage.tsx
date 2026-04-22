import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  Chip,
  Container,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ROLE_DASHBOARD_HINT, STAGE_LABEL, type WorkflowStage } from '../types';

type ProjectRow = {
  id: string;
  projectId: string;
  projectName: string | null;
  client: string | null;
  plant: string | null;
  status: string;
  updatedAt?: string;
  _count: { lineItems: number };
  /** Set only when the project has exactly one job — tile can show this stage */
  singleJobStage?: WorkflowStage | null;
};

type DashboardAdmin = {
  scope: 'all';
  totalProjects: number;
  totalLines: number;
  byStage: Partial<Record<WorkflowStage, number>>;
};

type DashboardMine = {
  scope: 'mine';
  myProjectCount: number;
  myLineCount: number;
  byStage: Partial<Record<WorkflowStage, number>>;
};

type DashboardData = DashboardAdmin | DashboardMine;

type SortKey = 'updated' | 'projectId' | 'projectName' | 'client';

function jobCountLabel(n: number): string {
  return n === 1 ? '1 job' : `${n} jobs`;
}

export function ProjectsPage() {
  const nav = useNavigate();
  const location = useLocation();
  /** `/` = home dashboard; `/projects` = project list only (no summary cards). */
  const showDashboard = location.pathname === '/';
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('admin') ?? false;

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [includeArchived, setIncludeArchived] = useState(false);

  const primaryRole = user?.roles[0];
  const dashHint =
    (primaryRole && ROLE_DASHBOARD_HINT[primaryRole]) ||
    'Projects listed below match your workflow permissions.';

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', user?.email, includeArchived],
    queryFn: async () => {
      const res = await api.get<ProjectRow[]>('/projects', {
        params: isAdmin && includeArchived ? { includeArchived: true } : {},
      });
      return res.data;
    },
  });

  const { data: dash } = useQuery({
    queryKey: ['dashboard-summary', user?.email],
    queryFn: async () => {
      const res = await api.get<DashboardData>('/projects/summary/dashboard');
      return res.data;
    },
    enabled: showDashboard && !!user,
  });

  const maxStage =
    dash && Object.keys(dash.byStage).length
      ? Math.max(...Object.values(dash.byStage).map((n) => n ?? 0), 1)
      : 1;

  const filteredSorted = useMemo(() => {
    if (!data?.length) return [];
    const q = search.trim().toLowerCase();
    let rows = data.filter((p) => {
      if (!q) return true;
      const hay = [
        p.projectId,
        p.projectName ?? '',
        p.client ?? '',
        p.plant ?? '',
        p.status,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case 'projectId':
          return a.projectId.localeCompare(b.projectId);
        case 'projectName':
          return (a.projectName ?? a.projectId).localeCompare(b.projectName ?? b.projectId);
        case 'client':
          return (a.client ?? '').localeCompare(b.client ?? '');
        case 'updated':
        default: {
          const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return tb - ta;
        }
      }
    });
    return rows;
  }, [data, search, sort]);

  const paged = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredSorted.slice(start, start + rowsPerPage);
  }, [filteredSorted, page, rowsPerPage]);

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: { xs: 1.5, sm: 2 },
        px: { xs: 1.5, sm: 3 },
        overflowX: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, minWidth: 0 }}>
        {showDashboard && (
          <>
            <Box
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: 3,
                background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 55%, #0277bd 100%)',
                color: 'common.white',
                boxShadow: 3,
              }}
            >
              <Typography variant="overline" sx={{ opacity: 0.9 }}>
                Welcome back
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.5rem', sm: '2rem' } }}
              >
                {isAdmin ? 'Operations dashboard' : 'My workflow queue'}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.95, maxWidth: 720 }}>
                {dashHint}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {user?.roles.map((r) => (
                  <Chip
                    key={r}
                    size="small"
                    label={r.replace(/_/g, ' ')}
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                ))}
              </Box>
            </Box>

            {dash && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: 2,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    flex: 1,
                    p: 2.5,
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <TrendingUpIcon color="primary" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {dash.scope === 'all' ? 'Portfolio snapshot' : 'Your queue'}
                    </Typography>
                  </Box>
                  {dash.scope === 'all' ? (
                    <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="h3" sx={{ fontWeight: 800 }} color="primary">
                          {dash.totalProjects}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Active projects
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h3" sx={{ fontWeight: 800 }} color="primary">
                          {dash.totalLines}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Jobs (active projects)
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="h3" sx={{ fontWeight: 800 }} color="primary">
                          {dash.myProjectCount}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Projects with your work
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h3" sx={{ fontWeight: 800 }} color="primary">
                          {dash.myLineCount}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Jobs in your stages
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    flex: 2,
                    p: 2.5,
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Jobs by workflow stage
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {(Object.keys(dash.byStage).length ? Object.entries(dash.byStage) : []).map(
                      ([stage, n]) => {
                        const num = n ?? 0;
                        const pct = Math.min(100, Math.round((num / maxStage) * 100));
                        return (
                          <Box key={stage}>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: 0.5,
                              }}
                            >
                              <Typography variant="caption" noWrap sx={{ maxWidth: '70%' }}>
                                {STAGE_LABEL[stage as WorkflowStage]}
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                {num}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={pct}
                              sx={{ height: 8, borderRadius: 1 }}
                            />
                          </Box>
                        );
                      },
                    )}
                    {Object.keys(dash.byStage).length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No jobs in scope yet.
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Box>
            )}
          </>
        )}

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6">Projects</Typography>
            {!showDashboard && (
              <Button
                component={RouterLink}
                to="/"
                variant="text"
                size="small"
                sx={{ textTransform: 'none', fontWeight: 500 }}
              >
                View dashboard
              </Button>
            )}
          </Box>
          {isAdmin && (
            <Button
              component={RouterLink}
              to="/projects/new"
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
            >
              New project
            </Button>
          )}
        </Box>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              alignItems: { xs: 'stretch', md: 'center' },
              flexWrap: 'wrap',
            }}
          >
            <TextField
              size="small"
              placeholder="Search project ID, name, client, plant…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              sx={{ flex: 1, minWidth: { xs: '100%', sm: 220 } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="sort-label">Sort by</InputLabel>
              <Select
                labelId="sort-label"
                label="Sort by"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortKey);
                  setPage(0);
                }}
              >
                <MenuItem value="updated">Last updated</MenuItem>
                <MenuItem value="projectId">Project ID</MenuItem>
                <MenuItem value="projectName">Project name</MenuItem>
                <MenuItem value="client">Client</MenuItem>
              </Select>
            </FormControl>
            {isAdmin && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeArchived}
                    onChange={(_, v) => {
                      setIncludeArchived(v);
                      setPage(0);
                    }}
                  />
                }
                label="Show archived"
              />
            )}
          </Box>
        </Paper>

        {isLoading && <Typography>Loading…</Typography>}
        {error && <Typography color="error">Failed to load projects</Typography>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {paged.map((p) => (
            <Card
              key={p.id}
              elevation={2}
              sx={{
                borderRadius: 2,
                overflow: 'visible',
                transition: 'transform 0.15s, box-shadow 0.15s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 },
              }}
            >
              <CardActionArea onClick={() => nav(`/projects/${p.id}`)}>
                <CardContent sx={{ py: 2.5 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { sm: 'center' },
                      gap: 1,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }} noWrap>
                        {p.projectName || p.projectId}
                      </Typography>
                      {p.projectName && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {p.projectId}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {p.client ?? '—'} · {p.plant ?? '—'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip
                        label={jobCountLabel(p._count.lineItems)}
                        color="secondary"
                        variant="outlined"
                        size="small"
                      />
                      {p._count.lineItems === 1 && p.singleJobStage != null && (
                          <Chip
                            label={STAGE_LABEL[p.singleJobStage]}
                            size="small"
                            variant="outlined"
                            color="info"
                          />
                        )}
                      <Chip
                        label={
                          p.status === 'ARCHIVED'
                            ? 'Archived'
                            : p.status === 'COMPLETE'
                              ? 'Complete'
                              : 'Active'
                        }
                        size="small"
                        color={
                          p.status === 'ARCHIVED'
                            ? 'default'
                            : p.status === 'COMPLETE'
                              ? 'info'
                              : 'primary'
                        }
                        variant={p.status === 'ARCHIVED' ? 'filled' : 'outlined'}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>

        {filteredSorted.length > 0 && (
          <TablePagination
            component="div"
            count={filteredSorted.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sx={{ borderTop: 1, borderColor: 'divider', pt: 1 }}
          />
        )}

        {!isLoading && data?.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography color="text.secondary">
              No projects in your queue. When jobs reach your workflow stage, they appear here.
            </Typography>
          </Paper>
        )}

        {!isLoading && data && data.length > 0 && filteredSorted.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No projects match your search.
          </Typography>
        )}
      </Box>
    </Container>
  );
}
