import DownloadIcon from '@mui/icons-material/Download';
import {
  Box,
  Button,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';

export function ReportsPage() {
  const { id: projectId } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'status', projectId],
    queryFn: async () => {
      const res = await api.get<Record<string, string | number | null>[]>(
        '/reports/project-status',
        { params: { projectId } },
      );
      return res.data;
    },
    enabled: !!projectId,
  });

  async function download(path: string, filename: string, asPdf: boolean) {
    if (!projectId) return;
    const res = await api.get(path, {
      params: { projectId },
      responseType: asPdf ? 'blob' : 'text',
      // Avoid parsing PDF/CSV through default JSON transform
      transformResponse: asPdf ? [(data) => data] : undefined,
    });
    const blob = asPdf
      ? (res.data instanceof Blob
          ? res.data
          : new Blob([res.data as BlobPart], { type: 'application/pdf' }))
      : new Blob([res.data as string], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 600 }} gutterBottom>
        Project status report
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={() =>
            download('/reports/project-status.csv', 'project-status.csv', false)
          }
        >
          CSV
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={() =>
            download('/reports/project-status.pdf', 'project-status.pdf', true)
          }
        >
          PDF
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() =>
            download('/reports/cost-summary.csv', 'cost-summary.csv', false)
          }
        >
          Cost summary CSV
        </Button>
      </Box>

      {isLoading && <Typography>Loading…</Typography>}
      {error && <Typography color="error">Failed to load report</Typography>}

      {data && data.length > 0 && (
        <Paper variant="outlined" sx={{ overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {Object.keys(data[0])
                  .slice(0, 12)
                  .map((k) => (
                    <TableCell key={k}>{k}</TableCell>
                  ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={i}>
                  {Object.keys(data[0])
                    .slice(0, 12)
                    .map((k) => (
                      <TableCell key={k}>
                        {row[k] == null ? '—' : String(row[k])}
                      </TableCell>
                    ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Container>
  );
}
