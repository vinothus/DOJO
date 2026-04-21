import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SaveIcon from '@mui/icons-material/Save';
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
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  visibleWorkspaceTabs,
  type WorkspaceTabKey,
  type WorkspaceSettingsV1,
} from '../settings/workspaceTypes';
import { ALL_STAGES, STAGE_LABEL, type WorkflowStage } from '../types';
import {
  canAddBom,
  canEditLineHeader,
  canEditWorkflowStage,
} from '../utils/workflowRoles';

const VEHICLE_TYPE_OPTIONS = ['Pickup', 'Cargo', 'Full truck', 'Trailer'] as const;

const TAB_LABEL: Record<WorkspaceTabKey, string> = {
  lineDetails: 'Job details',
  manHours: 'Man hours',
  travel: 'Travel',
  bom: 'BOM',
  attachments: 'Attachments',
  coordination: 'Co-ordination',
  technical: 'Technical / RFQ',
};

type TravelRow = {
  id: string;
  stage: WorkflowStage;
  workDate: string | null;
  vehicleType: string | null;
  tripMode: string | null;
  travelHours: unknown;
  oneWayKm: unknown;
  roundTripKm: unknown;
  tripLabel: string | null;
};

type MHRow = {
  id: string;
  stage: WorkflowStage;
  workDate: string | null;
  idNumber: string | null;
  category: string | null;
  employeeName: string | null;
  normalHours: unknown;
  otHours: unknown;
  totalHours: unknown;
  jobStatus: string | null;
  jobDescription: string | null;
  approvalStatus: string | null;
};

type BomRow = {
  id: string;
  description: string | null;
  qty: unknown;
  materialSpec: string | null;
};

type AttRow = {
  id: string;
  stage: WorkflowStage;
  fileName: string;
  mime?: string | null;
  sizeBytes?: number;
  uploadedById?: string | null;
  createdAt?: string;
};

function formatBytes(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function canManageAttachment(
  userSub: string | undefined,
  att: AttRow,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (!userSub || att.uploadedById == null) return false;
  return att.uploadedById === userSub;
}

type LineDetail = {
  id: string;
  projectId: string;
  version: number;
  currentStage: WorkflowStage;
  inputDrawingNumber: string | null;
  drawingNumber: string | null;
  sheetNo: string | null;
  revNo: string | null;
  clampType: string | null;
  material: string | null;
  description: string | null;
  qty: unknown;
  unitWeight: unknown;
  totalWeight: unknown;
  measurementDate: string | null;
  targetDate: string | null;
  invoiceAmountSar: unknown;
  coordDesignRequestedAt?: string | null;
  coordEngineeringSubmittedAt?: string | null;
  coordApprovalStatus?: string | null;
  coordDescription?: string | null;
  project: {
    id: string;
    projectId: string;
    projectName: string | null;
    client: string | null;
    plant: string | null;
  };
  manHours: MHRow[];
  travelRows: TravelRow[];
  bomLines: BomRow[];
  attachments: AttRow[];
  technicalDetails?: Record<string, unknown> | null;
};

const TECH_LABELS: { key: string; label: string }[] = [
  { key: 'slNo', label: 'SL No#' },
  { key: 'location', label: 'Location' },
  { key: 'wbs', label: 'WBS' },
  { key: 'lineStatus', label: 'Status' },
  { key: 'designRemarks', label: 'Design remarks' },
  { key: 'designTemp', label: 'Design temp' },
  { key: 'operatingTemp', label: 'Operating temp' },
  { key: 'designPressure', label: 'Design pressure' },
  { key: 'operatingPressure', label: 'Operating pressure' },
  { key: 'carrier', label: 'Carrier' },
  { key: 'lineEquipment', label: 'Line# / EQP#' },
  { key: 'sealant', label: 'Sealant' },
  { key: 'designReceivedDate', label: 'Design received' },
  { key: 'designSubmittedDate', label: 'Design submitted' },
  { key: 'designApprovedDate', label: 'Design approved' },
  { key: 'priority', label: 'Priority' },
  { key: 'fabRequestNo', label: 'Fab req#' },
  { key: 'fabStartDate', label: 'Fab start' },
  { key: 'fabTargetDate', label: 'Fab target' },
  { key: 'fabLeadName', label: 'Fab lead' },
  { key: 'cutting', label: 'Cutting' },
  { key: 'machine', label: 'Machine' },
  { key: 'fitUp', label: 'Fit up' },
  { key: 'welding', label: 'Welding' },
  { key: 'finalMachining', label: 'Final machining' },
  { key: 'qaQc', label: 'QA/QC' },
  { key: 'qcCompleteDate', label: 'QC complete' },
];

function normalizeTechnicalDetails(
  raw: unknown,
): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

function isoDate(d: string | null | undefined): string {
  if (!d) return '';
  return d.slice(0, 10);
}

type AuditEntry = {
  id: string;
  action: string;
  createdAt: string;
  payload: unknown;
  user: { id: string; email: string; name: string } | null;
};

const ACTION_LABEL: Record<string, string> = {
  LINE_CREATE: 'Job created',
  LINE_SAVE: 'Saved job / technical / coordination data',
  MAN_HOUR_ADD: 'Added man-hour row',
  MAN_HOUR_DELETE: 'Deleted man-hour row',
  TRAVEL_ADD: 'Added travel row',
  TRAVEL_DELETE: 'Deleted travel row',
  BOM_ADD: 'Added BOM row',
  BOM_DELETE: 'Deleted BOM row',
  ATTACHMENT_UPLOAD: 'Uploaded attachment',
  ATTACHMENT_REPLACE: 'Replaced attachment file',
  ATTACHMENT_META_UPDATE: 'Updated attachment (stage / metadata)',
  ATTACHMENT_DELETE: 'Deleted attachment',
  HANDOVER: 'Workflow handover',
  STAGE_OVERRIDE: 'Stage override (admin)',
};

function auditActionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action.replace(/_/g, ' ');
}

