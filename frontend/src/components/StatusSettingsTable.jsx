import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleCheck, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import StandardTable from './StandardTable';
import StatusBadge, { statusTones } from './StatusBadge';
import {
  createSystemStatus,
  deleteSystemStatus,
  getSystemStatuses,
  setSystemStatusActive,
  updateSystemStatus,
} from '../services/api';

const errorMessage = (error) => (
  error.response?.data?.message
  || error.message
  || 'Não foi possível concluir a operação.'
);
const toneLabel = (tone) => statusTones.find(({ value }) => value === tone)?.label ?? tone;

/** Estados editáveis, guardados na tabela system_statuses e apresentados em tabelas. */
export default function StatusSettingsTable({ groups }) {
  const modules = useMemo(() => groups.map(({ module }) => module), [groups]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setStatuses(await getSystemStatuses(modules));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [modules]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action, successMessage) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(successMessage);
      await load();
      return true;
    } catch (actionError) {
      setError(errorMessage(actionError));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const payload = { module: editing.module, label: editing.label, tone: editing.tone };
    const saved = await run(
      () => (editing.id ? updateSystemStatus(editing.id, payload) : createSystemStatus(payload)),
      editing.id ? 'Estado actualizado.' : 'Estado criado.',
    );
    if (saved) setEditing(null);
  };

  const confirmDelete = async () => {
    const removed = await run(() => deleteSystemStatus(deleting.id), 'Estado apagado.');
    if (removed) setDeleting(null);
  };

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      {groups.map(({ module, title }) => (
        <section className="cacoin-settings-card" key={module}>
          <div className="cacoin-status-table-heading">
            <div className="cacoin-settings-section-heading">
              <CircleCheck size={20} />
              <div>
                <h2>{title}</h2>
              </div>
            </div>
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={16} />}
              disabled={loading || saving}
              onClick={() => setEditing({ module, label: '', tone: 'pending' })}
            >
              Novo estado
            </Button>
          </div>
          <StandardTable
            audit="SystemStatus"
            ariaLabel={title}
            columns={[
              { key: 'label', label: 'Estado' },
              { key: 'tone', label: 'Cor' },
              { key: 'active', label: 'Situação' },
              { key: 'actions', label: 'Acções', align: 'right' },
            ]}
            emptyMessage="Não existem estados."
            loading={loading}
            rows={statuses.filter((status) => status.module === module)}
            renderRow={(row, rowNumber) => (
              <TableRow key={row.id} hover>
                <TableCell>{rowNumber}</TableCell>
                <TableCell><StatusBadge label={row.label} tone={row.tone} /></TableCell>
                <TableCell>{toneLabel(row.tone)}</TableCell>
                <TableCell>
                  <StatusBadge
                    label={row.active ? 'Activo' : 'Inactivo'}
                    tone={row.active ? 'paid' : 'pending'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <span>
                      <IconButton
                        className="cacoin-table-action-edit"
                        aria-label={`Editar o estado ${row.label}`}
                        disabled={saving}
                        onClick={() => setEditing({ ...row })}
                      >
                        <Pencil size={17} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={row.active ? 'Desactivar' : 'Activar'}>
                    <span>
                      <IconButton
                        className={row.active
                          ? 'cacoin-table-action-deactivate'
                          : 'cacoin-table-action-activate'}
                        aria-label={`${row.active ? 'Desactivar' : 'Activar'} o estado ${row.label}`}
                        disabled={saving}
                        onClick={() => run(
                          () => setSystemStatusActive(row.id, !row.active),
                          row.active ? 'Estado desactivado.' : 'Estado activado.',
                        )}
                      >
                        <Power size={17} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {!row.systemDefined && (
                    <Tooltip title="Apagar">
                      <span>
                        <IconButton
                          className="cacoin-table-action-delete"
                          aria-label={`Apagar o estado ${row.label}`}
                          disabled={saving}
                          onClick={() => setDeleting(row)}
                        >
                          <Trash2 size={17} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            )}
          />
        </section>
      ))}

      <Dialog
        open={Boolean(editing)}
        onClose={() => !saving && setEditing(null)}
        fullWidth
        maxWidth="xs"
      >
        {editing && (
          <form onSubmit={submit}>
            <DialogTitle>{editing.id ? 'Editar estado' : 'Novo estado'}</DialogTitle>
            <DialogContent>
              <TextField
                required
                autoFocus
                fullWidth
                size="small"
                label="Estado"
                value={editing.label}
                onChange={(event) => setEditing((current) => ({
                  ...current,
                  label: event.target.value,
                }))}
                sx={{ mt: 1, mb: 2 }}
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
              <TextField
                select
                fullWidth
                size="small"
                label="Cor"
                value={editing.tone}
                onChange={(event) => setEditing((current) => ({
                  ...current,
                  tone: event.target.value,
                }))}
              >
                {statusTones.map(({ value, label }) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </TextField>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'A guardar…' : 'Guardar'}
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>

      <Dialog
        open={Boolean(deleting)}
        onClose={() => !saving && setDeleting(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Apagar estado</DialogTitle>
        <DialogContent>
          Tem a certeza de que pretende apagar o estado {deleting?.label}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)} disabled={saving}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={saving}>
            {saving ? 'A apagar…' : 'Apagar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
