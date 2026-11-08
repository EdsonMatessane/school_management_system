import { useCallback, useEffect, useMemo, useState } from 'react';
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
  TextField as MuiTextField,
  Tooltip,
} from '@mui/material';
import { Pencil, Plus, Power } from 'lucide-react';
import StandardTable from '../../components/StandardTable';
import Money from '../../components/Money';
import {
  getExpenseBudgets,
  getExpenseCategories,
  getExpenseSettings,
  getExpenseSuppliers,
  saveExpenseBudget,
  saveExpenseCategory,
  saveExpenseSupplier,
  setExpenseCategoryActive,
  setExpenseSupplierActive,
} from './internal-expenses-api';
import DateField from '../../components/DateField';
import { formatDate } from '../../utils/date';

function TextField(props) {
  return <MuiTextField {...props} size="small" />;
}

const errorText = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';

const pages = {
  'internal-expenses-categories': { mode: 'categories', title: 'Categorias', singular: 'categoria' },
  'internal-expenses-suppliers': { mode: 'suppliers', title: 'Fornecedores', singular: 'fornecedor' },
  'internal-expenses-budgets': { mode: 'budgets', title: 'Orçamentos', singular: 'orçamento' },
};

const initialValues = {
  categories: { code: '', name: '', description: '', attachmentRequired: false, active: true },
  suppliers: { code: '', legalName: '', tradingName: '', taxIdentifier: '', phone: '', email: '', address: '', active: true },
  budgets: { name: '', periodStart: '', periodEnd: '', currency: 'MZN', approvedAmount: '', department: '', costCenter: '', categoryId: '', active: true },
};

