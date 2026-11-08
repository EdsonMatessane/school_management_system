import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Pencil, Plus, Power, Trash2 } from 'lucide-react';
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
  createMonthlyFee,
  deleteMonthlyFee,
  getMonthlyFees,
  setMonthlyFeeActive,
  updateMonthlyFee,
} from '../../../services/api';

const emptyForm = { type: '', description: '', amount: '' };

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';
}

export default function MonthlyFeesManagement() {
  const [monthlyFees, setMonthlyFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMonthlyFee, setEditingMonthlyFee] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deletingMonthlyFee, setDeletingMonthlyFee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const filteredMonthlyFees = useMemo(
    () => filterBySearch(monthlyFees, searchTerm, (fee) => [
      fee.type, fee.description, fee.amount, formatMoney(fee.amount), fee.active ? 'Ativo' : 'Inativo',
    ]),
    [monthlyFees, searchTerm],
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
  const exportRows = filteredMonthlyFees.map((fee) => ({
    type: fee.type,
    description: fee.description || '—',
    amount: formatMoney(fee.amount),
    status: fee.active ? 'Ativo' : 'Inativo',
  }));

  const loadMonthlyFees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setMonthlyFees(await getMonthlyFees());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonthlyFees();
  }, [loadMonthlyFees]);

  const openCreateDialog = () => {
    setEditingMonthlyFee(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = (monthlyFee) => {
    setEditingMonthlyFee(monthlyFee);
    setForm({
      type: monthlyFee.type,
      description: monthlyFee.description ?? '',
      amount: String(monthlyFee.amount),
    });
    setError('');
    setDialogOpen(true);
  };

  const submitMonthlyFee = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, amount: form.amount };
      if (editingMonthlyFee) {
        await updateMonthlyFee(editingMonthlyFee.id, payload);
        setNotice('A mensalidade foi atualizada.');
      } else {
        await createMonthlyFee(payload);
        setNotice('A mensalidade foi criada.');
      }
      setDialogOpen(false);
      await loadMonthlyFees();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleMonthlyFee = async (monthlyFee) => {
    setError('');
    setNotice('');
    try {
      await setMonthlyFeeActive(monthlyFee.id, !monthlyFee.active);
      setNotice(monthlyFee.active
        ? 'A mensalidade foi desativada.'
        : 'A mensalidade foi ativada.');
      await loadMonthlyFees();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    setError('');
    try {
      await deleteMonthlyFee(deletingMonthlyFee.id);
      setNotice('A mensalidade foi apagada.');
      setDeletingMonthlyFee(null);
      await loadMonthlyFees();
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
          <h1>Mensalidades</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename="mensalidades"
            title="Lista de Mensalidades"
            disabled={loading}
            onError={(exportError) => setError(exportError.message)}
          />
          <Button
            variant="contained"
            startIcon={<Plus size={17} />}
            onClick={openCreateDialog}
            sx={{ textTransform: 'none' }}
          >
            Nova mensalidade
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
        audit="MonthlyFee"
        ariaLabel="Lista de mensalidades"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar as mensalidades.'
          : searchTerm.trim()
            ? 'Nenhuma mensalidade corresponde à pesquisa.'
            : 'Ainda não existem mensalidades.'}
        loading={loading}
        rows={filteredMonthlyFees}
        renderRow={(monthlyFee, rowNumber) => (
          <TableRow key={monthlyFee.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>
              <span className="cacoin-level-name">
                <CalendarDays size={18} aria-hidden="true" />
                {monthlyFee.type}
              </span>
            </TableCell>
            <TableCell>{monthlyFee.description || '—'}</TableCell>
            <TableCell><Money value={monthlyFee.amount} /></TableCell>
            <TableCell>
              <Chip
                size="small"
                color={monthlyFee.active ? 'success' : 'default'}
                label={monthlyFee.active ? 'Ativo' : 'Inativo'}
              />
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Editar mensalidade">
                <IconButton
                  className="cacoin-table-action-edit"
                  aria-label={`Editar ${monthlyFee.type}`}
                  onClick={() => openEditDialog(monthlyFee)}
                >
                  <Pencil size={17} />
                </IconButton>
              </Tooltip>
              <Tooltip title={monthlyFee.active ? 'Desativar mensalidade' : 'Ativar mensalidade'}>
                <IconButton
                  className={monthlyFee.active
                    ? 'cacoin-table-action-deactivate'
                    : 'cacoin-table-action-activate'}
                  aria-label={`${monthlyFee.active ? 'Desativar' : 'Ativar'} ${monthlyFee.type}`}
                  onClick={() => toggleMonthlyFee(monthlyFee)}
                >
                  <Power size={17} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Apagar mensalidade">
                <IconButton
                  className="cacoin-table-action-delete"
                  aria-label={`Apagar ${monthlyFee.type}`}
                  onClick={() => setDeletingMonthlyFee(monthlyFee)}
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
        <form onSubmit={submitMonthlyFee}>
          <DialogTitle>{editingMonthlyFee ? 'Editar mensalidade' : 'Nova mensalidade'}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
            <TextField
              autoFocus
              required
              fullWidth
              size="small"
              margin="dense"
              label="Tipo"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value }))}
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              size="small"
              margin="dense"
              label="Descrição"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
            <TextField
              required
              fullWidth
              size="small"
              margin="dense"
              type="number"
              label="Valor"
              value={form.amount}
              onChange={(event) =>
                setForm((current) => ({ ...current, amount: event.target.value }))}
              slotProps={{
                htmlInput: { min: 0, step: '0.01', inputMode: 'decimal' },
                input: {
                  endAdornment: <InputAdornment position="end">MZN</InputAdornment>,
                },
              }}
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
              {editingMonthlyFee ? 'Guardar alterações' : 'Criar mensalidade'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deletingMonthlyFee)}
        onClose={() => !saving && setDeletingMonthlyFee(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Apagar mensalidade</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mt: 1, mb: 1 }}>{error}</Alert>}
          Tem a certeza de que pretende apagar a mensalidade “{deletingMonthlyFee?.type}”?
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeletingMonthlyFee(null)}
            disabled={saving}
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button onClick={confirmDelete} disabled={saving} sx={{ textTransform: 'none' }}>
            Apagar
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
