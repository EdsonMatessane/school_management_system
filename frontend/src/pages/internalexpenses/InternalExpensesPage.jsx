import { systemDate } from '../../utils/systemDate';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TableCell,
  TableRow,
  TextField as MuiTextField,
  Tooltip,
} from '@mui/material';
import {
  BadgeDollarSign,
  Check,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Wallet,
  X,
} from 'lucide-react';
import StandardTable from '../../components/StandardTable';
import Money from '../../components/Money';
import DataExportMenu from '../../components/DataExportMenu';
import { displayText } from '../../utils/displayText';
import ExpenseFormDialog from './ExpenseFormDialog';
import ExpenseAdminPage from './ExpenseAdminPage';
import InternalExpenseSettingsPage from './InternalExpenseSettingsPage';
import {
  cancelExpense,
  createExpense,
  createExpensePayment,
  decideExpense,
  getAllExpensePayments,
  getExpenseAudit,
  getExpenseCategories,
  getExpenseDashboard,
  getExpenses,
  getExpenseSuppliers,
  getExpenseSettings,
  reverseExpensePayment,
  submitExpense,
  updateExpense,
} from './internal-expenses-api';
import DateField from '../../components/DateField';
import { formatDate, formatDateTime } from '../../utils/date';
import './internal-expenses.css';

function TextField(props) {
  return <MuiTextField {...props} size="small" />;
}

const labels = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Submetida',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  RETURNED: 'Devolvida',
  CANCELLED: 'Cancelada',
  UNPAID: 'Não paga',
  PARTIAL: 'Parcialmente paga',
  PAID: 'Paga',
  OPERATIONAL: 'Operacional',
  PURCHASE: 'Compra',
  SERVICE: 'Serviço',
  PETTY_CASH: 'Pequena despesa',
  REIMBURSEMENT: 'Reembolso',
};

const pages = {
  'internal-expenses-dashboard': { title: 'Painel', mode: 'dashboard' },
  'internal-expenses-all': { title: 'Todas as despesas', mode: 'expenses' },
  'internal-expenses-approvals': { title: 'Aprovações pendentes', mode: 'approvals' },
  'internal-expenses-payments': { title: 'Pagamentos', mode: 'payments' },
  'internal-expenses-reports': { title: 'Relatórios', mode: 'reports' },
};

const errorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';
const statusClass = (value) => value?.toLocaleLowerCase('en').replaceAll('_', '-');
const operator = 'Utilizador actual';
const currency = (value) => value || 'MZN';

function MetricCard({ label, value, icon: Icon, detail }) {
  return (
    <article className="cacoin-task-dashboard-card">
      <span className="cacoin-task-dashboard-card-icon"><Icon size={20} aria-hidden="true" /></span>
      <span className="cacoin-task-dashboard-card-label">{label}</span>
      <strong>{value}</strong>
      <span className="internal-expense-metric-detail">{detail}</span>
    </article>
  );
}

function money(value, code = 'MZN') {
  return <Money value={value} currency={code} />;
}

