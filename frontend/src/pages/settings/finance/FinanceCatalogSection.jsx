import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Money from '../../../components/Money';
import StandardTable from '../../../components/StandardTable';
import { toDisplayDate } from '../../../utils/date';
import '../../../components/status-badge.css';

const errorMessage = (error) => (
  error.response?.data?.message
  || error.message
  || 'Não foi possível concluir a operação.'
);

export default function FinanceCatalogSection({
  audit,
  title,
  icon: Icon,
  items,
  loading,
  withAmount,
  nameLabel = 'Nome',
  showDate = false,
  onCreate,
  onUpdate,
  onDelete,
  onChanged,
}) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const payload = (source) => ({
    name: source.name.trim(),
    amount: withAmount ? Number(String(source.amount).replace(',', '.')) : null,
  });
  const invalid = (source) => (
    !source.name.trim()
    || (withAmount && !(Number(String(source.amount).replace(',', '.')) > 0))
  );

  const run = async (action, message, onDone) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(message);
      onDone?.();
      await onChanged();
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setError('');
    setEditing({ id: null, name: '', amount: '' });
  };

  const submitEdit = (event) => {
    event.preventDefault();
    if (invalid(editing)) {
      setError(withAmount ? 'Indique o nome e um valor superior a zero.' : 'Indique o nome.');
      return;
    }
    if (editing.id) {
      run(() => onUpdate(editing.id, payload(editing)), 'Guardado.', () => setEditing(null));
    } else {
      run(() => onCreate(payload(editing)), 'Registado.', () => setEditing(null));
    }
  };

  const columns = [
    { key: 'name', label: nameLabel },
    ...(withAmount ? [{ key: 'amount', label: 'Valor' }] : []),
    ...(showDate ? [{ key: 'createdAt', label: 'Data' }] : []),
    { key: 'actions', label: 'Acções', align: 'right' },
  ];

  return (
    <section className="cacoin-settings-card">
      <div className="cacoin-status-table-heading">
        <div className="cacoin-settings-section-heading">
          <Icon size={20} />
          <div>
            <h2>{title}</h2>
          </div>
        </div>
        <Button
          variant="contained"
          size="small"
          startIcon={<Plus size={16} />}
          disabled={loading || saving}
          onClick={openCreate}
        >
          Adicionar
        </Button>
      </div>
      {notice && <Alert severity="success" sx={{ mb: 1 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && !editing && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert>
      )}
      <StandardTable
        audit={audit}
        ariaLabel={title}
        columns={columns}
        emptyMessage="Ainda não existem registos."
        loading={loading}
        rows={items}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{row.name}</TableCell>
            {withAmount && <TableCell><Money value={row.amount} /></TableCell>}
            {showDate && <TableCell>{toDisplayDate(row.createdAt)}</TableCell>}
            <TableCell align="right">
              <Tooltip title="Editar">
                <span>
                  <IconButton
                    className="cacoin-table-action-edit"
                    aria-label={`Editar ${row.name}`}
                    disabled={saving}
                    onClick={() => {
                      setError('');
                      setEditing({ id: row.id, name: row.name, amount: row.amount ? String(row.amount) : '' });
                    }}
                  >
                    <Pencil size={17} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Apagar">
                <span>
                  <IconButton
                    className="cacoin-table-action-delete"
                    aria-label={`Apagar ${row.name}`}
                    disabled={saving}
                    onClick={() => setDeleting(row)}
                  >
                    <Trash2 size={17} />
                  </IconButton>
                </span>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} fullWidth maxWidth="xs">
        <form onSubmit={submitEdit}>
          <DialogTitle>{editing?.id ? 'Editar' : 'Adicionar'}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
            <TextField
              required
              autoFocus
              fullWidth
              size="small"
              label={nameLabel}
              value={editing?.name ?? ''}
              onChange={(event) => setEditing((current) => ({ ...current, name: event.target.value }))}
              sx={{ mt: 1 }}
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            {withAmount && (
              <TextField
                required
                fullWidth
                size="small"
                type="number"
                label="Valor"
                value={editing?.amount ?? ''}
                onChange={(event) => setEditing((current) => ({ ...current, amount: event.target.value }))}
                sx={{ mt: 1.5 }}
                slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>{editing?.id ? 'Guardar' : 'Adicionar'}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={Boolean(deleting)} onClose={() => !saving && setDeleting(null)} fullWidth maxWidth="xs">
        <DialogTitle>Apagar</DialogTitle>
        <DialogContent>Apagar {deleting?.name}?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)} disabled={saving}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={saving}
            onClick={() => run(() => onDelete(deleting.id), 'Apagado.', () => setDeleting(null))}
          >
            Apagar
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