export function LineItemWorkspacePage() {
  const { projectId, lineId } = useParams<{ projectId: string; lineId: string }>();
  const qc = useQueryClient();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes('admin');

  const [tabKey, setTabKey] = useState<WorkspaceTabKey>('lineDetails');

  const [mhForm, setMhForm] = useState({
    stage: 'INPUT_SITE_MEASUREMENT' as WorkflowStage,
    workDate: '',
    idNumber: '',
    category: '',
    employeeName: '',
    normalHours: '',
    otHours: '',
    totalHours: '',
    jobStatus: '',
    approvalStatus: '',
    jobDescription: '',
  });
  const [tvForm, setTvForm] = useState({
    stage: 'INPUT_SITE_MEASUREMENT' as WorkflowStage,
    workDate: '',
    vehicleType: '',
    tripMode: '' as '' | 'ONE_WAY' | 'ROUND_TRIP',
    travelHours: '',
    oneWayKm: '',
    roundTripKm: '',
  });
  const [bomForm, setBomForm] = useState({
    description: '',
    qty: '1',
    materialSpec: '',
  });
  const [attStage, setAttStage] = useState<WorkflowStage>('INPUT_SITE_MEASUREMENT');
  const [attFile, setAttFile] = useState<File | null>(null);
  const [editAtt, setEditAtt] = useState<AttRow | null>(null);
  const [editAttStage, setEditAttStage] = useState<WorkflowStage>('INPUT_SITE_MEASUREMENT');
  const [editAttFile, setEditAttFile] = useState<File | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['line-item', lineId],
    queryFn: async () => {
      const res = await api.get<LineDetail>(`/line-items/${lineId!}`);
      return res.data;
    },
    enabled: !!lineId,
  });

  const wsQ = useQuery({
    queryKey: ['workspace-settings'],
    queryFn: async () => {
      const res = await api.get<WorkspaceSettingsV1>('/workspace-settings');
      return res.data;
    },
  });
  const workspace = wsQ.data;

  const auditQ = useQuery({
    queryKey: ['line-audit', lineId],
    queryFn: async () => {
      const res = await api.get<AuditEntry[]>(`/line-items/${lineId!}/audit`);
      return res.data;
    },
    enabled: !!lineId,
  });

  const [form, setForm] = useState<Partial<LineDetail> | null>(null);

  const line = q.data;

  useEffect(() => {
    if (!q.data) return;
    const d = q.data;
    setForm({
      ...d,
      measurementDate: d.measurementDate ?? undefined,
      targetDate: d.targetDate ?? undefined,
      technicalDetails: normalizeTechnicalDetails(d.technicalDetails),
    });
    setMhForm((f) => ({ ...f, stage: d.currentStage }));
    setTvForm((f) => ({ ...f, stage: d.currentStage }));
    setAttStage(d.currentStage);
  }, [q.data?.id, q.data?.version]);

  const visibleTabs = useMemo(
    () =>
      line
        ? visibleWorkspaceTabs(workspace, line.currentStage)
        : (['lineDetails'] as WorkspaceTabKey[]),
    [line, workspace],
  );

  useEffect(() => {
    if (!visibleTabs.length) return;
    setTabKey((prev) => (visibleTabs.includes(prev) ? prev : visibleTabs[0]!));
  }, [line?.currentStage, workspace, visibleTabs]);

  const patchM = useMutation({
    mutationFn: async () => {
      if (!line || !form) return;
      await api.patch(`/line-items/${line.id}`, {
        inputDrawingNumber: form.inputDrawingNumber,
        drawingNumber: form.drawingNumber,
        sheetNo: form.sheetNo,
        revNo: form.revNo,
        clampType: form.clampType,
        material: form.material,
        description: form.description,
        qty: form.qty != null ? Number(form.qty) : undefined,
        unitWeight: form.unitWeight != null ? Number(form.unitWeight) : undefined,
        totalWeight: form.totalWeight != null ? Number(form.totalWeight) : undefined,
        measurementDate: form.measurementDate || undefined,
        targetDate: form.targetDate || undefined,
        invoiceAmountSar:
          form.invoiceAmountSar != null ? Number(form.invoiceAmountSar) : undefined,
        technicalDetails:
          form.technicalDetails && Object.keys(form.technicalDetails).length
            ? form.technicalDetails
            : undefined,
        coordDesignRequestedAt: form.coordDesignRequestedAt || undefined,
        coordEngineeringSubmittedAt: form.coordEngineeringSubmittedAt || undefined,
        coordApprovalStatus: form.coordApprovalStatus || undefined,
        coordDescription: form.coordDescription || undefined,
        version: line.version,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['line-item', lineId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['line-audit', lineId] });
    },
  });

  const addMh = useMutation({
    mutationFn: async () => {
      await api.post(`/line-items/${lineId}/man-hours`, {
        stage: mhForm.stage,
        workDate: mhForm.workDate || undefined,
        idNumber: mhForm.idNumber || undefined,
        category: mhForm.category || undefined,
        employeeName: mhForm.employeeName || undefined,
        normalHours: mhForm.normalHours ? Number(mhForm.normalHours) : undefined,
        otHours: mhForm.otHours ? Number(mhForm.otHours) : undefined,
        totalHours: mhForm.totalHours ? Number(mhForm.totalHours) : undefined,
        jobStatus: mhForm.jobStatus || undefined,
        approvalStatus: mhForm.approvalStatus || undefined,
        jobDescription: mhForm.jobDescription || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['line-item', lineId] });
      qc.invalidateQueries({ queryKey: ['handover-gate', lineId] });
      qc.invalidateQueries({ queryKey: ['line-audit', lineId] });
    },
  });

  const delMh = useMutation({
    mutationFn: async (entryId: string) => {
      await api.delete(`/line-items/${lineId}/man-hours/${entryId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['line-item', lineId] });
      qc.invalidateQueries({ queryKey: ['line-audit', lineId] });
    },
  });

  const addTv = useMutation({
    mutationFn: async () => {
      await api.post(`/line-items/${lineId}/travel`, {
        stage: tvForm.stage,
        workDate: tvForm.workDate || undefined,
        vehicleType: tvForm.vehicleType || undefined,
        tripMode: tvForm.tripMode || undefined,
        travelHours: tvForm.travelHours ? Number(tvForm.travelHours) : undefined,
        oneWayKm: tvForm.oneWayKm ? Number(tvForm.oneWayKm) : undefined,
        roundTripKm: tvForm.roundTripKm ? Number(tvForm.roundTripKm) : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['line-item', lineId] });
      qc.invalidateQueries({ queryKey: ['handover-gate', lineId] });
      qc.invalidateQueries({ queryKey: ['line-audit', lineId] });
    },
  });

  const delTv = useMutation({
    mutationFn: async (tid: string) => {
      await api.delete(`/line-items/${lineId}/travel/${tid}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['line-item', lineId] });
      qc.invalidateQueries({ queryKey: ['line-audit', lineId] });
    },
  });

  const addBom = useMutation({
    mutationFn: async () => {
      await api.post(`/line-items/${lineId}/bom`, {
        description: bomForm.description,
        qty: bomForm.qty ? Number(bomForm.qty) : undefined,
        materialSpec: bomForm.materialSpec || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['line-item', lineId] });
      qc.invalidateQueries({ queryKey: ['line-audit', lineId] });
    },
  });

  const delBom = useMutation({
    mutationFn: async (bid: string) => {
      await api.delete(`/line-items/${lineId}/bom/${bid}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['line-item', lineId] });
      qc.invalidateQueries({ queryKey: ['line-audit', lineId] });
    },
  });

  const addAtt = useMutation({
    mutationFn: async () => {
      if (!attFile) throw new Error('Choose a file');
      const fd = new FormData();
      fd.append('file', attFile);
      fd.append('stage', attStage);
      await api.post(`/line-items/${lineId}/attachments`, fd);
    },
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['line-item', lineId] });
      qc.invalidateQueries({ queryKey: ['handover-gate', lineId] });
      qc.invalidateQueries({ queryKey: ['line-audit', lineId] });
      setAttFile(null);
    },
  });

  const patchAtt = useMutation({
    mutationFn: async ({
      id,
      stage,
      file,
    }: {
      id: string;
      stage: WorkflowStage;
      file?: File | null;
    }) => {
      const fd = new FormData();
      fd.append('stage', stage);
      if (file) fd.append('file', file);
      await api.patch(`/line-items/${lineId}/attachments/${id}`, fd);
    },
    onSuccess: async () => {
      setEditAtt(null);
      setEditAttFile(null);
      await qc.refetchQueries({ queryKey: ['line-item', lineId] });
      qc.invalidateQueries({ queryKey: ['handover-gate', lineId] });
      qc.invalidateQueries({ queryKey: ['line-audit', lineId] });
    },
  });

  const delAtt = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/line-items/${lineId}/attachments/${id}`);
    },
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['line-item', lineId] });
      qc.invalidateQueries({ queryKey: ['handover-gate', lineId] });
      qc.invalidateQueries({ queryKey: ['line-audit', lineId] });
    },
  });

  /** Opens file in a new tab (PDFs render in the browser; no download prompt). */
  const viewAtt = async (a: AttRow) => {
    setViewingId(a.id);
    try {
      const res = await api.get(
        `/line-items/${lineId}/attachments/${a.id}/file?inline=1`,
        { responseType: 'blob' },
      );
      const mime = a.mime ?? res.headers['content-type'] ?? 'application/octet-stream';
      const blob =
        res.data instanceof Blob ? res.data : new Blob([res.data], { type: String(mime) });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } finally {
      setViewingId(null);
    }
  };

  if (!projectId || !lineId) return null;
  if (q.isLoading || !line || !form) {
    return (
      <Container sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
        <Typography>Loading job…</Typography>
      </Container>
    );
  }

  const headerOk = canEditLineHeader(roles, line.currentStage);
  const techOk = canEditWorkflowStage(roles, line.currentStage) || isAdmin;
  const projectLabel = line.project.projectName || line.project.projectId;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
      <Stack spacing={2}>
        <Box>
          <Button component={RouterLink} to={`/projects/${projectId}`} sx={{ mb: 1 }}>
            ← Back to project
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Job workspace
          </Typography>
          <Typography color="text.secondary">
            {projectLabel} · {line.project.client ?? '—'} — {STAGE_LABEL[line.currentStage]}
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            background: 'linear-gradient(145deg, #fff 0%, #f5f9ff 100%)',
          }}
        >
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
            Drawing {line.drawingNumber ?? '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Use the tabs to enter site measurement fields, man-hours, travel, BOM (engineering), and
            attachments. Saving updates the same data the handover gate checks. Upload PDFs or other
            documents in Attachments (each stage you can edit has its own uploads). Changes are
            recorded in the activity log below with your account name.
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Recent activity
          </Typography>
          {auditQ.isLoading && (
            <Typography variant="body2" color="text.secondary">
              Loading…
            </Typography>
          )}
          {!auditQ.isLoading && (!auditQ.data || auditQ.data.length === 0) && (
            <Typography variant="body2" color="text.secondary">
              No logged actions yet — saves and uploads appear here.
            </Typography>
          )}
          {auditQ.data && auditQ.data.length > 0 && (
            <TableContainer sx={{ maxHeight: 220 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>When</TableCell>
                    <TableCell>Who</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditQ.data.slice(0, 40).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {new Date(a.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {a.user?.name ?? a.user?.email ?? '—'}
                      </TableCell>
                      <TableCell>{auditActionLabel(a.action)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        <Tabs
          value={tabKey}
          onChange={(_, v) => setTabKey(v as WorkspaceTabKey)}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          {visibleTabs.map((k) => (
            <Tab key={k} label={TAB_LABEL[k]} value={k} />
          ))}
        </Tabs>

        {tabKey === 'lineDetails' && (
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            {!headerOk && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Job header can be edited when the job is in your department stage (or as admin).
                Current stage: {STAGE_LABEL[line.currentStage]}.
              </Alert>
            )}
            <Stack spacing={2} useFlexGap>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Input drawing #"
                  fullWidth
                  value={form.inputDrawingNumber ?? ''}
                  onChange={(e) => setForm({ ...form, inputDrawingNumber: e.target.value })}
                  disabled={!headerOk}
                />
                <TextField
                  label="Drawing #"
                  fullWidth
                  value={form.drawingNumber ?? ''}
                  onChange={(e) => setForm({ ...form, drawingNumber: e.target.value })}
                  disabled={!headerOk}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Sheet No"
                  value={form.sheetNo ?? ''}
                  onChange={(e) => setForm({ ...form, sheetNo: e.target.value })}
                  disabled={!headerOk}
                />
                <TextField
                  label="Rev"
                  value={form.revNo ?? ''}
                  onChange={(e) => setForm({ ...form, revNo: e.target.value })}
                  disabled={!headerOk}
                />
                <TextField
                  label="Clamp type"
                  value={form.clampType ?? ''}
                  onChange={(e) => setForm({ ...form, clampType: e.target.value })}
                  disabled={!headerOk}
                />
              </Stack>
              <TextField
                label="Material"
                fullWidth
                value={form.material ?? ''}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
                disabled={!headerOk}
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                minRows={2}
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                disabled={!headerOk}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Qty"
                  type="number"
                  value={form.qty === null || form.qty === undefined ? '' : String(form.qty)}
                  onChange={(e) => setForm({ ...form, qty: e.target.value })}
                  disabled={!headerOk}
                />
                <TextField
                  label="Measurement date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={isoDate(form.measurementDate as string)}
                  onChange={(e) =>
                    setForm({ ...form, measurementDate: e.target.value || undefined })
                  }
                  disabled={!headerOk}
                />
                <TextField
                  label="Target date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={isoDate(form.targetDate as string)}
                  onChange={(e) =>
                    setForm({ ...form, targetDate: e.target.value || undefined })
                  }
                  disabled={!headerOk}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Unit weight"
                  type="number"
                  value={
                    form.unitWeight === null || form.unitWeight === undefined
                      ? ''
                      : String(form.unitWeight)
                  }
                  onChange={(e) => setForm({ ...form, unitWeight: e.target.value })}
                  disabled={!headerOk}
                />
                <TextField
                  label="Total weight"
                  type="number"
                  value={
                    form.totalWeight === null || form.totalWeight === undefined
                      ? ''
                      : String(form.totalWeight)
                  }
                  onChange={(e) => setForm({ ...form, totalWeight: e.target.value })}
                  disabled={!headerOk}
                />
                <TextField
                  label="Invoice SAR"
                  type="number"
                  value={
                    form.invoiceAmountSar === null || form.invoiceAmountSar === undefined
                      ? ''
                      : String(form.invoiceAmountSar)
                  }
                  onChange={(e) => setForm({ ...form, invoiceAmountSar: e.target.value })}
                  disabled={!headerOk}
                />
              </Stack>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={!headerOk || patchM.isPending}
                onClick={() => patchM.mutate()}
              >
                Save job
              </Button>
            </Stack>
          </Paper>
        )}

        {tabKey === 'manHours' && (
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Add man-hours
            </Typography>
            <Stack spacing={2} sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Stage for this row</InputLabel>
                <Select
                  label="Stage for this row"
                  value={mhForm.stage}
                  onChange={(e) =>
                    setMhForm({ ...mhForm, stage: e.target.value as WorkflowStage })
                  }
                >
                  {ALL_STAGES.map((s) => (
                    <MenuItem key={s} value={s} disabled={!canEditWorkflowStage(roles, s) && !isAdmin}>
                      {STAGE_LABEL[s]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Work date"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={mhForm.workDate}
                onChange={(e) => setMhForm({ ...mhForm, workDate: e.target.value })}
                disabled={!canEditWorkflowStage(roles, mhForm.stage) && !isAdmin}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Category"
                  value={mhForm.category}
                  onChange={(e) => setMhForm({ ...mhForm, category: e.target.value })}
                  disabled={!canEditWorkflowStage(roles, mhForm.stage) && !isAdmin}
                />
                <TextField
                  label="Employee name"
                  value={mhForm.employeeName}
                  onChange={(e) => setMhForm({ ...mhForm, employeeName: e.target.value })}
                  disabled={!canEditWorkflowStage(roles, mhForm.stage) && !isAdmin}
                />
                <TextField
                  label="ID no."
                  value={mhForm.idNumber}
                  onChange={(e) => setMhForm({ ...mhForm, idNumber: e.target.value })}
                  disabled={!canEditWorkflowStage(roles, mhForm.stage) && !isAdmin}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Normal hours"
                  type="number"
                  value={mhForm.normalHours}
                  onChange={(e) => setMhForm({ ...mhForm, normalHours: e.target.value })}
                  disabled={!canEditWorkflowStage(roles, mhForm.stage) && !isAdmin}
                />
                <TextField
                  label="Overtime hours"
                  type="number"
                  value={mhForm.otHours}
                  onChange={(e) => setMhForm({ ...mhForm, otHours: e.target.value })}
                  disabled={!canEditWorkflowStage(roles, mhForm.stage) && !isAdmin}
                />
                <TextField
                  label="Total hours"
                  type="number"
                  value={mhForm.totalHours}
                  onChange={(e) => setMhForm({ ...mhForm, totalHours: e.target.value })}
                  disabled={!canEditWorkflowStage(roles, mhForm.stage) && !isAdmin}
                />
              </Stack>
              <TextField
                label="Job status"
                value={mhForm.jobStatus}
                onChange={(e) => setMhForm({ ...mhForm, jobStatus: e.target.value })}
                disabled={!canEditWorkflowStage(roles, mhForm.stage) && !isAdmin}
              />
              <TextField
                label="Approval status (e.g. engineering)"
                value={mhForm.approvalStatus}
                onChange={(e) => setMhForm({ ...mhForm, approvalStatus: e.target.value })}
                disabled={!canEditWorkflowStage(roles, mhForm.stage) && !isAdmin}
              />
              <TextField
                label="Job description"
                value={mhForm.jobDescription}
                onChange={(e) => setMhForm({ ...mhForm, jobDescription: e.target.value })}
                disabled={!canEditWorkflowStage(roles, mhForm.stage) && !isAdmin}
              />
              <Button
                variant="contained"
                disabled={
                  !canEditWorkflowStage(roles, mhForm.stage) && !isAdmin ? true : addMh.isPending
                }
                onClick={() => addMh.mutate()}
              >
                Add man-hour row
              </Button>
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Stage</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Normal</TableCell>
                  <TableCell>OT</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Job status</TableCell>
                  <TableCell align="right"> </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {line.manHours.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{STAGE_LABEL[r.stage]}</TableCell>
                    <TableCell>{isoDate(r.workDate as string)}</TableCell>
                    <TableCell>{r.category ?? '—'}</TableCell>
                    <TableCell>{r.idNumber ?? '—'}</TableCell>
                    <TableCell>{r.employeeName ?? '—'}</TableCell>
                    <TableCell>{String(r.normalHours ?? '')}</TableCell>
                    <TableCell>{String(r.otHours ?? '')}</TableCell>
                    <TableCell>{String(r.totalHours ?? '')}</TableCell>
                    <TableCell>{r.jobStatus ?? '—'}</TableCell>
                    <TableCell align="right">
                      {(canEditWorkflowStage(roles, r.stage) || isAdmin) && (
                        <IconButton size="small" onClick={() => delMh.mutate(r.id)} aria-label="delete">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {tabKey === 'travel' && (
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Travel & trips
            </Typography>
            <Stack spacing={2} sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Stage</InputLabel>
                <Select
                  label="Stage"
                  value={tvForm.stage}
                  onChange={(e) =>
                    setTvForm({ ...tvForm, stage: e.target.value as WorkflowStage })
                  }
                >
                  {ALL_STAGES.map((s) => (
                    <MenuItem key={s} value={s} disabled={!canEditWorkflowStage(roles, s) && !isAdmin}>
                      {STAGE_LABEL[s]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Trip date"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={tvForm.workDate}
                onChange={(e) => setTvForm({ ...tvForm, workDate: e.target.value })}
                disabled={!canEditWorkflowStage(roles, tvForm.stage) && !isAdmin}
              />
              <FormControl fullWidth>
                <InputLabel>Vehicle type</InputLabel>
                <Select
                  label="Vehicle type"
                  value={tvForm.vehicleType || ''}
                  onChange={(e) =>
                    setTvForm({ ...tvForm, vehicleType: String(e.target.value) })
                  }
                  disabled={!canEditWorkflowStage(roles, tvForm.stage) && !isAdmin}
                >
                  <MenuItem value="">
                    <em>Select…</em>
                  </MenuItem>
                  {VEHICLE_TYPE_OPTIONS.map((v) => (
                    <MenuItem key={v} value={v}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Trip mode</InputLabel>
                  <Select
                    label="Trip mode"
                    value={tvForm.tripMode || ''}
                    onChange={(e) =>
                      setTvForm({
                        ...tvForm,
                        tripMode: (e.target.value || '') as '' | 'ONE_WAY' | 'ROUND_TRIP',
                      })
                    }
                    disabled={!canEditWorkflowStage(roles, tvForm.stage) && !isAdmin}
                  >
                    <MenuItem value="">
                      <em>Optional</em>
                    </MenuItem>
                    <MenuItem value="ONE_WAY">One-way</MenuItem>
                    <MenuItem value="ROUND_TRIP">Round trip</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Travel hours"
                  type="number"
                  value={tvForm.travelHours}
                  onChange={(e) => setTvForm({ ...tvForm, travelHours: e.target.value })}
                  disabled={!canEditWorkflowStage(roles, tvForm.stage) && !isAdmin}
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="One way (km)"
                  type="number"
                  value={tvForm.oneWayKm}
                  onChange={(e) => setTvForm({ ...tvForm, oneWayKm: e.target.value })}
                  disabled={!canEditWorkflowStage(roles, tvForm.stage) && !isAdmin}
                />
                <TextField
                  label="Round trip (km)"
                  type="number"
                  value={tvForm.roundTripKm}
                  onChange={(e) => setTvForm({ ...tvForm, roundTripKm: e.target.value })}
                  disabled={!canEditWorkflowStage(roles, tvForm.stage) && !isAdmin}
                />
              </Stack>
              <Button
                variant="contained"
                disabled={
                  !canEditWorkflowStage(roles, tvForm.stage) && !isAdmin ? true : addTv.isPending
                }
                onClick={() => addTv.mutate()}
              >
                Add travel row
              </Button>
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Stage</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Mode</TableCell>
                  <TableCell>Hrs</TableCell>
                  <TableCell>Km</TableCell>
                  <TableCell align="right"> </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {line.travelRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{STAGE_LABEL[r.stage]}</TableCell>
                    <TableCell>{isoDate(r.workDate as string)}</TableCell>
                    <TableCell>{r.vehicleType ?? '—'}</TableCell>
                    <TableCell>
                      {r.tripMode === 'ONE_WAY'
                        ? 'One-way'
                        : r.tripMode === 'ROUND_TRIP'
                          ? 'Round trip'
                          : '—'}
                    </TableCell>
                    <TableCell>
                      {r.travelHours != null ? String(r.travelHours) : '—'}
                    </TableCell>
                    <TableCell>
                      {r.oneWayKm ? `1w:${Number(r.oneWayKm)}` : ''}
                      {r.roundTripKm ? ` rt:${Number(r.roundTripKm)}` : ''}
                    </TableCell>
                    <TableCell align="right">
                      {(canEditWorkflowStage(roles, r.stage) || isAdmin) && (
                        <IconButton size="small" onClick={() => delTv.mutate(r.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {tabKey === 'bom' && (
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            {!canAddBom(roles) && !isAdmin && (
              <Alert severity="info" sx={{ mb: 2 }}>
                BOM rows are added by engineering (or admin).
              </Alert>
            )}
            <Stack spacing={2} sx={{ mb: 3 }}>
              <TextField
                label="Description"
                value={bomForm.description}
                onChange={(e) => setBomForm({ ...bomForm, description: e.target.value })}
                disabled={!canAddBom(roles)}
              />
              <TextField
                label="Qty"
                type="number"
                value={bomForm.qty}
                onChange={(e) => setBomForm({ ...bomForm, qty: e.target.value })}
                disabled={!canAddBom(roles)}
              />
              <TextField
                label="Material spec"
                value={bomForm.materialSpec}
                onChange={(e) => setBomForm({ ...bomForm, materialSpec: e.target.value })}
                disabled={!canAddBom(roles)}
              />
              <Button
                variant="contained"
                disabled={!canAddBom(roles) || addBom.isPending}
                onClick={() => addBom.mutate()}
              >
                Add BOM row
              </Button>
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Spec</TableCell>
                  <TableCell align="right"> </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {line.bomLines.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.description ?? '—'}</TableCell>
                    <TableCell>{String(b.qty ?? '')}</TableCell>
                    <TableCell>{b.materialSpec ?? '—'}</TableCell>
                    <TableCell align="right">
                      {(canAddBom(roles) || isAdmin) && (
                        <IconButton size="small" onClick={() => delBom.mutate(b.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {tabKey === 'attachments' && (
          <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Attachments
            </Typography>
            {(addAtt.isError || patchAtt.isError || delAtt.isError) && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {patchAtt.isError
                  ? axios.isAxiosError(patchAtt.error) && patchAtt.error.response?.data
                    ? String(
                        (patchAtt.error.response.data as { message?: string }).message ??
                          patchAtt.error.message,
                      )
                    : 'Update failed'
                  : delAtt.isError
                    ? axios.isAxiosError(delAtt.error) && delAtt.error.response?.data
                      ? String(
                          (delAtt.error.response.data as { message?: string }).message ??
                            delAtt.error.message,
                        )
                      : 'Delete failed'
                    : axios.isAxiosError(addAtt.error) && addAtt.error.response?.data
                      ? String(
                          (addAtt.error.response.data as { message?: string }).message ??
                            addAtt.error.message,
                        )
                      : addAtt.error instanceof Error
                        ? addAtt.error.message
                        : 'Upload failed'}
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              View opens files in a new tab (PDFs show in the browser). Edit lets you change stage and
              optionally replace the file. Only the uploader (or admins) can view, edit, or delete.
            </Typography>
            <Stack spacing={2} sx={{ maxWidth: 480 }}>
              <FormControl fullWidth>
                <InputLabel>Stage</InputLabel>
                <Select
                  label="Stage"
                  value={attStage}
                  onChange={(e) => setAttStage(e.target.value as WorkflowStage)}
                >
                  {ALL_STAGES.map((s) => (
                    <MenuItem key={s} value={s} disabled={!canEditWorkflowStage(roles, s) && !isAdmin}>
                      {STAGE_LABEL[s]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="outlined" component="label">
                Choose file
                <input
                  type="file"
                  hidden
                  accept=".pdf,application/pdf,image/*"
                  onChange={(e) => setAttFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              <Typography variant="body2" color="text.secondary">
                {attFile?.name ?? 'No file selected'}
              </Typography>
              <Button
                variant="contained"
                disabled={
                  (!canEditWorkflowStage(roles, attStage) && !isAdmin) || !attFile || addAtt.isPending
                }
                onClick={() => addAtt.mutate()}
              >
                Upload
              </Button>
            </Stack>
            <TableContainer sx={{ mt: 2, overflowX: 'auto', maxWidth: '100%' }}>
              <Table size="small" sx={{ minWidth: 360 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Stage</TableCell>
                    <TableCell>File</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(line.attachments ?? []).map((a) => {
                    const canManage = canManageAttachment(user?.sub, a, isAdmin);
                    return (
                      <TableRow key={a.id}>
                        <TableCell>{STAGE_LABEL[a.stage]}</TableCell>
                        <TableCell sx={{ wordBreak: 'break-word' }}>{a.fileName}</TableCell>
                        <TableCell>{formatBytes(a.sizeBytes)}</TableCell>
                        <TableCell align="right">
                          {canManage ? (
                            <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}>
                              <Tooltip title="View in new tab">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => viewAtt(a)}
                                    disabled={viewingId === a.id}
                                    aria-label="View"
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Edit stage or replace file">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setEditAtt(a);
                                      setEditAttStage(a.stage);
                                      setEditAttFile(null);
                                    }}
                                    aria-label="Edit attachment"
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          `Delete “${a.fileName}”? This cannot be undone.`,
                                        )
                                      ) {
                                        delAtt.mutate(a.id);
                                      }
                                    }}
                                    disabled={delAtt.isPending}
                                    aria-label="Delete"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Dialog
              open={!!editAtt}
              onClose={() => {
                if (!patchAtt.isPending) {
                  setEditAtt(null);
                  setEditAttFile(null);
                }
              }}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>Edit attachment</DialogTitle>
              <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Current file: {editAtt?.fileName}
                </Typography>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Stage</InputLabel>
                  <Select
                    label="Stage"
                    value={editAttStage}
                    onChange={(e) => setEditAttStage(e.target.value as WorkflowStage)}
                  >
                    {ALL_STAGES.map((s) => (
                      <MenuItem
                        key={s}
                        value={s}
                        disabled={!canEditWorkflowStage(roles, s) && !isAdmin}
                      >
                        {STAGE_LABEL[s]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button variant="outlined" component="label" size="small" sx={{ mb: 1 }}>
                  Replace with new file
                  <input
                    type="file"
                    hidden
                    accept=".pdf,application/pdf,image/*"
                    onChange={(e) => setEditAttFile(e.target.files?.[0] ?? null)}
                  />
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                  {editAttFile?.name ?? 'No new file selected — stage-only update'}
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => {
                    setEditAtt(null);
                    setEditAttFile(null);
                  }}
                  disabled={patchAtt.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  disabled={patchAtt.isPending || !editAtt}
                  onClick={() =>
                    editAtt &&
                    patchAtt.mutate({
                      id: editAtt.id,
                      stage: editAttStage,
                      file: editAttFile ?? undefined,
                    })
                  }
                >
                  Save
                </Button>
              </DialogActions>
            </Dialog>
          </Paper>
        )}

        {tabKey === 'coordination' && form && (
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Co-ordination (Engineering → Fabrication)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Design request date, engineering submission date, approval, and notes for handover to
              fabrication.
            </Typography>
            <Stack spacing={2} useFlexGap sx={{ maxWidth: 720 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Design requested date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={isoDate(form.coordDesignRequestedAt as string)}
                  onChange={(e) =>
                    setForm({ ...form, coordDesignRequestedAt: e.target.value || undefined })
                  }
                  disabled={!headerOk}
                  fullWidth
                />
                <TextField
                  label="Engineering submitted date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={isoDate(form.coordEngineeringSubmittedAt as string)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      coordEngineeringSubmittedAt: e.target.value || undefined,
                    })
                  }
                  disabled={!headerOk}
                  fullWidth
                />
              </Stack>
              <TextField
                label="Approval status"
                fullWidth
                value={form.coordApprovalStatus ?? ''}
                onChange={(e) =>
                  setForm({ ...form, coordApprovalStatus: e.target.value })
                }
                disabled={!headerOk}
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                minRows={3}
                value={form.coordDescription ?? ''}
                onChange={(e) =>
                  setForm({ ...form, coordDescription: e.target.value })
                }
                disabled={!headerOk}
              />
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={!headerOk || patchM.isPending}
                onClick={() => patchM.mutate()}
              >
                Save co-ordination
              </Button>
            </Stack>
          </Paper>
        )}

        {tabKey === 'technical' && form && (
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Technical / RFQ (spreadsheet fields)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Temperatures, pressures, carrier, equipment, fabrication steps, and QC dates. Saved with
              the same version as job details.
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                maxWidth: 960,
              }}
            >
              {TECH_LABELS.map(({ key, label }) => (
                <TextField
                  key={key}
                  label={label}
                  size="small"
                  fullWidth
                  value={
                    form.technicalDetails?.[key] != null
                      ? String(form.technicalDetails[key])
                      : ''
                  }
                  onChange={(e) =>
                    setForm((prev) => {
                      if (!prev) return prev;
                      const td = normalizeTechnicalDetails(prev.technicalDetails);
                      td[key] = e.target.value;
                      return { ...prev, technicalDetails: td };
                    })
                  }
                  disabled={!techOk}
                />
              ))}
            </Box>
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              startIcon={<SaveIcon />}
              disabled={!techOk || patchM.isPending}
              onClick={() => patchM.mutate()}
            >
              Save technical details
            </Button>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