function ExpensePaymentDialog({ open, expense, settings, saving, error, onClose, onSave }) {
  const [form, setForm] = useState({
    paymentDate: systemDate().toISOString().slice(0, 10),
    amount: '',
    method: settings?.paymentMethods?.[0]?.code || 'TRANSFER',
    externalReference: '',
  });
  useEffect(() => {
    if (open) setForm({
      paymentDate: systemDate().toISOString().slice(0, 10),
      amount: expense?.balance || '',
      method: settings?.paymentMethods?.[0]?.code || 'TRANSFER',
      externalReference: '',
    });
  }, [expense, open, settings]);
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={(event) => {
        event.preventDefault();
        onSave({ ...form, amount: Number(form.amount), recordedBy: operator });
      }}>
        <DialogTitle>Registar pagamento · {expense?.reference}</DialogTitle>
        <DialogContent className="internal-expense-form-grid">
          {error && <Alert severity="error" className="internal-expense-form-wide">{error}</Alert>}
          <DateField label="Data do pagamento" value={form.paymentDate} onChange={set('paymentDate')} required InputLabelProps={{ shrink: true }} />
          <TextField label={`Valor (${currency(expense?.currency)})`} type="number" value={form.amount} onChange={set('amount')} required inputProps={{ min: '0.01', max: expense?.balance, step: '0.01' }} />
          <TextField select label="Método" value={form.method} onChange={set('method')} required>
            {(settings?.paymentMethods || []).map((option) => (
              <MenuItem key={option.code} value={option.code}>{option.label}</MenuItem>
            ))}
          </TextField>
          <TextField label="Referência externa" value={form.externalReference} onChange={set('externalReference')} />
          <p className="internal-expense-form-wide internal-expense-balance">Saldo por pagar: {money(expense?.balance, expense?.currency)}</p>
        </DialogContent>
        <DialogActions><Button onClick={onClose} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'A guardar…' : 'Registar pagamento'}</Button></DialogActions>
      </form>
    </Dialog>
  );
}

export default function InternalExpensesPage({ section }) {
  if (section === 'internal-expenses-settings-general') {
    return <InternalExpenseSettingsPage />;
  }
  if (section === 'internal-expenses-categories'
    || section === 'internal-expenses-suppliers'
    || section === 'internal-expenses-budgets') {
    return <ExpenseAdminPage section={section} />;
  }
  return <InternalExpensesOperationsPage section={section} />;
}

