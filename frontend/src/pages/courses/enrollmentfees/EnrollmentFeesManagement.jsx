import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import StandardTable from '../../../components/StandardTable';
import DataExportMenu from '../../../components/DataExportMenu';
import SearchField from '../../../components/SearchField';
import { filterBySearch } from '../../../utils/search';
import Money from '../../../components/Money';
import { formatMoney } from '../../../utils/money';
import {
  createEnrollmentFee,
  deleteEnrollmentFee,
  getEnrollmentFees,
  setEnrollmentFeeActive,
  updateEnrollmentFee,
} from '../../../services/api';

const emptyForm = { type: '', description: '', amount: '' };

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';
}

export default function EnrollmentFeesManagement() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deletingFee, setDeletingFee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const filteredFees = useMemo(
    () => filterBySearch(fees, searchTerm, (fee) => [
      fee.type, fee.description, fee.amount, formatMoney(fee.amount), fee.active ? 'Ativo' : 'Inativo',
    ]),
    [fees, searchTerm],
  );
  const columns = [
    { key: 'type', label: 'Tipo' },
    { key: 'description', label: 'Descrição' },
    { key: 'amount', label: 'Valor' },
    { key: 'status', label: 'Estado' },
    { key: 'actions', label: 'Ações', align: 'right' },
  ];
  const exportColumns = [
    { key: 'type', label: 'Tipo' },
    { key: 'description', label: 'Descrição' },
    { key: 'amount', label: 'Valor' },
    { key: 'status', label: 'Estado' },
  ];
  const exportRows = filteredFees.map((fee) => ({
    type: fee.type,
    description: fee.description || '—',
    amount: formatMoney(fee.amount),
    status: fee.active ? 'Ativo' : 'Inativo',
  }));

  const loadFees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setFees(await getEnrollmentFees());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  const openCreateDialog = () => {
    setEditingFee(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = (fee) => {
    setEditingFee(fee);
    setForm({ type: fee.type, description: fee.description ?? '', amount: String(fee.amount) });
    setError('');
    setDialogOpen(true);
  };

  const submitFee = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingFee) {
        await updateEnrollmentFee(editingFee.id, form);
        setNotice('A taxa de inscrição foi atualizada.');
      } else {
        await createEnrollmentFee(form);
        setNotice('A taxa de inscrição foi criada.');
      }
      setDialogOpen(false);
      await loadFees();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleFee = async (fee) => {
    setError('');
    setNotice('');
    try {
      await setEnrollmentFeeActive(fee.id, !fee.active);
      setNotice(fee.active ? 'A taxa de inscrição foi desativada.' : 'A taxa de inscrição foi ativada.');
      await loadFees();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    setError('');
    try {
      await deleteEnrollmentFee(deletingFee.id);
      setNotice('A taxa de inscrição foi apagada.');
      setDeletingFee(null);
      await loadFees();
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
          <p className="cacoin-eyebrow">Gestão de Cursos</p>
          <h1>Taxas de Inscrição</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename="taxas-de-inscricao"
            title="Lista de Taxas de Inscrição"
            disabled={loading}
            onError={(exportError) => setError(exportError.message)}
          />
          <Button variant="contained" startIcon={<Plus size={17} />} onClick={openCreateDialog}>
            Nova taxa
          </Button>
        </div>
      </header>
      {error && !dialogOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>
      )}

      <StandardTable
        audit="EnrollmentFee"
        ariaLabel="Lista de taxas de inscrição"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar as taxas de inscrição.'
          : searchTerm.trim()
            ? 'Nenhuma taxa corresponde à pesquisa.'
            : 'Ainda não existem taxas de inscrição.'}
        loading={loading}
        rows={filteredFees}
        renderRow={(fee, rowNumber) => (
          <TableRow key={fee.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>
              <span className="cacoin-level-name">
                <ClipboardList size={18} aria-hidden="true" />
                {fee.type}
              </span>
            </TableCell>
            <TableCell>{fee.description || '—'}</TableCell>
            <TableCell><Money value={fee.amount} /></TableCell>
            <TableCell>
              <Chip size="small" color={fee.active ? 'success' : 'default'} label={fee.active ? 'Ativo' : 'Inativo'} />
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Editar taxa">
                <IconButton className="cacoin-table-action-edit" aria-label={`Editar ${fee.type}`} onClick={() => openEditDialog(fee)}>
                  <Pencil size={17} />
                </IconButton>
              </Tooltip>
              <Tooltip title={fee.active ? 'Desativar taxa' : 'Ativar taxa'}>
                <IconButton
                  className={fee.active ? 'cacoin-table-action-deactivate' : 'cacoin-table-action-activate'}
                  aria-label={`${fee.active ? 'Desativar' : 'Ativar'} ${fee.type}`}
                  onClick={() => toggleFee(fee)}
                >
                  <Power size={17} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Apagar taxa">
                <IconButton className="cacoin-table-action-delete" aria-label={`Apagar ${fee.type}`} onClick={() => setDeletingFee(fee)}>
                  <Trash2 size={17} />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={submitFee}>
          <DialogTitle>{editingFee ? 'Editar taxa de inscrição' : 'Nova taxa de inscrição'}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
            <TextField
              autoFocus required fullWidth size="small" margin="dense" label="Tipo"
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <TextField
              fullWidth multiline minRows={2} size="small" margin="dense" label="Descrição"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
            <TextField
              required fullWidth size="small" margin="dense" type="number" label="Valor"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              slotProps={{
                htmlInput: { min: 0, step: '0.01', inputMode: 'decimal' },
                input: { endAdornment: <InputAdornment position="end">MZN</InputAdornment> },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {editingFee ? 'Guardar alterações' : 'Criar taxa'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={Boolean(deletingFee)} onClose={() => !saving && setDeletingFee(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Apagar taxa de inscrição</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mt: 1, mb: 1 }}>{error}</Alert>}
          Tem a certeza de que pretende apagar a taxa “{deletingFee?.type}”?
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletingFee(null)} disabled={saving}>Cancelar</Button>
          <Button onClick={confirmDelete} disabled={saving}>Apagar</Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
