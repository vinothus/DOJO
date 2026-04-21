import { Alert, Box, Button, Container, Paper, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { WorkspaceSettingsV1 } from '../settings/workspaceTypes';

type CreateField = keyof WorkspaceSettingsV1['projectCreate'];

function createRule(
  settings: WorkspaceSettingsV1 | undefined,
  field: CreateField,
): 'required' | 'optional' | 'hidden' {
  const r = settings?.projectCreate?.[field];
  if (r === 'required' || r === 'optional' || r === 'hidden') return r;
  return 'optional';
}

export function ProjectNewPage() {
  const nav = useNavigate();
  const qc = useQueryClient();

  const wsQ = useQuery({
    queryKey: ['workspace-settings'],
    queryFn: async () => {
      const res = await api.get<WorkspaceSettingsV1>('/workspace-settings');
      return res.data;
    },
  });
  const ws = wsQ.data;

  const m = useMutation({
    mutationFn: async (body: Record<string, string | number | undefined>) => {
      const res = await api.post<{ id: string }>('/projects', body);
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      nav(`/projects/${data.id}`);
    },
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pick = (name: string) => String(fd.get(name) ?? '').trim();

    const projectName = pick('projectName');
    const projectId = pick('projectId');

    const body: Record<string, string | number | undefined> = {};

    if (projectName) body.projectName = projectName;
    if (projectId) body.projectId = projectId;

    const year = fd.get('year');
    const month = fd.get('month');
    if (year) body.year = Number(year);
    if (month) body.month = Number(month);

    const area = pick('area');
    const client = pick('client');
    const plant = pick('plant');
    const poNumber = pick('poNumber');
    const bidNumber = pick('bidNumber');
    if (area) body.area = area;
    if (client) body.client = client;
    if (plant) body.plant = plant;
    if (poNumber) body.poNumber = poNumber;
    if (bidNumber) body.bidNumber = bidNumber;

    if (createRule(ws, 'projectName') === 'required' && !projectName) return;
    if (createRule(ws, 'projectId') === 'required' && !projectId) return;

    if (!projectName && !projectId) return;

    m.mutate(body);
  }

  const show = (field: CreateField) => createRule(ws, field) !== 'hidden';
  const req = (field: CreateField) => createRule(ws, field) === 'required';

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 600 }} gutterBottom>
        New project
      </Typography>
      <Paper component="form" onSubmit={onSubmit} sx={{ p: 3 }} variant="outlined">
        {m.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Could not create project
          </Alert>
        )}
        {show('projectName') && (
          <TextField
            name="projectName"
            label="Project name"
            required={req('projectName')}
            fullWidth
            margin="normal"
            helperText={
              req('projectName')
                ? 'Required'
                : 'Optional — if project ID is omitted, one is generated from this name'
            }
          />
        )}
        {show('projectId') && (
          <TextField
            name="projectId"
            label="Project ID"
            required={req('projectId')}
            fullWidth
            margin="normal"
            helperText="Business identifier — leave empty to auto-generate when name is set"
          />
        )}
        {show('client') && (
          <TextField
            name="client"
            label="Client"
            required={req('client')}
            fullWidth
            margin="normal"
          />
        )}
        {show('plant') && (
          <TextField
            name="plant"
            label="Plant/Unit"
            required={req('plant')}
            fullWidth
            margin="normal"
          />
        )}
        <Box sx={{ display: 'flex', gap: 2 }}>
          {show('year') && (
            <TextField
              name="year"
              label="Year"
              type="number"
              required={req('year')}
              fullWidth
              margin="normal"
            />
          )}
          {show('month') && (
            <TextField
              name="month"
              label="Month"
              type="number"
              required={req('month')}
              fullWidth
              margin="normal"
              slotProps={{ htmlInput: { min: 1, max: 12 } }}
            />
          )}
        </Box>
        {show('area') && (
          <TextField
            name="area"
            label="Area"
            required={req('area')}
            fullWidth
            margin="normal"
          />
        )}
        {show('poNumber') && (
          <TextField
            name="poNumber"
            label="PO number"
            required={req('poNumber')}
            fullWidth
            margin="normal"
          />
        )}
        {show('bidNumber') && (
          <TextField
            name="bidNumber"
            label="Bid number"
            required={req('bidNumber')}
            fullWidth
            margin="normal"
          />
        )}
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" disabled={m.isPending}>
            Create
          </Button>
          <Button type="button" variant="text" onClick={() => nav(-1)}>
            Cancel
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
