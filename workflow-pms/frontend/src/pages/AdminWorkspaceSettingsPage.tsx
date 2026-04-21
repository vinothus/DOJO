import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type {
  HandoverTransitionRule,
  ProjectHeaderHandoverKeys,
  WorkspaceSettingsV1,
} from '../settings/workspaceTypes';
import { ALL_STAGES, STAGE_LABEL, type WorkflowStage } from '../types';

const HEADER_KEYS: { key: ProjectHeaderHandoverKeys; label: string }[] = [
  { key: 'year', label: 'Year' },
  { key: 'month', label: 'Month' },
  { key: 'area', label: 'Area' },
  { key: 'client', label: 'Client' },
  { key: 'plant', label: 'Plant / unit' },
  { key: 'poNumber', label: 'PO number' },
  { key: 'bidNumber', label: 'Bid number' },
  { key: 'projectId', label: 'Project ID' },
];

const SITE_TAB_KEYS: { key: 'bom'; label: string }[] = [
  { key: 'bom', label: 'BOM tab visible at site measurement stage' },
];

const HANDOVER_KEYS = ALL_STAGES.slice(0, -1).map((from, i) => {
  const to = ALL_STAGES[i + 1]!;
  return { from, to, key: `${from}__${to}` };
});

type Tri = 'inherit' | 'yes' | 'no';

function triFor(v: boolean | undefined): Tri {
  if (v === true) return 'yes';
  if (v === false) return 'no';
  return 'inherit';
}

function updateTransition(
  draft: WorkspaceSettingsV1,
  tKey: string,
  patch: Partial<HandoverTransitionRule>,
): WorkspaceSettingsV1 {
  const prev = draft.handoverTransitions?.[tKey] ?? {};
  const next: HandoverTransitionRule = { ...prev };
  for (const k of Object.keys(patch) as (keyof HandoverTransitionRule)[]) {
    const v = patch[k];
    if (v === undefined) delete next[k];
    else (next as Record<string, unknown>)[k as string] = v as unknown;
  }
  const ht = { ...draft.handoverTransitions };
  if (Object.keys(next).length === 0) delete ht[tKey];
  else ht[tKey] = next;
  return { ...draft, handoverTransitions: ht };
}

function TriSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Tri;
  onChange: (v: Tri) => void;
}) {
  return (
    <FormControl size="small" fullWidth sx={{ minWidth: 140 }}>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as Tri)}
      >
        <MenuItem value="inherit">Default (stage)</MenuItem>
        <MenuItem value="yes">Required</MenuItem>
        <MenuItem value="no">Not required</MenuItem>
      </Select>
    </FormControl>
  );
}

