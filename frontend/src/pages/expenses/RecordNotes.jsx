import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Eye, PenLine } from 'lucide-react';
import RichTextField from '../../components/RichTextField';
import { RichTextViewer } from '../../components/RichTextEditor';
import { saveExpenseRecordNotes } from '../../services/api';
import { richTextIsEmpty } from '../../utils/richText';

const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível guardar as anotações.'
);

/** Coluna «Anotações»: caneta para escrever e olho para ver, ambos em janelas. */
export function NotesCell({ row, onEdit, onView }) {
  return (
    <>
      <Tooltip title="Escrever anotações">
        <IconButton aria-label="Escrever anotações" onClick={() => onEdit(row)}>
          <PenLine size={17} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Ver anotações">
        <span>
          <IconButton
            aria-label="Ver anotações"
            disabled={richTextIsEmpty(row.notes)}
            onClick={() => onView(row)}
          >
            <Eye size={17} />
          </IconButton>
        </span>
      </Tooltip>
    </>
  );
}

/** Janelas de escrita e de leitura das anotações de um registo. */
export function NotesDialogs({ kind, editing, viewing, onCloseEdit, onCloseView, onSaved }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [openedFor, setOpenedFor] = useState(null);

  // Cada vez que se abre para outro registo, começa com as anotações dele.
  if (editing && openedFor !== editing) {
    setOpenedFor(editing);
    setValue(editing.notes ?? '');
    setError('');
  }
  if (!editing && openedFor) setOpenedFor(null);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = await saveExpenseRecordNotes(
        kind, editing.id, richTextIsEmpty(value) ? '' : value,
      );
      onSaved(saved);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={Boolean(editing)} onClose={() => !saving && onCloseEdit()} fullWidth maxWidth="md">
        <DialogTitle>Anotações</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          {editing && (
            <RichTextField
              label="Anotações"
              value={value}
              resetKey={editing.id}
              onChange={setValue}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseEdit} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? 'A guardar…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(viewing)} onClose={onCloseView} fullWidth maxWidth="md">
        <DialogTitle>Anotações</DialogTitle>
        <DialogContent>{viewing && <RichTextViewer value={viewing.notes} />}</DialogContent>
        <DialogActions>
          <Button onClick={onCloseView}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