export default function ExpenseAdminPage({ section }) {
  const page = pages[section] || pages['internal-expenses-categories'];
  const { mode } = page;
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialValues[mode]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, loadedCategories] = await Promise.all([
        mode === 'categories' ? getExpenseCategories()
          : mode === 'suppliers' ? getExpenseSuppliers() : getExpenseBudgets(),
        getExpenseCategories(),
      ]);
      const loadedSettings = mode === 'budgets' ? await getExpenseSettings() : null;
      setRows(data);
      setCategories(loadedCategories);
      if (loadedSettings) setSettings(loadedSettings);
    } catch (loadError) {
      setError(errorText(loadError));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...initialValues[mode],
      ...(mode === 'budgets' ? { currency: settings?.defaultCurrency || 'MZN' } : {}),
    });
    setError('');
    setDialogOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      ...initialValues[mode],
      ...row,
      categoryId: row.categoryId ? String(row.categoryId) : '',
      approvedAmount: row.approvedAmount || '',
      periodStart: row.periodStart || '',
      periodEnd: row.periodEnd || '',
    });
    setError('');
    setDialogOpen(true);
  };
  const set = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = mode === 'budgets'
        ? { ...form, approvedAmount: Number(form.approvedAmount), categoryId: form.categoryId ? Number(form.categoryId) : null }
        : form;
      const save = mode === 'categories' ? saveExpenseCategory
        : mode === 'suppliers' ? saveExpenseSupplier : saveExpenseBudget;
      await save(payload, editing?.id);
      setDialogOpen(false);
      setNotice(`O registo foi ${editing ? 'actualizado' : 'adicionado'}.`);
      await load();
    } catch (saveError) {
      setError(errorText(saveError));
    } finally {
      setSaving(false);
    }
  };
  const toggleActive = async (row) => {
    try {
      const setActive = mode === 'categories' ? setExpenseCategoryActive : setExpenseSupplierActive;
      await setActive(row.id, !row.active);
      await load();
    } catch (toggleError) {
      setError(errorText(toggleError));
    }
  };

  const columns = useMemo(() => mode === 'categories'
    ? [{ key: 'code', label: 'Código' }, { key: 'name', label: 'Categoria' }, { key: 'description', label: 'Descrição' }, { key: 'active', label: 'Estado' }, { key: 'actions', label: 'Ações', align: 'right' }]
    : mode === 'suppliers'
      ? [{ key: 'code', label: 'Código' }, { key: 'legalName', label: 'Nome legal' }, { key: 'taxIdentifier', label: 'NUIT' }, { key: 'phone', label: 'Telefone' }, { key: 'active', label: 'Estado' }, { key: 'actions', label: 'Ações', align: 'right' }]
      : [{ key: 'name', label: 'Orçamento' }, { key: 'period', label: 'Período' }, { key: 'department', label: 'Departamento' }, { key: 'approvedAmount', label: 'Aprovado' }, { key: 'committedAmount', label: 'Comprometido' }, { key: 'availableAmount', label: 'Disponível' }, { key: 'actions', label: 'Ações', align: 'right' }],
  [mode]);

  return (
    <section className="cacoin-course-page cacoin-tasks-page internal-expenses-page">
      <header className="cacoin-page-heading">
        <div><p className="cacoin-eyebrow">Despesas Internas</p><h1>{page.title}</h1></div>
        <Button variant="contained" startIcon={<Plus size={17} />} onClick={openCreate}>Adicionar {page.singular}</Button>
      </header>
      {error && !dialogOpen && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      <StandardTable
        audit={{ categories: 'InternalExpenseCategory', suppliers: 'InternalExpenseSupplier', budgets: 'InternalExpenseBudget' }[page.mode]}
        ariaLabel={page.title}
        columns={columns}
        loading={loading}
        rows={rows}
        emptyMessage={`Não existem ${page.title.toLocaleLowerCase('pt-MZ')}.`}
        renderRow={(row, index) => (
          <TableRow key={row.id} hover>
            <TableCell>{index}</TableCell>
            {mode === 'categories' ? (
              <>
                <TableCell>{row.code}</TableCell><TableCell>{row.name}</TableCell><TableCell>{row.description || '—'}</TableCell>
                <TableCell>{row.active ? 'Activo' : 'Inactivo'}</TableCell>
              </>
            ) : mode === 'suppliers' ? (
              <>
                <TableCell>{row.code}</TableCell><TableCell>{row.legalName}</TableCell><TableCell>{row.taxIdentifier || '—'}</TableCell><TableCell>{row.phone || '—'}</TableCell>
                <TableCell>{row.active ? 'Activo' : 'Inactivo'}</TableCell>
              </>
            ) : (
              <>
                <TableCell>{row.name}</TableCell>
                <TableCell>{formatDate(row.periodStart)} – {formatDate(row.periodEnd)}</TableCell>
                <TableCell>{row.department}{row.costCenter ? ` · ${row.costCenter}` : ''}</TableCell>
                <TableCell><Money value={row.approvedAmount} currency={row.currency} /></TableCell>
                <TableCell><Money value={row.committedAmount} currency={row.currency} /></TableCell>
                <TableCell><Money value={row.availableAmount} currency={row.currency} /></TableCell>
              </>
            )}
            <TableCell align="right">
              <Tooltip title="Editar"><IconButton aria-label={`Editar ${page.singular}`} onClick={() => openEdit(row)}><Pencil size={17} /></IconButton></Tooltip>
              {mode !== 'budgets' && <Tooltip title={row.active ? 'Inactivar' : 'Activar'}><IconButton aria-label={row.active ? 'Inactivar' : 'Activar'} onClick={() => toggleActive(row)}><Power size={17} /></IconButton></Tooltip>}
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={dialogOpen} onClose={saving ? undefined : () => setDialogOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={submit}>
          <DialogTitle>{editing ? 'Editar' : 'Adicionar'} {page.singular}</DialogTitle>
          <DialogContent className="internal-expense-form-grid">
            {error && <Alert severity="error" className="internal-expense-form-wide">{error}</Alert>}
            {mode === 'categories' && <>
              <TextField label="Código" value={form.code} onChange={set('code')} required />
              <TextField label="Nome" value={form.name} onChange={set('name')} required />
              <TextField className="internal-expense-form-wide" label="Descrição" value={form.description} onChange={set('description')} multiline />
            </>}
            {mode === 'suppliers' && <>
              <TextField label="Código" value={form.code} onChange={set('code')} required />
              <TextField label="Nome legal" value={form.legalName} onChange={set('legalName')} required />
              <TextField label="Nome comercial" value={form.tradingName || ''} onChange={set('tradingName')} />
              <TextField label="NUIT / Identificador fiscal" value={form.taxIdentifier || ''} onChange={set('taxIdentifier')} />
              <TextField label="Telefone" value={form.phone || ''} onChange={set('phone')} />
              <TextField label="Email" type="email" value={form.email || ''} onChange={set('email')} />
              <TextField className="internal-expense-form-wide" label="Endereço" value={form.address || ''} onChange={set('address')} />
            </>}
            {mode === 'budgets' && <>
              <TextField className="internal-expense-form-wide" label="Nome do orçamento" value={form.name} onChange={set('name')} required />
              <DateField label="Início" value={form.periodStart} onChange={set('periodStart')} required InputLabelProps={{ shrink: true }} />
              <DateField label="Fim" value={form.periodEnd} onChange={set('periodEnd')} required InputLabelProps={{ shrink: true }} />
              <TextField label="Montante aprovado" type="number" value={form.approvedAmount} onChange={set('approvedAmount')} required inputProps={{ min: '0.01', step: '0.01' }} />
              <TextField select label="Moeda" value={form.currency} onChange={set('currency')} required>{(settings?.currencies || []).map((option) => <MenuItem key={option.code} value={option.code}>{option.code} — {option.label}</MenuItem>)}</TextField>
              <TextField label="Departamento" value={form.department} onChange={set('department')} required />
              <TextField label="Centro de custo" value={form.costCenter || ''} onChange={set('costCenter')} />
              <TextField select label="Categoria (opcional)" value={form.categoryId} onChange={set('categoryId')}>
                <MenuItem value="">Todas</MenuItem>{categories.map((category) => <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>)}
              </TextField>
            </>}
          </DialogContent>
          <DialogActions><Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'A guardar…' : 'Guardar'}</Button></DialogActions>
        </form>
      </Dialog>
    </section>
  );
}
