import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { ALL_STAGES, STAGE_LABEL, type WorkflowStage } from '../types';

export function LineItemNewPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [currentStage, setCurrentStage] = useState<WorkflowStage>(
    'INPUT_SITE_MEASUREMENT',
  );

  const m = useMutation({
    mutationFn: async (body: {
      drawingNumber?: string;
      description?: string;
      currentStage: WorkflowStage;
    }) => {
      const res = await api.post(`/projects/${projectId}/line-items`, body);
      return res.data as { id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      nav(`/projects/${projectId}`);
    },
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    m.mutate({
      drawingNumber: String(fd.get('drawingNumber') ?? '') || undefined,
      description: String(fd.get('description') ?? '') || undefined,
      currentStage,
    });
  }

  if (!projectId) return null;

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Button component={RouterLink} to={`/projects/${projectId}`} sx={{ mb: 2 }}>
        ← Back
      </Button>
      <Typography variant="h5" sx={{ fontWeight: 600 }} gutterBottom>
        New job
      </Typography>
      <Paper component="form" onSubmit={onSubmit} sx={{ p: 3 }} variant="outlined">
        {m.isError && <Alert severity="error">Could not create job</Alert>}
        <TextField name="drawingNumber" label="Drawing number" fullWidth margin="normal" />
        <TextField name="description" label="Description" fullWidth margin="normal" />
        <FormControl fullWidth margin="normal">
          <InputLabel>Starting stage</InputLabel>
          <Select
            label="Starting stage"
            value={currentStage}
            onChange={(e) =>
              setCurrentStage(e.target.value as WorkflowStage)
            }
          >
            {ALL_STAGES.map((s) => (
              <MenuItem key={s} value={s}>
                {STAGE_LABEL[s]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ mt: 2 }}>
          <Button type="submit" variant="contained" disabled={m.isPending}>
            Create
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
