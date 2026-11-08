import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { forwardExpenseRecord, getStaff } from '../../services/api';

const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível encaminhar o registo.'
);
const staffName = (member) => [member.firstName, member.surname].filter(Boolean).join(' ');

/** Encaminha (ou reencaminha) um registo para um funcionário «outros». */
export default function ForwardDialog({ kind, row, onClose, onForwarded }) {
  const [staff, setStaff] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!row) return;
    setError('');
    setSelected(null);
    getStaff('other')
      .then((members) => {
        const active = members.filter((member) => member.active);
        setStaff(active);
        setSelected(active.find((member) => member.id === row.forward?.staffId) ?? null);
      })
      .catch((loadError) => setError(errorMessage(loadError)));
  }, [row]);

  const submit = async () => {
    if (!selected) {
      setError('Seleccione o funcionário.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await forwardExpenseRecord(kind, row.id, selected.id);
      onForwarded();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(row)} onClose={() => !saving && onClose()} fullWidth maxWidth="xs">
      <DialogTitle>{row?.forward ? 'Reencaminhar' : 'Encaminhar'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        <Autocomplete
          options={staff}
          value={selected}
          onChange={(_, member) => setSelected(member)}
          getOptionLabel={(member) => `${member.staffCode ?? ''} — ${staffName(member)}`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText="Sem funcionários disponíveis"
          renderInput={(params) => (
            <TextField {...params} label="Funcionário" size="small" sx={{ mt: 1 }} />
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {saving ? 'A guardar…' : 'Encaminhar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
