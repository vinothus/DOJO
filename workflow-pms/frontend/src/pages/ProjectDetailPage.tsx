import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Chip,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  ALL_STAGES,
  STAGE_LABEL,
  getNextStage,
  type WorkflowStage,
} from '../types';
import { canCreateProjects } from '../utils/workflowRoles';

type LineItem = {
  id: string;
  drawingNumber: string | null;
  description: string | null;
  currentStage: WorkflowStage;
  version: number;
};

type ProjectDetail = {
  id: string;
  projectId: string;
  projectName: string | null;
  year: number | null;
  month: number | null;
  area: string | null;
  client: string | null;
  plant: string | null;
  poNumber: string | null;
  bidNumber: string | null;
  status: string;
  lineItems: LineItem[];
  createdBy?: { id: string; name: string | null; email: string | null } | null;
};

type HandoverGate = {
  ready: boolean;
  nextStage: WorkflowStage | null;
  errors: string[];
  currentStage?: WorkflowStage;
};

function apiErrorLines(err: unknown): string[] {
  if (axios.isAxiosError(err) && err.response?.data) {
    const d = err.response.data as { message?: string; errors?: string[] };
    const lines: string[] = [];
    if (d.message) lines.push(d.message);
    if (d.errors?.length) lines.push(...d.errors);
    if (lines.length) return lines;
  }
  return [err instanceof Error ? err.message : 'Request failed'];
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.roles.includes('admin');
  const isSiteTech = user?.roles.includes('site_measurement');
  const canEditProjectHeader = isAdmin || isSiteTech;
  const allowAddLine = canCreateProjects(user?.roles ?? []);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await api.get<ProjectDetail>(`/projects/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const [mainTab, setMainTab] = useState(0);
  const [handoverOpen, setHandoverOpen] = useState<LineItem | null>(null);
  const [overrideOpen, setOverrideOpen] = useState<LineItem | null>(null);
  const [targetStage, setTargetStage] = useState<WorkflowStage>('INPUT_SITE_MEASUREMENT');
  const [overrideReason, setOverrideReason] = useState('');
  const [projectEdit, setProjectEdit] = useState({
    projectName: '',
    year: '' as number | '',
    month: '' as number | '',
    area: '',
    client: '',
    plant: '',
    poNumber: '',
    bidNumber: '',
    projectId: '',
  });

  const handoverGateQ = useQuery({
    queryKey: ['handover-gate', handoverOpen?.id] as const,
    queryFn: async () => {
      const res = await api.get<HandoverGate>(
        `/line-items/${handoverOpen!.id}/handover-gate`,
      );
      return res.data;
    },
    enabled: !!handoverOpen,
  });

  const handoverM = useMutation({
    mutationFn: async ({
      lineId,
      targetStage: ts,
      note,
    }: {
      lineId: string;
      targetStage: WorkflowStage;
      note?: string;
    }) => {
      await api.post(`/line-items/${lineId}/handover`, {
        targetStage: ts,
        note,
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['project', id] });
      qc.invalidateQueries({ queryKey: ['handover-gate'] });
      if (vars?.lineId) qc.invalidateQueries({ queryKey: ['line-audit', vars.lineId] });
      setHandoverOpen(null);
    },
  });

  const archiveM = useMutation({
    mutationFn: async (status: 'ACTIVE' | 'ARCHIVED') => {
      await api.patch(`/projects/${id}`, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const overrideM = useMutation({
    mutationFn: async ({
      lineId,
      targetStage: ts,
      reason,
      version,
    }: {
      lineId: string;
      targetStage: WorkflowStage;
      reason: string;
      version: number;
    }) => {
      await api.post(`/line-items/${lineId}/stage-override`, {
        targetStage: ts,
        reason,
        version,
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['project', id] });
      if (vars?.lineId) qc.invalidateQueries({ queryKey: ['line-audit', vars.lineId] });
      setOverrideOpen(null);
      setOverrideReason('');
    },
  });

  useEffect(() => {
    if (!project) return;
    setProjectEdit({
      projectName: project.projectName ?? '',
      year: project.year ?? '',
      month: project.month ?? '',
      area: project.area ?? '',
      client: project.client ?? '',
      plant: project.plant ?? '',
      poNumber: project.poNumber ?? '',
      bidNumber: project.bidNumber ?? '',
      projectId: project.projectId ?? '',
    });
  }, [project]);

  const projectUpdateM = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      await api.patch(`/projects/${id}`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  if (!id) return null;
  if (isLoading || !project)
    return (
      <Container sx={{ py: 3 }}>
        <Typography>Loading…</Typography>
      </Container>
    );

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button component={RouterLink} to="/" size="small">
          ← Projects
        </Button>
        <Button
          component={RouterLink}
          to={`/projects/${id}/reports`}
          variant="outlined"
          size="small"
        >
          Reports (status / CSV / PDF)
        </Button>
        <Chip
          size="small"
          label={project.status === 'ARCHIVED' ? 'Archived' : 'Active'}
          color={project.status === 'ARCHIVED' ? 'default' : 'success'}
        />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 600, fontSize: { xs: '1.15rem', sm: '1.5rem' } }}>
        {project.projectName || project.projectId}
      </Typography>
      {project.projectName && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {project.projectId}
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {project.client ?? '—'} · {project.plant ?? '—'}
      </Typography>

      <Tabs
        value={mainTab}
        onChange={(_, v) => setMainTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab label="Project" />
        <Tab label="Jobs" />
      </Tabs>

      {mainTab === 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          {canEditProjectHeader && (
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Edit project header
              {isAdmin ? ' (admin)' : isSiteTech ? ' (site tech)' : ''}
            </Typography>
          )}
          {project.createdBy && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Created by: {project.createdBy.name || project.createdBy.email || '—'}
            </Typography>
          )}
          {canEditProjectHeader ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                maxWidth: 720,
              }}
            >
              <TextField
                label="Project name"
                value={projectEdit.projectName}
                onChange={(e) => setProjectEdit((s) => ({ ...s, projectName: e.target.value }))}
                size="small"
              />
              <TextField
                label="Project ID"
                value={projectEdit.projectId}
                onChange={(e) => setProjectEdit((s) => ({ ...s, projectId: e.target.value }))}
                size="small"
              />
              <TextField
                label="Year"
                type="number"
                value={projectEdit.year}
                onChange={(e) =>
                  setProjectEdit((s) => ({
                    ...s,
                    year: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                size="small"
              />
              <TextField
                label="Month (1–12)"
                type="number"
                value={projectEdit.month}
                onChange={(e) =>
                  setProjectEdit((s) => ({
                    ...s,
                    month: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                size="small"
              />
              <TextField
                label="Area"
                value={projectEdit.area}
                onChange={(e) => setProjectEdit((s) => ({ ...s, area: e.target.value }))}
                size="small"
              />
              <TextField
                label="Client"
                value={projectEdit.client}
                onChange={(e) => setProjectEdit((s) => ({ ...s, client: e.target.value }))}
                size="small"
              />
              <TextField
                label="Plant / unit"
                value={projectEdit.plant}
                onChange={(e) => setProjectEdit((s) => ({ ...s, plant: e.target.value }))}
                size="small"
              />
              <TextField
                label="PO number"
                value={projectEdit.poNumber}
                onChange={(e) => setProjectEdit((s) => ({ ...s, poNumber: e.target.value }))}
                size="small"
              />
              <TextField
                label="Bid number"
                value={projectEdit.bidNumber}
                onChange={(e) => setProjectEdit((s) => ({ ...s, bidNumber: e.target.value }))}
                size="small"
              />
              <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <Button
                  variant="contained"
                  size="small"
                  disabled={projectUpdateM.isPending}
                  onClick={() =>
                    projectUpdateM.mutate({
                      projectName: projectEdit.projectName || undefined,
                      year: projectEdit.year === '' ? undefined : Number(projectEdit.year),
                      month: projectEdit.month === '' ? undefined : Number(projectEdit.month),
                      area: projectEdit.area || undefined,
                      client: projectEdit.client || undefined,
                      plant: projectEdit.plant || undefined,
                      poNumber: projectEdit.poNumber || undefined,
                      bidNumber: projectEdit.bidNumber || undefined,
                      projectId: projectEdit.projectId || undefined,
                    })
                  }
                >
                  Save project
                </Button>
              </Box>
            </Box>
          ) : (
            <Box
              component="dl"
              sx={{
                m: 0,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '140px 1fr' },
                gap: { xs: 0.5, sm: 1 },
                maxWidth: 560,
                '& dt': { fontWeight: 600, color: 'text.secondary' },
                '& dd': { m: 0 },
              }}
            >
              <dt>Project ID</dt>
              <dd>{project.projectId}</dd>
              <dt>Year / month</dt>
              <dd>
                {project.year ?? '—'} / {project.month ?? '—'}
              </dd>
              <dt>Area</dt>
              <dd>{project.area ?? '—'}</dd>
              <dt>Client</dt>
              <dd>{project.client ?? '—'}</dd>
              <dt>Plant</dt>
              <dd>{project.plant ?? '—'}</dd>
              <dt>PO number</dt>
              <dd>{project.poNumber ?? '—'}</dd>
              <dt>Bid number</dt>
              <dd>{project.bidNumber ?? '—'}</dd>
            </Box>
          )}
        </Paper>
      )}

      {mainTab === 1 && (
        <>
          {(allowAddLine || isAdmin) && (
            <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              {allowAddLine && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => nav(`/projects/${id}/lines/new`)}
                >
                  Add job
                </Button>
              )}
              {isAdmin &&
                (project.status !== 'ARCHIVED' ? (
                  <Button
                    color="warning"
                    variant="outlined"
                    size="small"
                    disabled={archiveM.isPending}
                    onClick={() => archiveM.mutate('ARCHIVED')}
                  >
                    Archive project
                  </Button>
                ) : (
                  <Button
                    color="primary"
                    variant="outlined"
                    size="small"
                    disabled={archiveM.isPending}
                    onClick={() => archiveM.mutate('ACTIVE')}
                  >
                    Restore project
                  </Button>
                ))}
            </Box>
          )}

          <Paper variant="outlined" sx={{ mb: 3 }}>
            <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
              <Table size="small" sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Drawing</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Stage</TableCell>
                    <TableCell align="right">Ver</TableCell>
                    <TableCell align="right">Workspace</TableCell>
                    <TableCell align="right">Workflow</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {project.lineItems.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.drawingNumber ?? '—'}</TableCell>
                      <TableCell>{row.description ?? '—'}</TableCell>
                      <TableCell>{STAGE_LABEL[row.currentStage]}</TableCell>
                      <TableCell align="right">{row.version}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          component={RouterLink}
                          to={`/projects/${id}/lines/${row.id}`}
                        >
                          Open
                        </Button>
                      </TableCell>
                      <TableCell align="right">
                        {getNextStage(row.currentStage) && (
                          <Button
                            size="small"
                            onClick={() => {
                              setHandoverOpen(row);
                              const n = getNextStage(row.currentStage);
                              if (n) setTargetStage(n);
                            }}
                          >
                            Handover
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="small"
                            onClick={() => {
                              setOverrideOpen(row);
                              setTargetStage(row.currentStage);
                              setOverrideReason('');
                            }}
                          >
                            Override stage
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Open a job&apos;s workspace to see <strong>Recent activity</strong> (who saved data and
            uploads). The API <code>/line-items/:id/audit</code> exposes the same records.
          </Typography>
        </>
      )}

      <Dialog
        open={!!handoverOpen}
        onClose={() => setHandoverOpen(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Handover (next step only)</DialogTitle>
        <DialogContent>
          {handoverM.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiErrorLines(handoverM.error).map((line, i) => (
                <Typography key={i} variant="body2" component="div">
                  {line}
                </Typography>
              ))}
            </Alert>
          )}
          {handoverGateQ.data && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              From <strong>{STAGE_LABEL[handoverGateQ.data.currentStage ?? handoverOpen!.currentStage]}</strong>
              {' → '}
              <strong>
                {handoverGateQ.data.nextStage
                  ? STAGE_LABEL[handoverGateQ.data.nextStage]
                  : '—'}
              </strong>
            </Typography>
          )}
          {handoverGateQ.isLoading && (
            <Typography variant="body2" color="text.secondary">
              Checking mandatory data…
            </Typography>
          )}
          {handoverGateQ.data && !handoverGateQ.data.ready && (
            <Alert severity="warning" sx={{ mt: 1, mb: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Complete before handover:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {handoverGateQ.data.errors.map((e, i) => (
                  <Typography key={`${i}-${e.slice(0, 40)}`} component="li" variant="body2">
                    {e}
                  </Typography>
                ))}
              </Box>
            </Alert>
          )}
          <Box sx={{ mt: 2 }}>
            <Button
              component={RouterLink}
              to={handoverOpen ? `/projects/${id}/lines/${handoverOpen.id}` : '#'}
              variant="outlined"
              fullWidth
              onClick={() => setHandoverOpen(null)}
            >
              Open job workspace — add travel, man-hours, attachments
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHandoverOpen(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              !handoverOpen ||
              handoverM.isPending ||
              !handoverGateQ.data?.ready ||
              !handoverGateQ.data?.nextStage
            }
            onClick={() => {
              if (!handoverOpen || !handoverGateQ.data?.nextStage) return;
              handoverM.mutate({
                lineId: handoverOpen.id,
                targetStage: handoverGateQ.data.nextStage,
              });
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!overrideOpen}
        onClose={() => setOverrideOpen(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Override stage (admin)</DialogTitle>
        <DialogContent>
          {overrideM.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed — version conflict or not permitted
            </Alert>
          )}
          <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Target stage</InputLabel>
            <Select
              label="Target stage"
              value={targetStage}
              onChange={(e) =>
                setTargetStage(e.target.value as WorkflowStage)
              }
            >
              {ALL_STAGES.map((s) => (
                <MenuItem key={s} value={s}>
                  {STAGE_LABEL[s]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Reason"
            fullWidth
            required
            multiline
            minRows={2}
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideOpen(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              !overrideOpen ||
              overrideReason.trim().length < 3 ||
              overrideM.isPending
            }
            onClick={() => {
              if (!overrideOpen) return;
              overrideM.mutate({
                lineId: overrideOpen.id,
                targetStage,
                reason: overrideReason.trim(),
                version: overrideOpen.version,
              });
            }}
          >
            Move stage
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
