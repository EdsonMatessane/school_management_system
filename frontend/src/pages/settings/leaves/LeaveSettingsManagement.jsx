import { useCallback, useEffect, useState } from 'react';
import { CircleCheck, Pencil, Settings, Trash2 } from 'lucide-react';
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
import StandardTable from '../../../components/StandardTable';
import StatusSettingsTable from '../../../components/StatusSettingsTable';
import {
  deleteLeaveSettings,
  getLeaveSettings,
  updateLeaveSettings,
} from '../../../services/api';

const pages = {
  definition: { title: 'Definição', icon: Settings },
  statuses: { title: 'Estados', icon: CircleCheck },
};
const statusGroups = [{ module: 'LEAVES', title: 'Estados dos pedidos de saída' }];
const errorMessage = (error) => (
  error.response?.data?.message
  || error.message
  || 'Não foi possível concluir a operação.'
);

export default function LeaveSettingsManagement({ mode }) {
  const [settings, setSettings] = useState({ maxRequestsPerMonth: null });
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const page = pages[mode] ?? pages.definition;
  const Icon = page.icon;
  const configured = Number(settings.maxRequestsPerMonth) > 0;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSettings(await getLeaveSettings());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== 'statuses') load();
  }, [load, mode]);

  const save = async (event) => {
    event.preventDefault();
    const value = Number(input);
    if (!Number.isInteger(value) || value < 1 || value > 31) {
      setError('Indique um número inteiro entre 1 e 31.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setSettings(await updateLeaveSettings(value));
      setEditing(false);
      setInput('');
      setNotice('Definição guardada.');
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setSettings(await deleteLeaveSettings());
      setDeleting(false);
      setNotice('Definição apagada.');
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  const field = (autoFocus) => (
    <TextField
      required
      autoFocus={autoFocus}
      fullWidth
      size="small"
      type="number"
      label="Número máximo de pedidos por funcionário, por mês"
      value={input}
      onChange={(event) => setInput(event.target.value)}
      disabled={loading || saving}
      slotProps={{ htmlInput: { min: 1, max: 31, step: 1 } }}
    />
  );

  return (
    <section className="cacoin-course-page cacoin-settings-page cacoin-test-settings-page">
      <header className="cacoin-page-heading">
        <div>
          <h1><Icon size={23} aria-hidden="true" /> {page.title}</h1>
        </div>
      </header>

      {mode === 'statuses' ? (
        <StatusSettingsTable groups={statusGroups} />
      ) : (
        <>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
          {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
          <section className="cacoin-settings-card">
            <div className="cacoin-settings-section-heading">
              <Settings size={20} />
              <div>
                <h2>Pedidos de saída</h2>
              </div>
            </div>
            <StandardTable
              ariaLabel="Definições dos pedidos de saída"
              showIndex={false}
              columns={[
                { key: 'label', label: 'Definição' },
                { key: 'value', label: 'Valor' },
                { key: 'actions', label: 'Acções', align: 'right' },
              ]}
              emptyMessage="Não existem definições."
              loading={loading}
              rows={[{ id: 'max' }]}
              renderRow={(row) => (
                <TableRow key={row.id} hover>
                  <TableCell>Número máximo de pedidos por funcionário, por mês</TableCell>
                  <TableCell>{configured ? settings.maxRequestsPerMonth : '—'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <span>
                        <IconButton
                          className="cacoin-table-action-edit"
                          aria-label="Editar número máximo de pedidos"
                          disabled={saving}
                          onClick={() => {
                            setInput(configured ? String(settings.maxRequestsPerMonth) : '');
                            setEditing(true);
                            setError('');
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
                          aria-label="Apagar número máximo de pedidos"
                          disabled={saving || !configured}
                          onClick={() => setDeleting(true)}
                        >
                          <Trash2 size={17} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )}
            />
          </section>

          <Dialog open={editing} onClose={() => !saving && setEditing(false)} fullWidth maxWidth="xs">
            <form onSubmit={save}>
              <DialogTitle>Editar definição</DialogTitle>
              <DialogContent sx={{ pt: 1 }}>{field(true)}</DialogContent>
              <DialogActions>
                <Button onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
                <Button type="submit" variant="contained" disabled={saving}>
                  {saving ? 'A guardar…' : 'Guardar'}
                </Button>
              </DialogActions>
            </form>
          </Dialog>

          <Dialog open={deleting} onClose={() => !saving && setDeleting(false)} fullWidth maxWidth="xs">
            <DialogTitle>Apagar definição</DialogTitle>
            <DialogContent>
              Tem a certeza de que pretende apagar o número máximo de pedidos por mês?
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleting(false)} disabled={saving}>Cancelar</Button>
              <Button color="error" variant="contained" onClick={confirmDelete} disabled={saving}>
                {saving ? 'A apagar…' : 'Apagar'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </section>
  );
}