export function AdminWorkspaceSettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['workspace-settings'],
    queryFn: async () => {
      const res = await api.get<WorkspaceSettingsV1>('/workspace-settings');
      return res.data;
    },
  });

  const [draft, setDraft] = useState<WorkspaceSettingsV1 | null>(null);
  useEffect(() => {
    if (q.data) setDraft(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: async (body: Partial<WorkspaceSettingsV1>) => {
      const res = await api.patch<WorkspaceSettingsV1>('/workspace-settings', body);
      return res.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['workspace-settings'], data);
      setDraft(data);
    },
  });

  if (q.isLoading || !draft) {
    return (
      <Container sx={{ py: 3 }}>
        <Typography>Loading workspace settings…</Typography>
      </Container>
    );
  }

  const stage = 'INPUT_SITE_MEASUREMENT' as WorkflowStage;

  const setBoolTri = (
    tKey: string,
    field: keyof HandoverTransitionRule,
    tri: Tri,
  ) => {
    setDraft((d) => {
      if (!d) return d;
      if (tri === 'inherit') {
        return updateTransition(d, tKey, { [field]: undefined } as Partial<HandoverTransitionRule>);
      }
      return updateTransition(d, tKey, { [field]: tri === 'yes' } as Partial<HandoverTransitionRule>);
    });
  };

  const setHeaderTri = (tKey: string, hk: ProjectHeaderHandoverKeys, tri: Tri) => {
    setDraft((d) => {
      if (!d) return d;
      const prev = d.handoverTransitions?.[tKey] ?? {};
      const ph = { ...prev.projectHeaderRequired };
      if (tri === 'inherit') delete ph[hk];
      else ph[hk] = tri === 'yes';
      const nextPh = Object.keys(ph).length ? ph : undefined;
      return updateTransition(d, tKey, { projectHeaderRequired: nextPh });
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 600 }} gutterBottom>
        Workspace settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Configure project header requirements, job workspace tabs, and per-handover gates (each
        transition can override stage defaults).
      </Typography>

      {save.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Could not save settings.
        </Alert>
      )}
      {save.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Saved.
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 2 }} variant="outlined">
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Project header required at handover
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Global baseline; each transition below can tighten or relax individual fields.
        </Typography>
        <Stack spacing={0.5}>
          {HEADER_KEYS.map(({ key, label }) => (
            <FormControlLabel
              key={key}
              control={
                <Switch
                  checked={!!draft.projectHeaderHandover[key]}
                  onChange={(_, c) =>
                    setDraft({
                      ...draft,
                      projectHeaderHandover: { ...draft.projectHeaderHandover, [key]: c },
                    })
                  }
                />
              }
              label={label}
            />
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, mb: 2 }} variant="outlined">
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Tabs — {STAGE_LABEL[stage]}
        </Typography>
        <Stack spacing={0.5}>
          {SITE_TAB_KEYS.map(({ key, label }) => (
            <FormControlLabel
              key={key}
              control={
                <Switch
                  checked={draft.stageTabs[stage]?.[key] !== false}
                  onChange={(_, c) =>
                    setDraft({
                      ...draft,
                      stageTabs: {
                        ...draft.stageTabs,
                        [stage]: { ...draft.stageTabs[stage], [key]: c },
                      },
                    })
                  }
                />
              }
              label={label}
            />
          ))}
        </Stack>
      </Paper>

      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        Per handover (transition)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Each row is one step forward (e.g. site measurement → engineering). Choose &quot;Default
        (stage)&quot; to use the stage-level rule; otherwise override for this transition only.
      </Typography>

      {HANDOVER_KEYS.map(({ from, to, key: tKey }) => {
        const rule = draft.handoverTransitions?.[tKey];
        return (
          <Accordion key={tKey} disableGutters sx={{ mb: 1, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 600 }}>
                {STAGE_LABEL[from]} → {STAGE_LABEL[to]}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                  }}
                >
                  <TriSelect
                    label="Travel"
                    value={triFor(rule?.requireTravel)}
                    onChange={(tri) => setBoolTri(tKey, 'requireTravel', tri)}
                  />
                  <TriSelect
                    label="Bill of materials"
                    value={triFor(rule?.requireBom)}
                    onChange={(tri) => setBoolTri(tKey, 'requireBom', tri)}
                  />
                  <TriSelect
                    label="Man-hours"
                    value={triFor(rule?.requireManHours)}
                    onChange={(tri) => setBoolTri(tKey, 'requireManHours', tri)}
                  />
                  <TriSelect
                    label="Eng. weights (unit/total)"
                    value={triFor(rule?.requireEngineeringWeights)}
                    onChange={(tri) => setBoolTri(tKey, 'requireEngineeringWeights', tri)}
                  />
                  {from === 'INPUT_SITE_MEASUREMENT' && (
                    <TriSelect
                      label="Site measurement line fields"
                      value={triFor(rule?.requireSiteMeasurementLineFields)}
                      onChange={(tri) => setBoolTri(tKey, 'requireSiteMeasurementLineFields', tri)}
                    />
                  )}
                  {from === 'COORDINATION' && (
                    <TriSelect
                      label="Co-ordination panel fields"
                      value={triFor(rule?.requireCoordinationFields)}
                      onChange={(tri) => setBoolTri(tKey, 'requireCoordinationFields', tri)}
                    />
                  )}
                </Box>
                <TextField
                  size="small"
                  label="Min attachments (blank = default)"
                  type="number"
                  slotProps={{ htmlInput: { min: 0 } }}
                  value={rule?.minAttachments ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setDraft((d) => {
                      if (!d) return d;
                      if (raw === '') return updateTransition(d, tKey, { minAttachments: undefined });
                      const n = parseInt(raw, 10);
                      if (Number.isNaN(n)) return d;
                      return updateTransition(d, tKey, { minAttachments: n });
                    });
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Project header overrides for this transition
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                  }}
                >
                  {HEADER_KEYS.map(({ key: hk, label }) => (
                    <TriSelect
                      key={hk}
                      label={label}
                      value={triFor(rule?.projectHeaderRequired?.[hk])}
                      onChange={(tri) => setHeaderTri(tKey, hk, tri)}
                    />
                  ))}
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}

      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Button
          variant="contained"
          disabled={save.isPending}
          onClick={() => save.mutate(draft)}
        >
          Save changes
        </Button>
        <Button
          variant="outlined"
          onClick={() => q.refetch().then(() => q.data && setDraft(q.data))}
        >
          Reload
        </Button>
      </Box>
    </Container>
  );
}
