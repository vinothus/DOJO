import DownloadIcon from '@mui/icons-material/Download';
import {
  Box,
  Button,
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
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

type PortfolioCost = {
  scope: 'all' | 'mine';
  lineCount: number;
  totalManHrsCost: number;
  totalFuelCost: number;
  totalCost: number;
  totalInvoice: number;
  byProject: {
    projectId: string;
    label: string;
    client: string | null;
    manCost: number;
    fuelCost: number;
    totalCost: number;
    invoice: number;
  }[];
};

function fmtSar(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

export function OllsCostPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['portfolio-cost', user?.email],
    queryFn: async () => {
      const res = await api.get<PortfolioCost>('/reports/portfolio-cost');
      return res.data;
    },
    enabled: !!user,
  });

  const downloadXlsx = async () => {
    const res = await api.get('/reports/olls-cost.xlsx', { responseType: 'blob' });
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'olls-cost.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const barData = (data?.byProject ?? []).map((p) => ({
    name: p.label.length > 14 ? `${p.label.slice(0, 12)}…` : p.label,
    fullName: p.label,
    labor: Math.round(p.manCost),
    fuel: Math.round(p.fuelCost),
    total: Math.round(p.totalCost),
  }));

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1,
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Olls cost
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Estimated labor + fuel from man-hours and travel (rate card), plus invoice on jobs. Admin
            only — all active projects.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={() => void downloadXlsx()}
          disabled={isLoading}
        >
          Download Excel
        </Button>
      </Box>

      {isLoading && <Typography color="text.secondary">Loading…</Typography>}

      {!isLoading && data && (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Jobs in scope
                </Typography>
                <Typography variant="h4" color="primary">
                  {data.lineCount}
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Labor (est.)
                </Typography>
                <Typography variant="h5" color="primary">
                  {fmtSar(data.totalManHrsCost)} SAR
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Fuel (est.)
                </Typography>
                <Typography variant="h5" color="primary">
                  {fmtSar(data.totalFuelCost)} SAR
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Invoice (jobs)
                </Typography>
                <Typography variant="h5" color="primary">
                  {fmtSar(data.totalInvoice)} SAR
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Estimated total cost (labor + fuel)
            </Typography>
            <Typography variant="h4" color="primary">
              {fmtSar(data.totalCost)} SAR
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Scope: {data.scope === 'all' ? 'All active projects' : 'Your workflow jobs only'}
            </Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Cost by project (top {barData.length})
            </Typography>
            {barData.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No cost data in scope yet.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  data={barData}
                  margin={{ top: 8, right: 16, left: 8, bottom: 64 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-35}
                    textAnchor="end"
                    height={70}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tickFormatter={(v) => fmtSar(Number(v))} />
                  <Tooltip
                    formatter={(value, name) => [
                      `${fmtSar(Number(value ?? 0))} SAR`,
                      String(name),
                    ]}
                    labelFormatter={(_, payload) =>
                      (payload?.[0]?.payload as { fullName?: string })?.fullName ?? ''
                    }
                  />
                  <Legend />
                  <Bar dataKey="labor" stackId="a" fill="#1565c0" name="Labor" />
                  <Bar dataKey="fuel" stackId="a" fill="#00838f" name="Fuel" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </>
      )}
    </Container>
  );
}
