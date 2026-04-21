import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        Access denied
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        You do not have permission to use this feature. If you need access, ask an administrator
        to assign the correct role. API requests return the same message when the server rejects an
        action (HTTP 403).
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Home
      </Button>
    </Box>
  );
}
