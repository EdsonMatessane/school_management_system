import { systemDate } from '../../utils/systemDate';
import useReceiptNumber from '../../utils/useReceiptNumber';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
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
  TextField,
  Tooltip,
} from '@mui/material';
import { Eye, ReceiptText, WalletCards } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import ReceiptView from '../../components/ReceiptView';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import {
  getPaymentMethods,
  getStudentFeeCharges,
  recordStudentFeeBatchPayment,
} from '../../services/api';
import Money from '../../components/Money';
import { toDisplayDate } from '../../utils/date';
import { formatMoney as money } from '../../utils/money';
import { methodLabel } from '../../utils/paymentMethods';
import { filterBySearch } from '../../utils/search';
import DateField from '../../components/DateField';

const statusLabels = {
  PENDING: 'Pendente',
  OVERDUE: 'Em atraso',
  PAID: 'Pago',
};
const today = () => {
  const date = systemDate();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};
const displayValue = (value) => value == null || value === '' ? '—' : value;
const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.'
);

const statusChipColors = { PENDING: 'warning', OVERDUE: 'error', PAID: 'success' };
const receiptStatusLabels = { PENDING: 'Pendente', OVERDUE: 'Em atraso', PAID: 'Pago' };

// Cada mensalidade é independente: o recibo refere-se apenas a esse mês.
const buildMonthlyReceipt = (charge) => ({
  filename: `recibo-mensalidade-${charge.studentCode}-${String(charge.periodLabel).replace('/', '-')}`,
  title: 'Recibo de Mensalidade',
  number: '',
  issueDate: toDisplayDate(today()),
  status: receiptStatusLabels[charge.status],
  sections: [
    {
      title: 'Dados do Estudante',
      rows: [
        ['Código', charge.studentCode],
        ['Nome', charge.studentName],
        ['Telefone', charge.phone],
        ['Email', charge.email],
      ],
    },
    {
      title: 'Dados do Curso',
      rows: [
        ['Curso', charge.courseName],
        ['Categoria', charge.categoryName],
        ['Nível', charge.levelName],
        ['Modalidade', charge.modalityName],
        ['Duração', charge.durationMonths ? `${charge.durationMonths} meses` : null],
        ['Data de Inscrição', toDisplayDate(charge.enrollmentDate)],
        ['Mês', charge.periodLabel],
      ],
    },
  ],
  columns: [
    { key: 'period', label: 'Mês' },
    { key: 'type', label: 'Tipo' },
    { key: 'amount', label: 'Valor', align: 'right' },
    { key: 'fine', label: 'Multa', align: 'right' },
    { key: 'paid', label: 'Pago', align: 'right' },
    { key: 'dueDate', label: 'Data limite' },
    { key: 'status', label: 'Estado' },
  ],
  items: [{
    period: charge.periodLabel,
    type: displayValue(charge.description),
    amount: money(charge.amount),
    fine: charge.fineAmount == null ? '—' : money(charge.fineAmount),
    paid: money(charge.paidAmount),
    dueDate: toDisplayDate(charge.dueDate) || '—',
    status: statusLabels[charge.status],
  }],
  totals: {
    period: 'Total',
    amount: money(charge.amount),
    fine: money(charge.fineAmount ?? 0),
    paid: money(charge.paidAmount),
  },
  payments: (charge.payments ?? [])
    .map((entry) => ({
      sortDate: entry.paymentDate,
      id: entry.id,
      date: toDisplayDate(entry.paymentDate),
      description: `Mensalidade ${charge.periodLabel}`,
      method: methodLabel(entry.method),
      reference: displayValue(entry.reference),
      amount: money(entry.amount),
    }))
    .sort((left, right) => (
      String(left.sortDate).localeCompare(String(right.sortDate)) || left.id - right.id
    )),
});