function InternalExpensesOperationsPage({ section }) {
  const page = pages[section] || pages['internal-expenses-dashboard'];
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [minimumAmount, setMinimumAmount] = useState('');
  const [maximumAmount, setMaximumAmount] = useState('');
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [paymentExpense, setPaymentExpense] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const [decision, setDecision] = useState(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailAudit, setDetailAudit] = useState([]);
  const [reversing, setReversing] = useState(null);
  const [reversalReason, setReversalReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [loadedExpenses, loadedCategories, loadedSuppliers, loadedPayments, loadedDashboard, loadedSettings] =
        await Promise.all([
          getExpenses(),
          getExpenseCategories(),
          getExpenseSuppliers(),
          getAllExpensePayments(),
          getExpenseDashboard(),
          getExpenseSettings(),
        ]);
      setExpenses(loadedExpenses);
      setCategories(loadedCategories);
      setSuppliers(loadedSuppliers);
      setPayments(loadedPayments);
      setDashboard(loadedDashboard);
      setSettings(loadedSettings);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filteredExpenses = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-MZ');
    return expenses.filter((expense) => {
      const matchesQuery = !term || [
        expense.reference, expense.title, expense.requesterName,
        expense.department, expense.categoryName, expense.supplierName,
      ].filter(Boolean).join(' ').toLocaleLowerCase('pt-MZ').includes(term);
      const matchesStatus = !statusFilter
        || expense.approvalStatus === statusFilter
        || expense.paymentStatus === statusFilter;
      const matchesCategory = !categoryFilter || String(expense.categoryId) === categoryFilter;
      const matchesSupplier = !supplierFilter || String(expense.supplierId) === supplierFilter;
      const matchesDepartment = !departmentFilter
        || expense.department.toLocaleLowerCase('pt-MZ').includes(departmentFilter.trim().toLocaleLowerCase('pt-MZ'));
      const matchesDate = (!fromDate || expense.expenseDate >= fromDate)
        && (!toDate || expense.expenseDate <= toDate);
      const matchesMinimum = !minimumAmount || Number(expense.totalAmount) >= Number(minimumAmount);
      const matchesMaximum = !maximumAmount || Number(expense.totalAmount) <= Number(maximumAmount);
      const matchesFilters = matchesQuery && matchesStatus && matchesCategory
        && matchesSupplier && matchesDepartment && matchesDate
        && matchesMinimum && matchesMaximum;
      if (page.mode === 'approvals') return expense.approvalStatus === 'SUBMITTED' && matchesFilters;
      if (page.mode === 'payments') return expense.approvalStatus === 'APPROVED' && expense.balance > 0 && matchesFilters;
      return matchesFilters;
    });
  }, [
    categoryFilter, departmentFilter, expenses, fromDate, maximumAmount,
    minimumAmount, page.mode, search, statusFilter,
    supplierFilter, toDate,
  ]);

  const openCreate = () => {
    setEditing(null);
    setError('');
    setFormOpen(true);
  };
  const openEdit = (expense) => {
    setEditing(expense);
    setError('');
    setFormOpen(true);
  };
  const saveExpense = async (payload) => {
    setSaving(true);
    setError('');
    try {
      if (editing) await updateExpense(editing.id, payload);
      else await createExpense(payload);
      setFormOpen(false);
      setNotice(editing ? 'A despesa foi actualizada.' : 'O rascunho foi guardado.');
      await load();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };
  const submitDraft = async (expense) => {
    try {
      await submitExpense(expense.id, expense.requesterName);
      setNotice('A despesa foi submetida para aprovação.');
      await load();
    } catch (submitError) {
      setError(errorMessage(submitError));
    }
  };
  const saveDecision = async () => {
    if (!decision) return;
    setSaving(true);
    setError('');
    try {
      await decideExpense(decision.expense.id, decision.action, operator, decisionComment);
      setDecision(null);
      setDecisionComment('');
      setNotice('A decisão foi registada.');
      await load();
    } catch (decisionError) {
      setError(errorMessage(decisionError));
    } finally {
      setSaving(false);
    }
  };
  const savePayment = async (payload) => {
    setSaving(true);
    setPaymentError('');
    try {
      await createExpensePayment(paymentExpense.id, payload);
      setPaymentExpense(null);
      setNotice('O pagamento foi registado.');
      await load();
    } catch (paymentSaveError) {
      setPaymentError(errorMessage(paymentSaveError));
    } finally {
      setSaving(false);
    }
  };
  const openDetails = async (expense) => {
    setDetail(expense);
    try {
      setDetailAudit(await getExpenseAudit(expense.id));
    } catch (auditError) {
      setError(errorMessage(auditError));
      setDetailAudit([]);
    }
  };
  const reversePayment = async (payment, reason) => {
    if (!reason?.trim()) return;
    try {
      await reverseExpensePayment(payment.id, operator, reason.trim());
      setNotice('O pagamento foi revertido.');
      await load();
      return true;
    } catch (reverseError) {
      setError(errorMessage(reverseError));
      return false;
    }
  };
  const cancelDraft = async (expense) => {
    const reason = window.prompt(`Motivo obrigatório para cancelar ${expense.reference}:`);
    if (!reason?.trim()) return;
    try {
      await cancelExpense(expense.id, operator, reason.trim());
      setNotice('A despesa foi cancelada.');
      await load();
    } catch (cancelError) {
      setError(errorMessage(cancelError));
    }
  };

  const expenseColumns = [
    { key: 'reference', label: 'Referência' },
    { key: 'title', label: 'Despesa' },
    { key: 'date', label: 'Data' },
    { key: 'requester', label: 'Solicitante' },
    { key: 'department', label: 'Departamento' },
    { key: 'category', label: 'Categoria' },
    { key: 'amount', label: 'Total' },
    { key: 'approval', label: 'Aprovação' },
    { key: 'payment', label: 'Pagamento' },
    { key: 'actions', label: 'Ações', align: 'right' },
  ];
  const paymentColumns = [
    { key: 'reference', label: 'Referência' },
    { key: 'expense', label: 'Despesa' },
    { key: 'date', label: 'Data' },
    { key: 'method', label: 'Método' },
    { key: 'amount', label: 'Valor' },
    { key: 'operator', label: 'Registado por' },
    { key: 'status', label: 'Estado' },
    { key: 'actions', label: 'Ações', align: 'right' },
  ];
  const reportColumns = [
    { key: 'reference', label: 'Referência' },
    { key: 'title', label: 'Título' },
    { key: 'type', label: 'Tipo' },
    { key: 'expenseDate', label: 'Data' },
    { key: 'requesterName', label: 'Solicitante' },
    { key: 'department', label: 'Departamento' },
    { key: 'categoryName', label: 'Categoria' },
    { key: 'supplierName', label: 'Fornecedor' },
    { key: 'totalAmount', label: 'Valor total' },
    { key: 'paidAmount', label: 'Total pago' },
    { key: 'balance', label: 'Saldo' },
    { key: 'currency', label: 'Moeda' },
    { key: 'approvalStatus', label: 'Estado' },
    { key: 'paymentStatus', label: 'Pagamento' },
  ];
  const reportRows = filteredExpenses.map((expense) => ({
    ...expense,
    type: settings?.expenseTypes?.find((option) => option.code === expense.type)?.label
      || labels[expense.type] || expense.type,
    approvalStatus: labels[expense.approvalStatus] || expense.approvalStatus,
    paymentStatus: labels[expense.paymentStatus] || expense.paymentStatus,
  }));

  if (page.mode === 'dashboard') {
    const cards = [
      { label: 'Total solicitado', value: money(dashboard?.requestedAmount), icon: BadgeDollarSign, detail: 'Valor de todas as despesas' },
      { label: 'Total aprovado', value: money(dashboard?.approvedAmount), icon: Check, detail: 'Autorizado para pagamento' },
      { label: 'Total pago', value: money(dashboard?.paidAmount), icon: Wallet, detail: 'Pagamentos registados' },
      { label: 'Por pagar', value: money(dashboard?.outstandingAmount), icon: CircleDollarSign, detail: 'Saldo de despesas aprovadas' },
      { label: 'Aprovações pendentes', value: dashboard?.pendingApprovals ?? '—', icon: Clock3, detail: 'A aguardar decisão' },
      { label: 'Devolvidas / rejeitadas', value: dashboard?.returnedOrRejected ?? '—', icon: ClipboardList, detail: 'Precisam de acompanhamento' },
      { label: 'Vencidas', value: dashboard?.overdueExpenses ?? '—', icon: Clock3, detail: 'Com saldo por pagar' },
      { label: 'Alertas de orçamento', value: dashboard?.budgetAlerts ?? '—', icon: CircleDollarSign, detail: 'Compromissos atingiram o limite' },
    ];
    return (
      <section className="cacoin-course-page cacoin-tasks-page internal-expenses-page">
        <header className="cacoin-page-heading"><div><p className="cacoin-eyebrow">Despesas Internas</p><h1>Painel</h1></div><Button variant="contained" startIcon={<Plus size={17} />} onClick={openCreate}>Nova despesa</Button></header>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <div className="cacoin-task-dashboard-cards internal-expense-dashboard-cards">
          {cards.map((card) => <MetricCard key={card.label} {...card} />)}
        </div>
        <section className="internal-expense-recent">
          <header><h2>Despesas recentes</h2></header>
          <StandardTable
            audit="InternalExpense"
            ariaLabel="Despesas internas recentes"
            columns={expenseColumns.slice(0, 8)}
            rows={expenses.slice(0, 8)}
            loading={loading}
            emptyMessage="Ainda não existem despesas."
            renderRow={(expense, index) => (
              <TableRow key={expense.id} hover>
                <TableCell>{index}</TableCell><TableCell>{expense.reference}</TableCell><TableCell>{expense.title}</TableCell><TableCell>{formatDate(expense.expenseDate)}</TableCell>
                <TableCell>{expense.requesterName}</TableCell><TableCell>{expense.department}</TableCell><TableCell>{expense.categoryName}</TableCell>
                <TableCell>{money(expense.totalAmount, expense.currency)}</TableCell><TableCell><Chip size="small" label={labels[expense.approvalStatus] || expense.approvalStatus} className={`internal-expense-status ${statusClass(expense.approvalStatus)}`} /></TableCell>
              </TableRow>
            )}
          />
        </section>
        <ExpenseFormDialog open={formOpen} expense={editing} categories={categories} suppliers={suppliers} settings={settings} saving={saving} error={error} onClose={() => setFormOpen(false)} onSave={saveExpense} />
      </section>
    );
  }

  if (page.mode === 'reports') {
    return (
      <section className="cacoin-course-page cacoin-tasks-page internal-expenses-page">
        <header className="cacoin-page-heading"><div><p className="cacoin-eyebrow">Despesas Internas</p><h1>Relatórios</h1></div><DataExportMenu columns={reportColumns} rows={reportRows} filename="despesas-internas" title="Relatório de Despesas Internas" disabled={loading} onError={(exportError) => setError(errorMessage(exportError))} /></header>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <section className="internal-expense-filter-grid">
          <TextField label="Pesquisar despesas" value={search} onChange={(event) => setSearch(event.target.value)} size="small" />
          <TextField select label="Estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} size="small"><MenuItem value="">Todos</MenuItem>{['DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED', 'REJECTED', 'CANCELLED', 'UNPAID', 'PARTIAL', 'PAID'].map((value) => <MenuItem key={value} value={value}>{labels[value]}</MenuItem>)}</TextField>
          <TextField select label="Categoria" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} size="small"><MenuItem value="">Todas</MenuItem>{categories.map((category) => <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>)}</TextField>
          <TextField select label="Fornecedor" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} size="small"><MenuItem value="">Todos</MenuItem>{suppliers.map((supplier) => <MenuItem key={supplier.id} value={String(supplier.id)}>{supplier.legalName}</MenuItem>)}</TextField>
          <TextField label="Departamento" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} size="small" />
          <DateField label="Data inicial" value={fromDate} onChange={(event) => setFromDate(event.target.value)} size="small" InputLabelProps={{ shrink: true }} />
          <DateField label="Data final" value={toDate} onChange={(event) => setToDate(event.target.value)} size="small" InputLabelProps={{ shrink: true }} />
          <TextField label="Valor mínimo" type="number" value={minimumAmount} onChange={(event) => setMinimumAmount(event.target.value)} size="small" inputProps={{ min: 0, step: '0.01' }} />
          <TextField label="Valor máximo" type="number" value={maximumAmount} onChange={(event) => setMaximumAmount(event.target.value)} size="small" inputProps={{ min: 0, step: '0.01' }} />
        </section>
        <StandardTable audit="InternalExpense" ariaLabel="Relatório de despesas" columns={expenseColumns.slice(0, 8)} rows={filteredExpenses} loading={loading} emptyMessage="Não existem despesas para os critérios seleccionados." renderRow={(expense, index) => (
          <TableRow key={expense.id} hover><TableCell>{index}</TableCell><TableCell>{expense.reference}</TableCell><TableCell>{expense.title}</TableCell><TableCell>{formatDate(expense.expenseDate)}</TableCell><TableCell>{expense.requesterName}</TableCell><TableCell>{expense.department}</TableCell><TableCell>{expense.categoryName}</TableCell><TableCell>{money(expense.totalAmount, expense.currency)}</TableCell><TableCell><Chip size="small" label={labels[expense.approvalStatus]} className={`internal-expense-status ${statusClass(expense.approvalStatus)}`} /></TableCell></TableRow>
        )} />
      </section>
    );
  }

  return (
    <section className="cacoin-course-page cacoin-tasks-page internal-expenses-page">
      <header className="cacoin-page-heading">
        <div><p className="cacoin-eyebrow">Despesas Internas</p><h1>{page.title}</h1></div>
        <div className="internal-expense-heading-actions">
          <TextField className="internal-expense-search" label="Pesquisar" value={search} onChange={(event) => setSearch(event.target.value)} size="small" />
          {(page.mode === 'expenses' || page.mode === 'approvals') && <TextField select className="internal-expense-search" label="Estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} size="small"><MenuItem value="">Todos</MenuItem>{['DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED', 'REJECTED', 'CANCELLED', 'UNPAID', 'PARTIAL', 'PAID'].map((value) => <MenuItem key={value} value={value}>{labels[value]}</MenuItem>)}</TextField>}
          {page.mode === 'expenses' && <Button variant="contained" startIcon={<Plus size={17} />} onClick={openCreate}>Nova despesa</Button>}
        </div>
      </header>
      {(page.mode === 'expenses' || page.mode === 'approvals') && <section className="internal-expense-filter-grid">
        <TextField select label="Categoria" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} size="small"><MenuItem value="">Todas as categorias</MenuItem>{categories.map((category) => <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>)}</TextField>
        <TextField select label="Fornecedor" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} size="small"><MenuItem value="">Todos os fornecedores</MenuItem>{suppliers.map((supplier) => <MenuItem key={supplier.id} value={String(supplier.id)}>{supplier.legalName}</MenuItem>)}</TextField>
        <TextField label="Departamento" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} size="small" />
        <DateField label="Data inicial" value={fromDate} onChange={(event) => setFromDate(event.target.value)} size="small" InputLabelProps={{ shrink: true }} />
        <DateField label="Data final" value={toDate} onChange={(event) => setToDate(event.target.value)} size="small" InputLabelProps={{ shrink: true }} />
        <TextField label="Valor mínimo" type="number" value={minimumAmount} onChange={(event) => setMinimumAmount(event.target.value)} size="small" inputProps={{ min: 0, step: '0.01' }} />
        <TextField label="Valor máximo" type="number" value={maximumAmount} onChange={(event) => setMaximumAmount(event.target.value)} size="small" inputProps={{ min: 0, step: '0.01' }} />
      </section>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {page.mode === 'payments' ? (
        <>
          <section className="internal-expense-payment-eligible">
            <h2>Despesas aprovadas por pagar</h2>
            <StandardTable
              audit="InternalExpense"
              ariaLabel="Despesas aprovadas por pagar"
              columns={[{ key: 'reference', label: 'Referência' }, { key: 'title', label: 'Despesa' }, { key: 'supplier', label: 'Beneficiário' }, { key: 'approved', label: 'Aprovado' }, { key: 'paid', label: 'Pago' }, { key: 'balance', label: 'Saldo' }, { key: 'action', label: 'Ações', align: 'right' }]}
              rows={filteredExpenses}
              loading={loading}
              emptyMessage="Não existem despesas aprovadas com saldo por pagar."
              renderRow={(expense, index) => (
                <TableRow key={expense.id} hover><TableCell>{index}</TableCell><TableCell>{expense.reference}</TableCell><TableCell>{expense.title}</TableCell><TableCell>{expense.supplierName || expense.requesterName}</TableCell><TableCell>{money(expense.approvedAmount, expense.currency)}</TableCell><TableCell>{money(expense.paidAmount, expense.currency)}</TableCell><TableCell>{money(expense.balance, expense.currency)}</TableCell><TableCell align="right"><Button size="small" onClick={() => { setPaymentExpense(expense); setPaymentError(''); }}>Registar pagamento</Button></TableCell></TableRow>
              )}
            />
          </section>
          <section className="internal-expense-payment-eligible">
            <h2>Histórico de pagamentos</h2>
            <StandardTable audit="InternalExpensePayment" ariaLabel="Histórico de pagamentos de despesas" columns={paymentColumns} rows={payments} loading={loading} emptyMessage="Ainda não existem pagamentos registados." renderRow={(payment, index) => {
              const expense = expenses.find((item) => item.id === payment.expenseId);
              return <TableRow key={payment.id} hover><TableCell>{index}</TableCell><TableCell>{payment.reference}</TableCell><TableCell>{expense?.reference || '—'} · {expense?.title || '—'}</TableCell><TableCell>{formatDate(payment.paymentDate)}</TableCell><TableCell>{settings?.paymentMethods?.find((option) => option.code === payment.method)?.label || displayText(payment.method)}</TableCell><TableCell>{money(payment.amount, expense?.currency)}</TableCell><TableCell>{payment.recordedBy}</TableCell><TableCell><Chip size="small" label={payment.reversed ? 'Revertido' : 'Confirmado'} className={`internal-expense-status ${payment.reversed ? 'rejected' : 'paid'}`} /></TableCell><TableCell align="right">{!payment.reversed &&               <Tooltip title="Reverter pagamento"><IconButton aria-label={`Reverter ${payment.reference}`} onClick={() => { setReversing(payment); setReversalReason(''); }}><RotateCcw size={17} /></IconButton></Tooltip>}</TableCell></TableRow>;
            }} />
          </section>
        </>
      ) : (
        <StandardTable
          audit="InternalExpense"
          ariaLabel={page.title}
          columns={expenseColumns}
          rows={filteredExpenses}
          loading={loading}
          emptyMessage={page.mode === 'approvals' ? 'Não existem aprovações pendentes.' : 'Não existem despesas para os critérios seleccionados.'}
          renderRow={(expense, index) => (
            <TableRow key={expense.id} hover>
              <TableCell>{index}</TableCell>              <TableCell>{expense.reference}</TableCell><TableCell>{expense.title}<span className="internal-expense-subline">{settings?.expenseTypes?.find((option) => option.code === expense.type)?.label || labels[expense.type] || expense.type}</span></TableCell><TableCell>{formatDate(expense.expenseDate)}</TableCell><TableCell>{expense.requesterName}</TableCell><TableCell>{expense.department}</TableCell><TableCell>{expense.categoryName}</TableCell><TableCell>{money(expense.totalAmount, expense.currency)}</TableCell>
              <TableCell><Chip size="small" label={labels[expense.approvalStatus] || expense.approvalStatus} className={`internal-expense-status ${statusClass(expense.approvalStatus)}`} /></TableCell><TableCell><Chip size="small" label={labels[expense.paymentStatus] || expense.paymentStatus} className={`internal-expense-status ${statusClass(expense.paymentStatus)}`} /></TableCell>
              <TableCell align="right"><Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                <Tooltip title="Ver histórico"><IconButton aria-label={`Ver histórico ${expense.reference}`} onClick={() => openDetails(expense)}><Eye size={17} /></IconButton></Tooltip>
                {['DRAFT', 'RETURNED'].includes(expense.approvalStatus) && <><Tooltip title="Editar rascunho"><IconButton aria-label={`Editar ${expense.reference}`} onClick={() => openEdit(expense)}><Pencil size={17} /></IconButton></Tooltip><Tooltip title="Submeter"><IconButton aria-label={`Submeter ${expense.reference}`} onClick={() => submitDraft(expense)}><Send size={17} /></IconButton></Tooltip></>}
                {page.mode === 'approvals' && <><Tooltip title="Aprovar"><IconButton aria-label={`Aprovar ${expense.reference}`} onClick={() => { setDecision({ expense, action: 'APPROVED' }); setDecisionComment(''); }}><Check size={17} /></IconButton></Tooltip><Tooltip title="Devolver para correcção"><IconButton aria-label={`Devolver ${expense.reference}`} onClick={() => { setDecision({ expense, action: 'RETURNED' }); setDecisionComment(''); }}><RotateCcw size={17} /></IconButton></Tooltip><Tooltip title="Rejeitar"><IconButton aria-label={`Rejeitar ${expense.reference}`} onClick={() => { setDecision({ expense, action: 'REJECTED' }); setDecisionComment(''); }}><X size={17} /></IconButton></Tooltip></>}
                {expense.approvalStatus !== 'CANCELLED' && expense.paymentStatus === 'UNPAID' && <Tooltip title="Cancelar com motivo"><IconButton aria-label={`Cancelar ${expense.reference}`} onClick={() => cancelDraft(expense)}><X size={17} /></IconButton></Tooltip>}
              </Stack></TableCell>
            </TableRow>
          )}
        />
      )}

      <ExpenseFormDialog open={formOpen} expense={editing} categories={categories} suppliers={suppliers} settings={settings} saving={saving} error={error} onClose={() => setFormOpen(false)} onSave={saveExpense} />
      <ExpensePaymentDialog open={Boolean(paymentExpense)} expense={paymentExpense} settings={settings} saving={saving} error={paymentError} onClose={() => setPaymentExpense(null)} onSave={savePayment} />
      <Dialog open={Boolean(decision)} onClose={() => setDecision(null)} fullWidth maxWidth="sm">
        <DialogTitle>{decision?.action === 'APPROVED' ? 'Aprovar despesa' : decision?.action === 'RETURNED' ? 'Devolver para correcção' : 'Rejeitar despesa'}</DialogTitle>
        <DialogContent>{decision && <p>{decision.expense.reference} · {decision.expense.title}</p>}{decision?.action !== 'APPROVED' && <TextField fullWidth autoFocus label="Motivo" value={decisionComment} onChange={(event) => setDecisionComment(event.target.value)} required multiline minRows={3} />}</DialogContent>
        <DialogActions><Button onClick={() => setDecision(null)} disabled={saving}>Cancelar</Button><Button onClick={saveDecision} disabled={saving || (decision?.action !== 'APPROVED' && !decisionComment.trim())}>Confirmar</Button></DialogActions>
      </Dialog>
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="md">
        <DialogTitle>{detail?.reference} · {detail?.title}</DialogTitle>
        <DialogContent>
          {detail && <div className="internal-expense-detail-grid">
            <span>Justificação</span><strong>{detail.description}</strong>
            <span>Solicitante</span><strong>{detail.requesterName}</strong>
            <span>Departamento</span><strong>{detail.department}</strong>
            <span>Categoria / fornecedor</span><strong>{detail.categoryName} · {detail.supplierName || '—'}</strong>
            <span>Total / aprovado / pago</span><strong>{money(detail.totalAmount, detail.currency)} / {money(detail.approvedAmount, detail.currency)} / {money(detail.paidAmount, detail.currency)}</strong>
            <span>Estado</span><strong>{labels[detail.approvalStatus]} · {labels[detail.paymentStatus]}</strong>
            <span>Decisão</span><strong>{detail.lastDecisionBy || '—'} · {detail.lastDecisionComment || '—'}</strong>
          </div>}
          <h3>Histórico</h3>
          <ul className="internal-expense-audit-list">{detailAudit.map((item) => <li key={item.id}><strong>{item.action}</strong><span>{item.actor} · {formatDateTime(item.createdAt)}</span>{item.reason && <p>{item.reason}</p>}</li>)}</ul>
        </DialogContent>
        <DialogActions><Button onClick={() => setDetail(null)}>Fechar</Button></DialogActions>
      </Dialog>
      <Dialog open={Boolean(reversing)} onClose={() => setReversing(null)} fullWidth maxWidth="xs">
        <DialogTitle>Reverter pagamento</DialogTitle>
        <DialogContent><p>{reversing?.reference} · {money(reversing?.amount)}</p><TextField fullWidth autoFocus label="Motivo da reversão" value={reversalReason} onChange={(event) => setReversalReason(event.target.value)} required /></DialogContent>
        <DialogActions><Button onClick={() => setReversing(null)}>Cancelar</Button><Button onClick={async () => {
          if (!reversalReason.trim()) return;
          if (await reversePayment(reversing, reversalReason)) {
            setReversing(null);
            setReversalReason('');
          }
        }}>Reverter</Button></DialogActions>
      </Dialog>
    </section>
  );
}
