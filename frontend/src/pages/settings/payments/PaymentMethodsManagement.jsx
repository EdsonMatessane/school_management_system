import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Power, Trash2, Wallet } from 'lucide-react';
import {
  Alert,
  Button,
  Chip,
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
import DataExportMenu from '../../../components/DataExportMenu';
import SearchField from '../../../components/SearchField';
import { filterBySearch } from '../../../utils/search';
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  setPaymentMethodActive,
  updatePaymentMethod,
} from '../../../services/api';

const emptyForm = { name: '', description: '' };

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';
}

export default function PaymentMethodsManagement() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deletingMethod, setDeletingMethod] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const filteredMethods = useMemo(
    () => filterBySearch(methods, searchTerm, (method) => [
      method.name, method.description, method.active ? 'Ativo' : 'Inativo',
    ]),
    [methods, searchTerm],
  );
  const columns = [
    { key: 'name', label: 'Método de pagamento' },
    { key: 'description', label: 'Descrição' },
    { key: 'status', label: 'Estado' },
    { key: 'actions', label: 'Ações', align: 'right' },
  ];
  const exportColumns = [
    { key: 'name', label: 'Método de pagamento' },
    { key: 'description', label: 'Descrição' },
    { key: 'status', label: 'Estado' },
  ];
  const exportRows = filteredMethods.map((method) => ({
    name: method.name,
    description: method.description || '—',
    status: method.active ? 'Ativo' : 'Inativo',
  }));

  const loadMethods = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setMethods(await getPaymentMethods());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

  const openCreateDialog = () => {
    setEditingMethod(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = (method) => {
    setEditingMethod(method);
    setForm({ name: method.name, description: method.description ?? '' });
    setError('');
    setDialogOpen(true);
  };

  const submitMethod = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingMethod) {
        await updatePaymentMethod(editingMethod.id, form);
        setNotice('O método de pagamento foi atualizado.');
      } else {
        await createPaymentMethod(form);
        setNotice('O método de pagamento foi criado.');
      }
      setDialogOpen(false);
      await loadMethods();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleMethod = async (method) => {
    setError('');
    setNotice('');
    try {
      await setPaymentMethodActive(method.id, !method.active);
      setNotice(method.active
        ? 'O método de pagamento foi desativado.'
        : 'O método de pagamento foi ativado.');
      await loadMethods();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    setError('');
    try {
      await deletePaymentMethod(deletingMethod.id);
      setNotice('O método de pagamento foi apagado.');
      setDeletingMethod(null);
      await loadMethods();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Pagamentos</p>
          <h1>Métodos</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename="metodos-de-pagamento"
            title="Lista de Métodos de Pagamento"
            disabled={loading}
            onError={(exportError) => setError(exportError.message)}
          />
          <Button
            variant="contained"
            startIcon={<Plus size={17} />}
            onClick={openCreateDialog}
            sx={{ textTransform: 'none' }}
          >
            Novo método
          </Button>
        </div>
      </header>

      {error && !dialogOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      <StandardTable
        audit="PaymentMethod"
        ariaLabel="Lista de métodos de pagamento"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar os métodos de pagamento.'
          : searchTerm.trim()
            ? 'Nenhum método de pagamento corresponde à pesquisa.'
            : 'Ainda não existem métodos de pagamento.'}
        loading={loading}
        rows={filteredMethods}
        renderRow={(method, rowNumber) => (
          <TableRow key={method.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>
              <span className="cacoin-level-name">
                <Wallet size={18} aria-hidden="true" />
                {method.name}
              </span>
            </TableCell>
            <TableCell>{method.description || '—'}</TableCell>
            <TableCell>
              <Chip
                size="small"
                color={method.active ? 'success' : 'default'}
                label={method.active ? 'Ativo' : 'Inativo'}
              />
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Editar método">
                <IconButton
                  className="cacoin-table-action-edit"
                  aria-label={`Editar ${method.name}`}
                  onClick={() => openEditDialog(method)}
                >
                  <Pencil size={17} />
                </IconButton>
              </Tooltip>
              <Tooltip title={method.active ? 'Desativar método' : 'Ativar método'}>
                <IconButton
                  className={method.active
                    ? 'cacoin-table-action-deactivate'
                    : 'cacoin-table-action-activate'}
                  aria-label={`${method.active ? 'Desativar' : 'Ativar'} ${method.name}`}
                  onClick={() => toggleMethod(method)}
                >
                  <Power size={17} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Apagar método">
                <IconButton
                  className="cacoin-table-action-delete"
                  aria-label={`Apagar ${method.name}`}
                  onClick={() => setDeletingMethod(method)}
                >
                  <Trash2 size={17} />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={submitMethod}>
          <DialogTitle>{editingMethod ? 'Editar método' : 'Novo método'}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
            <TextField
              autoFocus
              required
              fullWidth
              size="small"
              margin="dense"
              label="Nome do método de pagamento"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))}
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <TextField
              fullWidth
              multiline
              minRows={3}
              size="small"
              margin="dense"
              label="Descrição"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              sx={{ textTransform: 'none' }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{ textTransform: 'none' }}
            >
              {editingMethod ? 'Guardar alterações' : 'Criar método'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deletingMethod)}
        onClose={() => !saving && setDeletingMethod(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Apagar método</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mt: 1, mb: 1 }}>{error}</Alert>}
          Tem a certeza de que pretende apagar o método de pagamento “{deletingMethod?.name}”?
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeletingMethod(null)}
            disabled={saving}
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmDelete}
            disabled={saving}
            sx={{ textTransform: 'none' }}
          >
            Apagar
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