export default function StudentFeesManagement({ status, successMessage }) {
  const [charges, setCharges] = useState([]);
  const [methods, setMethods] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [viewEnrollmentId, setViewEnrollmentId] = useState(null);
  const [receiptCharge, setReceiptCharge] = useState(null);
  const [payCharge, setPayCharge] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payment, setPayment] = useState({
    paymentDate: today(),
    method: '',
    reference: '',
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    Promise.all([getStudentFeeCharges('MONTHLY'), getPaymentMethods()])
      .then(([loadedCharges, loadedMethods]) => {
        if (!mounted) return;
        setCharges(loadedCharges);
        setMethods(loadedMethods.filter((method) => method.active));
      })
      .catch((loadError) => {
        if (mounted) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Uma linha por estudante (inscrição) com o resumo do seu plano de mensalidades.
  const plans = useMemo(() => {
    const byEnrollment = new Map();
    charges.forEach((charge) => {
      if (!byEnrollment.has(charge.enrollmentId)) byEnrollment.set(charge.enrollmentId, []);
      byEnrollment.get(charge.enrollmentId).push(charge);
    });
    return [...byEnrollment.values()]
      .map((plan) => {
        const first = plan[0];
        return {
          enrollmentId: first.enrollmentId,
          studentCode: first.studentCode,
          studentName: first.studentName,
          courseName: first.courseName,
          description: first.description,
          monthlyAmount: first.amount,
          charges: plan,
          status: plan.every((item) => item.status === 'PAID')
            ? 'PAID'
            : plan.some((item) => item.status === 'OVERDUE') ? 'OVERDUE' : 'PENDING',
          paidMonths: plan.filter((item) => item.status === 'PAID').length,
          totalMonths: plan.length,
          total: plan.reduce(
            (sum, item) => sum + Number(item.amount) + Number(item.fineAmount ?? 0), 0,
          ),
          paid: plan.reduce((sum, item) => sum + Number(item.paidAmount), 0),
          nextCharge: plan.find((item) => Number(item.balance) > 0) ?? null,
        };
      })
      .sort((left, right) => (
        String(left.studentCode).localeCompare(String(right.studentCode))
        || left.enrollmentId - right.enrollmentId
      ));
  }, [charges]);

  const visiblePlans = useMemo(() => filterBySearch(
    plans.filter((plan) => plan.status === status),
    searchTerm,
    (plan) => [
      plan.studentCode,
      plan.studentName,
      plan.courseName,
      plan.description,
      plan.nextCharge?.periodLabel,
      toDisplayDate(plan.nextCharge?.dueDate),
    ],
  ), [plans, searchTerm, status]);

  const title = `Mensalidades — ${statusLabels[status]}`;
  const exportColumns = [
    { key: 'studentCode', label: 'Código do Estudante' },
    { key: 'studentName', label: 'Estudante' },
    { key: 'courseName', label: 'Curso' },
    { key: 'description', label: 'Tipo de Mensalidade' },
    { key: 'monthlyAmount', label: 'Mensalidade' },
    { key: 'months', label: 'Meses pagos' },
    { key: 'total', label: 'Total' },
    { key: 'paid', label: 'Pago' },
    { key: 'nextPeriod', label: 'Próxima mensalidade' },
    { key: 'dueDate', label: 'Data limite' },
  ];
  const exportRows = visiblePlans.map((plan) => ({
    studentCode: plan.studentCode,
    studentName: plan.studentName,
    courseName: plan.courseName,
    description: plan.description,
    monthlyAmount: money(plan.monthlyAmount),
    months: `${plan.paidMonths}/${plan.totalMonths}`,
    total: money(plan.total),
    paid: money(plan.paid),
    nextPeriod: plan.nextCharge?.periodLabel ?? '—',
    dueDate: toDisplayDate(plan.nextCharge?.dueDate) || '—',
  }));

  const viewPlan = plans.find((plan) => plan.enrollmentId === viewEnrollmentId) ?? null;
  const receiptNumber = useReceiptNumber('MONTHLY', receiptCharge?.id);
  const receiptData = useMemo(
    () => {
      if (!receiptCharge) return null;
      // Actualiza o recibo com os dados mais recentes do mês.
      return {
        ...buildMonthlyReceipt(
          charges.find((item) => item.id === receiptCharge.id) ?? receiptCharge,
        ),
        number: receiptNumber,
      };
    },
    [receiptCharge, charges, receiptNumber],
  );
  const planColumns = [
    { key: 'periodLabel', label: 'Período' },
    { key: 'description', label: 'Tipo de Mensalidade' },
    { key: 'amount', label: 'Valor' },
    { key: 'fine', label: 'Multa' },
    { key: 'paidAmount', label: 'Pago' },
    { key: 'dueDate', label: 'Data limite' },
    { key: 'status', label: 'Estado' },
  ];
  const planRows = (viewPlan?.charges ?? []).map((charge) => ({
    periodLabel: charge.periodLabel,
    description: charge.description,
    amount: money(charge.amount),
    fine: charge.fineAmount == null ? '—' : money(charge.fineAmount),
    paidAmount: money(charge.paidAmount),
    dueDate: toDisplayDate(charge.dueDate),
    status: statusLabels[charge.status],
  }));

  const openPaymentDialog = (charge) => {
    setError('');
    setPayCharge(charge);
    // Valor preenchido automaticamente com o saldo do mês.
    setPayAmount(String(charge.balance));
    setPayment({ paymentDate: today(), method: methods[0]?.name ?? '', reference: '' });
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!payCharge) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(payCharge.balance)) {
      setError('O valor deve ser maior que zero e não exceder o saldo da mensalidade.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await recordStudentFeeBatchPayment({
        payments: [{ chargeId: payCharge.id, amount }],
        ...payment,
      });
      setCharges(await getStudentFeeCharges('MONTHLY'));
      setNotice(`O pagamento da mensalidade ${payCharge.periodLabel} foi registado.`);
      setPayCharge(null);
    } catch (paymentError) {
      setError(errorMessage(paymentError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>{statusLabels[status]}</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename={`estudantes-mensalidades-${status.toLowerCase()}`}
            title={title}
            disabled={loading}
            onError={(exportError) => setError(errorMessage(exportError))}
          />
        </div>
      </header>
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}
      {error && !payCharge && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <StandardTable
        audit={(row) => ({ entity: 'StudentEnrollment', id: row.enrollmentId })}
        ariaLabel={title}
        columns={[
          { key: 'code', label: 'Código' },
          { key: 'student', label: 'Estudante' },
          { key: 'course', label: 'Curso' },
          { key: 'description', label: 'Tipo de Mensalidade' },
          { key: 'monthly', label: 'Mensalidade' },
          { key: 'months', label: 'Meses pagos' },
          { key: 'total', label: 'Total' },
          { key: 'paid', label: 'Pago' },
          { key: 'next', label: 'Próxima mensalidade' },
          { key: 'dueDate', label: 'Data limite' },
          { key: 'actions', label: 'Acções', align: 'right' },
        ]}
        emptyMessage={error
          ? 'Não foi possível carregar as mensalidades.'
          : searchTerm.trim()
            ? 'Nenhum estudante corresponde à pesquisa.'
            : `Não existem estudantes com mensalidades "${statusLabels[status]}".`}
        loading={loading}
        rows={visiblePlans}
        renderRow={(plan, rowNumber) => (
          <TableRow key={plan.enrollmentId} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{plan.studentCode}</TableCell>
            <TableCell>{displayValue(plan.studentName)}</TableCell>
            <TableCell>{displayValue(plan.courseName)}</TableCell>
            <TableCell>{displayValue(plan.description)}</TableCell>
            <TableCell><Money value={plan.monthlyAmount} /></TableCell>
            <TableCell>{plan.paidMonths}/{plan.totalMonths}</TableCell>
            <TableCell><Money value={plan.total} /></TableCell>
            <TableCell><Money value={plan.paid} /></TableCell>
            <TableCell>{plan.nextCharge?.periodLabel ?? '—'}</TableCell>
            <TableCell>{toDisplayDate(plan.nextCharge?.dueDate) || '—'}</TableCell>
            <TableCell align="right">
              <Tooltip title="Ver pagamentos">
                <IconButton
                  aria-label={`Ver pagamentos de ${plan.studentCode}`}
                  onClick={() => setViewEnrollmentId(plan.enrollmentId)}
                >
                  <Eye size={17} />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog
        open={Boolean(viewPlan)}
        onClose={() => setViewEnrollmentId(null)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          Pagamentos — {viewPlan?.studentCode}
          {viewPlan?.studentName ? ` · ${viewPlan.studentName}` : ''}
        </DialogTitle>
        <DialogContent>
          {error && !payCharge && (
            <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {viewPlan && (
            <Box sx={{ pt: 1 }}>
              <StandardTable
                audit="StudentFeeCharge"
                ariaLabel={`Mensalidades de ${viewPlan.studentCode}`}
                columns={[
                  { key: 'code', label: 'Código' },
                  { key: 'student', label: 'Estudante' },
                  { key: 'course', label: 'Curso' },
                  { key: 'period', label: 'Período' },
                  { key: 'description', label: 'Tipo de Mensalidade' },
                  { key: 'amount', label: 'Valor' },
                  { key: 'fine', label: 'Multa' },
                  { key: 'paid', label: 'Pago' },
                  { key: 'dueDate', label: 'Data limite' },
                  { key: 'status', label: 'Estado' },
                  { key: 'actions', label: 'Acções', align: 'right' },
                ]}
                emptyMessage="Este estudante não tem mensalidades."
                rows={viewPlan.charges}
                renderRow={(charge, rowNumber) => (
                  <TableRow key={charge.id} hover>
                    <TableCell>{rowNumber}</TableCell>
                    <TableCell>{charge.studentCode}</TableCell>
                    <TableCell>{displayValue(charge.studentName)}</TableCell>
                    <TableCell>{displayValue(charge.courseName)}</TableCell>
                    <TableCell>{displayValue(charge.periodLabel)}</TableCell>
                    <TableCell>{displayValue(charge.description)}</TableCell>
                    <TableCell><Money value={charge.amount} /></TableCell>
                    <TableCell>
                      {charge.fineAmount == null
                        ? '—'
                        : <Money value={charge.fineAmount} />}
                    </TableCell>
                    <TableCell><Money value={charge.paidAmount} /></TableCell>
                    <TableCell>{toDisplayDate(charge.dueDate) || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={statusChipColors[charge.status]}
                        label={statusLabels[charge.status]}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                        <Tooltip title="Ver recibo do mês">
                          <IconButton
                            aria-label={`Ver recibo de ${charge.periodLabel}`}
                            onClick={() => setReceiptCharge(charge)}
                          >
                            <ReceiptText size={17} />
                          </IconButton>
                        </Tooltip>
                        {charge.status !== 'PAID' && (
                          <Tooltip title="Registar pagamento do mês">
                            <IconButton
                              aria-label={`Registar pagamento de ${charge.periodLabel}`}
                              onClick={() => openPaymentDialog(charge)}
                            >
                              <WalletCards size={17} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {viewPlan && (
            <DataExportMenu
              columns={planColumns}
              rows={planRows}
              filename={`mensalidades-${viewPlan.studentCode}`}
              title={`Mensalidades — ${viewPlan.studentCode} ${viewPlan.studentName ?? ''}`.trim()}
              onError={(exportError) => setError(errorMessage(exportError))}
            />
          )}
          <Button onClick={() => setViewEnrollmentId(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(receiptData)}
        onClose={() => setReceiptCharge(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Recibo de mensalidade — {receiptCharge?.studentCode} · {receiptCharge?.periodLabel}
        </DialogTitle>
        <DialogContent>
          {receiptData && (
            <Box sx={{ pt: 1 }}>
              <ReceiptView receipt={receiptData} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {receiptData && (
            <DataExportMenu
              columns={receiptData.columns.map(({ key, label }) => ({ key, label }))}
              rows={receiptData.items}
              filename={receiptData.filename}
              title={`${receiptData.title} ${receiptData.number} — ${receiptCharge.studentCode}`}
              onExportPdf={async () => {
                const exporters = await import('../../utils/dataExport');
                exporters.exportReceiptToPdf(receiptData);
              }}
              onError={(exportError) => setError(errorMessage(exportError))}
            />
          )}
          <Button onClick={() => setReceiptCharge(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(payCharge)}
        onClose={() => {
          if (!saving) setPayCharge(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={submitPayment}>
          <DialogTitle>
            Pagamento da mensalidade {payCharge?.periodLabel} — {payCharge?.studentCode}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <Alert severity="info">
                {payCharge?.studentName} · {payCharge?.courseName}
              </Alert>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                  gap: 1.5,
                }}
              >
                <TextField
                  size="small"
                  label="Mês"
                  value={payCharge?.periodLabel ?? ''}
                  slotProps={{ input: { readOnly: true } }}
                />
                <TextField
                  size="small"
                  label="Tipo de Mensalidade"
                  value={payCharge?.description ?? ''}
                  slotProps={{ input: { readOnly: true } }}
                />
                <TextField
                  required
                  size="small"
                  type="number"
                  label="Valor a pagar"
                  value={payAmount}
                  onChange={(event) => setPayAmount(event.target.value)}
                  slotProps={{
                    htmlInput: { min: 0.01, max: payCharge?.balance, step: 0.01 },
                  }}
                  helperText={payCharge
                    ? `Valor: ${money(payCharge.amount)} · Saldo: ${money(payCharge.balance)}`
                    : undefined}
                />
                <DateField
                  required
                  size="small"
                  label="Data do pagamento"
                  value={payment.paymentDate}
                  onChange={(event) => setPayment((current) => ({
                    ...current,
                    paymentDate: event.target.value,
                  }))}
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { max: today() },
                  }}
                />
                <TextField
                  select
                  required
                  size="small"
                  label="Método de pagamento"
                  value={payment.method}
                  onChange={(event) => setPayment((current) => ({
                    ...current,
                    method: event.target.value,
                  }))}
                >
                  {methods.map((option) => (
                    <MenuItem key={option.id} value={option.name}>
                      {option.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label="Referência / observação"
                  value={payment.reference}
                  onChange={(event) => setPayment((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={() => setPayCharge(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'A guardar…' : 'Guardar pagamento'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </section>
  );
}
