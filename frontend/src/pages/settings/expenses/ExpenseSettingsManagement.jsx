import { useCallback, useEffect, useState } from 'react';
import { CircleCheck, Pencil, Plus, Power, Settings, Trash2 } from 'lucide-react';
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
import StatusBadge from '../../../components/StatusBadge';
import StatusSettingsTable from '../../../components/StatusSettingsTable';
import {
  createExpenseCatalogItem,
  deleteExpenseCatalogItem,
  getExpenseCatalog,
  setExpenseCatalogItemActive,
  updateExpenseCatalogItem,
} from '../../../services/api';

const pages = {
  definition: { title: 'Definição', icon: Settings },
  statuses: { title: 'Estados', icon: CircleCheck },
};
const catalogs = [
  { kind: 'EXPENSE_TYPE', title: 'Tipos de despesa', label: 'Tipo de despesa' },
  { kind: 'SERVICE_TYPE', title: 'Tipos de serviço', label: 'Tipo de serviço' },
];
const statusGroups = [
  { module: 'EXPENSES', title: 'Estados das despesas' },
  { module: 'PURCHASES', title: 'Estados das compras' },
  { module: 'RETURNS', title: 'Estados das devoluções' },
  { module: 'SALES', title: 'Estados das vendas' },
];
const errorMessage = (error) => (
  error.response?.data?.message
  || error.message
  || 'Não foi possível concluir a operação.'
);

export default function ExpenseSettingsManagement({ mode }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const page = pages[mode] ?? pages.definition;
  const Icon = page.icon;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await getExpenseCatalog());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== 'statuses') load();
  }, [load, mode]);

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
    const saved = await run(
      () => (editing.id
        ? updateExpenseCatalogItem(editing.id, { kind: editing.kind, name: editing.name })
        : createExpenseCatalogItem({ kind: editing.kind, name: editing.name })),
      editing.id ? 'Registo actualizado.' : 'Registo criado.',
    );
    if (saved) setEditing(null);
  };

  const confirmDelete = async () => {
    const removed = await run(() => deleteExpenseCatalogItem(deleting.id), 'Registo apagado.');
    if (removed) setDeleting(null);
  };

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
          {catalogs.map(({ kind, title, label }) => (
            <section className="cacoin-settings-card" key={kind}>
              <div className="cacoin-status-table-heading">
                <div className="cacoin-settings-section-heading">
                  <Settings size={20} />
                  <div>
                    <h2>{title}</h2>
                  </div>
                </div>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Plus size={16} />}
                  disabled={loading || saving}
                  onClick={() => setEditing({ kind, label, name: '' })}
                >
                  Novo
                </Button>
              </div>
              <StandardTable
                audit="ExpenseCatalogItem"
                ariaLabel={title}
                columns={[
                  { key: 'name', label: label },
                  { key: 'active', label: 'Situação' },
                  { key: 'actions', label: 'Acções', align: 'right' },
                ]}
                emptyMessage="Ainda não existem registos."
                loading={loading}
                rows={items.filter((item) => item.kind === kind)}
                renderRow={(row, rowNumber) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{rowNumber}</TableCell>
                    <TableCell>{row.name}</TableCell>
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
                            aria-label={`Editar ${row.name}`}
                            disabled={saving}
                            onClick={() => setEditing({ ...row, label })}
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
                            aria-label={`${row.active ? 'Desactivar' : 'Activar'} ${row.name}`}
                            disabled={saving}
                            onClick={() => run(
                              () => setExpenseCatalogItemActive(row.id, !row.active),
                              row.active ? 'Registo desactivado.' : 'Registo activado.',
                            )}
                          >
                            <Power size={17} />
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
            </section>
          ))}

          <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} fullWidth maxWidth="xs">
            {editing && (
              <form onSubmit={submit}>
                <DialogTitle>{editing.id ? 'Editar' : 'Novo'} — {editing.label}</DialogTitle>
                <DialogContent>
                  <TextField
                    required
                    autoFocus
                    fullWidth
                    size="small"
                    label={editing.label}
                    value={editing.name}
                    onChange={(event) => setEditing((current) => ({
                      ...current,
                      name: event.target.value,
                    }))}
                    sx={{ mt: 1 }}
                    slotProps={{ htmlInput: { maxLength: 120 } }}
                  />
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

          <Dialog open={Boolean(deleting)} onClose={() => !saving && setDeleting(null)} fullWidth maxWidth="xs">
            <DialogTitle>Apagar registo</DialogTitle>
            <DialogContent>Tem a certeza de que pretende apagar {deleting?.name}?</DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleting(null)} disabled={saving}>Cancelar</Button>
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
