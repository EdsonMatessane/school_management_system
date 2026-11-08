import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

/** Diálogo reutilizável para formulários de configurações (criar/editar). */
export default function SettingsFormDialog({
  open,
  title,
  onClose,
  onSubmit,
  saving = false,
  error = '',
  submitLabel = 'Guardar',
  submitDisabled = false,
  maxWidth = 'sm',
  children,
}) {
  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth={maxWidth}>
      <form onSubmit={onSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <div style={{ paddingTop: 8 }}>{children}</div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving || submitDisabled}>
            {saving ? 'A guardar…' : submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
