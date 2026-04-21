import {
  Box,
  Card,
  CardContent,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { STAGE_LABEL, type WorkflowStage } from '../types';

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

type LinesByProject = {
  rows: { projectId: string; label: string; lineCount: number }[];
};

const CHART_COLORS = [
  '#0d47a1',
  '#1565c0',
  '#0277bd',
  '#00838f',
  '#00695c',
  '#2e7d32',
  '#558b2f',
  '#9e9d24',
  '#f9a825',
  '#ff8f00',
];

export function OllsStatsPage() {
  const { user } = useAuth();

  const { data: dash, isLoading: dLoading } = useQuery({
    queryKey: ['dashboard-summary', user?.email],
    queryFn: async () => {
      const res = await api.get<DashboardAdmin | DashboardMine>('/projects/summary/dashboard');
      return res.data;
    },
    enabled: !!user,
  });

  const { data: byProj, isLoading: pLoading } = useQuery({
    queryKey: ['lines-by-project', user?.email],
    queryFn: async () => {
      const res = await api.get<LinesByProject>('/projects/summary/lines-by-project');
      return res.data;
    },
    enabled: !!user,
  });

  const stageRows =
    dash && Object.keys(dash.byStage).length
      ? Object.entries(dash.byStage)
          .filter(([, n]) => (n ?? 0) > 0)
          .map(([stage, count]) => ({
            name: STAGE_LABEL[stage as WorkflowStage] ?? stage,
            value: count ?? 0,
          }))
      : [];

  const barRows = (byProj?.rows ?? []).map((r) => ({
    name:
      r.label.length > 22 ? `${r.label.slice(0, 20)}…` : r.label,
    fullName: r.label,
    lines: r.lineCount,
  }));

  const loading = dLoading || pLoading;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Olls statistics
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Portfolio overview: job counts by workflow stage and by project.
      </Typography>

      {loading && <Typography color="text.secondary">Loading…</Typography>}

      {!loading && dash && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                {dash.scope === 'all' ? 'Active projects' : 'Projects with your work'}
              </Typography>
              <Typography variant="h4" color="primary">
                {dash.scope === 'all' ? dash.totalProjects : dash.myProjectCount}
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                {dash.scope === 'all' ? 'Jobs (all)' : 'Jobs in your stages'}
              </Typography>
              <Typography variant="h4" color="primary">
                {dash.scope === 'all' ? dash.totalLines : dash.myLineCount}
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ gridColumn: { xs: 'span 1', md: 'span 1' } }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Scope
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {dash.scope === 'all' ? 'Full portfolio' : 'Your workflow queue'}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {!loading && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
            gap: 3,
          }}
        >
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Jobs by workflow stage
            </Typography>
            {stageRows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No job data for charts yet.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={stageRows}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={false}
                  >
                    {stageRows.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Top projects by job count
            </Typography>
            {barRows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No projects to show.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={barRows}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => [Number(value ?? 0), 'Jobs']}
                    labelFormatter={(_, payload) =>
                      (payload?.[0]?.payload as { fullName?: string })?.fullName ?? ''
                    }
                  />
                  <Bar dataKey="lines" fill="#0d47a1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Box>
      )}
    </Container>
  );
}
