import { systemDate } from '../../utils/systemDate';
import useReceiptNumber from '../../utils/useReceiptNumber';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { Eye, WalletCards } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import ReceiptView from '../../components/ReceiptView';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import {
  getPaymentMethods,
  getStudentEnrollmentPayments,
  recordStudentFeeBatchPayment,
} from '../../services/api';
import { methodLabel } from '../../utils/paymentMethods';
import Money from '../../components/Money';
import { toDisplayDate } from '../../utils/date';
import { formatMoney as money } from '../../utils/money';
import { filterBySearch } from '../../utils/search';
import DateField from '../../components/DateField';

const statusLabels = {
  PENDING: 'Pendente',
  PAID: 'Pago',
};
// Ordem fixa do primeiro pagamento: primeira mensalidade, taxa de inscrição e manual.
const itemDefinitions = [
  { key: 'firstMonthly', label: 'Primeira Mensalidade', typeLabel: 'Tipo de Mensalidade' },
  { key: 'enrollmentFee', label: 'Taxa de Inscrição', typeLabel: 'Tipo de Taxa de Inscrição' },
  { key: 'manualFee', label: 'Valor do Manual', typeLabel: 'Tipo de Valor do Manual' },
];
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
const itemsOf = (enrollment) => itemDefinitions
  .map((definition) => ({ ...definition, item: enrollment[definition.key] }))
  .filter(({ item }) => item);
const openItemsOf = (enrollment) => itemsOf(enrollment)
  .filter(({ item }) => Number(item.balance) > 0);

const buildReceipt = (enrollment) => {
  const entries = itemsOf(enrollment);
  return {
    filename: `recibo-inscricao-${enrollment.studentCode}`,
    title: 'Recibo de Inscrição',
    number: '',
    issueDate: toDisplayDate(today()),
    status: enrollment.status === 'PAID' ? 'Pago' : 'Pendente',
    sections: [
      {
        title: 'Dados do Estudante',
        rows: [
          ['Código', enrollment.studentCode],
          ['Nome', enrollment.studentName],
          ['Telefone', enrollment.phone],
          ['Email', enrollment.email],
        ],
      },
      {
        title: 'Dados do Curso',
        rows: [
          ['Curso', enrollment.courseName],
          ['Categoria', enrollment.categoryName],
          ['Nível', enrollment.levelName],
          ['Modalidade', enrollment.modalityName],
          ['Data de Inscrição', toDisplayDate(enrollment.enrollmentDate)],
        ],
      },
    ],
    columns: [
      { key: 'description', label: 'Descrição' },
      { key: 'type', label: 'Tipo' },
      { key: 'amount', label: 'Valor', align: 'right' },
      { key: 'paid', label: 'Pago', align: 'right' },
      { key: 'balance', label: 'Saldo', align: 'right' },
    ],
    items: entries.map(({ label, item }) => ({
      description: label,
      type: displayValue(item.type),
      amount: money(item.amount),
      paid: money(item.paidAmount),
      balance: money(item.balance),
    })),
    totals: {
      description: 'Total',
      amount: money(enrollment.totalAmount),
      paid: money(enrollment.paidAmount),
      balance: money(enrollment.balance),
    },
    payments: entries
      .flatMap(({ label, item }) => (item.payments ?? []).map((paid) => ({
        sortDate: paid.paymentDate,
        id: paid.id,
        date: toDisplayDate(paid.paymentDate),
        description: label,
        method: methodLabel(paid.method),
        reference: displayValue(paid.reference),
        amount: money(paid.amount),
      })))
      .sort((left, right) => (
        String(left.sortDate).localeCompare(String(right.sortDate)) || left.id - right.id
      )),
  };
};

export default function StudentEnrollmentPayments({ status, successMessage }) {
  const [enrollments, setEnrollments] = useState([]);
  const [methods, setMethods] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [viewEnrollment, setViewEnrollment] = useState(null);
  const [payEnrollment, setPayEnrollment] = useState(null);
  const [paymentMode, setPaymentMode] = useState('EACH');
  const [selectedItemKey, setSelectedItemKey] = useState('');
  const [amounts, setAmounts] = useState({});
  const [payment, setPayment] = useState({
    paymentDate: today(),
    method: '',
    reference: '',
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    Promise.all([getStudentEnrollmentPayments(), getPaymentMethods()])
      .then(([loaded, loadedMethods]) => {
        if (!mounted) return;
        setEnrollments(loaded);
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

  const visibleEnrollments = useMemo(() => {
    const matchesStatus = enrollments.filter((enrollment) => enrollment.status === status);
    return filterBySearch(matchesStatus, searchTerm, (enrollment) => [
      enrollment.studentCode,
      enrollment.studentName,
      enrollment.courseName,
      toDisplayDate(enrollment.enrollmentDate),
      enrollment.firstMonthly?.type,
      enrollment.enrollmentFee?.type,
      enrollment.manualFee?.type,
    ]);
  }, [enrollments, searchTerm, status]);

  const receiptNumber = useReceiptNumber('ENROLLMENT', viewEnrollment?.enrollmentId);
  const receipt = useMemo(
    () => (viewEnrollment ? { ...buildReceipt(viewEnrollment), number: receiptNumber } : null),
    [viewEnrollment, receiptNumber],
  );
  const title = `Inscrição — ${statusLabels[status]}`;
  const exportColumns = [
    { key: 'studentCode', label: 'Código do Estudante' },
    { key: 'studentName', label: 'Estudante' },
    { key: 'courseName', label: 'Curso' },
    { key: 'enrollmentDate', label: 'Data de Inscrição' },
    { key: 'monthlyType', label: 'Tipo de Mensalidade' },
    { key: 'firstMonthly', label: 'Primeira Mensalidade' },
    { key: 'enrollmentType', label: 'Tipo de Taxa de Inscrição' },
    { key: 'enrollmentFee', label: 'Taxa de Inscrição' },
    { key: 'manualType', label: 'Tipo de Valor do Manual' },
    { key: 'manualFee', label: 'Valor do Manual' },
    { key: 'totalAmount', label: 'Total' },
    { key: 'paidAmount', label: 'Pago' },
  ];
  const exportRows = visibleEnrollments.map((enrollment) => ({
    studentCode: enrollment.studentCode,
    studentName: enrollment.studentName,
    courseName: enrollment.courseName,
    enrollmentDate: toDisplayDate(enrollment.enrollmentDate),
    monthlyType: enrollment.firstMonthly?.type,
    firstMonthly: money(enrollment.firstMonthly?.amount),
    enrollmentType: enrollment.enrollmentFee?.type,
    enrollmentFee: money(enrollment.enrollmentFee?.amount),
    manualType: enrollment.manualFee?.type,
    manualFee: money(enrollment.manualFee?.amount),
    totalAmount: money(enrollment.totalAmount),
    paidAmount: money(enrollment.paidAmount),
  }));

  const openItems = payEnrollment ? openItemsOf(payEnrollment) : [];
  const selectedOpenItem = openItems.find(({ key }) => key === selectedItemKey);
  const amountBeingPaid = paymentMode === 'ALL'
    ? openItems.reduce((total, { item }) => total + Number(amounts[item.chargeId] || 0), 0)
    : Number(amounts[selectedOpenItem?.item.chargeId] || 0);

  const openPaymentDialog = (enrollment) => {
    const open = openItemsOf(enrollment);
    if (!open.length) return;
    setError('');
    setPayEnrollment(enrollment);
    setPaymentMode('ALL');
    setSelectedItemKey(open[0].key);
    // Valor preenchido automaticamente com o saldo de cada item.
    setAmounts(Object.fromEntries(open.map(({ item }) => [item.chargeId, String(item.balance)])));
    setPayment({ paymentDate: today(), method: methods[0]?.name ?? '', reference: '' });
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!payEnrollment) return;
    const toPay = paymentMode === 'ALL'
      ? openItems
      : openItems.filter(({ key }) => key === selectedItemKey);
    const lines = toPay.map(({ item }) => ({
      chargeId: item.chargeId,
      amount: Number(amounts[item.chargeId]),
      balance: Number(item.balance),
    }));
    if (!lines.length || lines.some(({ amount, balance }) => (
      !Number.isFinite(amount) || amount <= 0 || amount > balance
    ))) {
      setError('Verifique que cada valor é maior que zero e não excede o respectivo saldo.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await recordStudentFeeBatchPayment({
        payments: lines.map(({ chargeId, amount }) => ({ chargeId, amount })),
        ...payment,
      });
      setEnrollments(await getStudentEnrollmentPayments());
      setPayEnrollment(null);
      setNotice(paymentMode === 'ALL'
        ? `Foram registados pagamentos para ${lines.length} item(ns) da inscrição.`
        : 'O pagamento foi registado.');
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
            filename={`estudantes-inscricao-${status.toLowerCase()}`}
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
      {error && (
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
          { key: 'date', label: 'Data de Inscrição' },
          { key: 'firstMonthly', label: 'Primeira Mensalidade' },
          { key: 'enrollmentFee', label: 'Taxa de Inscrição' },
          { key: 'manualFee', label: 'Valor do Manual' },
          { key: 'total', label: 'Total' },
          { key: 'paid', label: 'Pago' },
          { key: 'actions', label: 'Acções', align: 'right' },
        ]}
        emptyMessage={error
          ? 'Não foi possível carregar as inscrições.'
          : searchTerm.trim()
            ? 'Nenhuma inscrição corresponde à pesquisa.'
            : `Não existem inscrições com estado "${statusLabels[status]}".`}
        loading={loading}
        rows={visibleEnrollments}
        renderRow={(enrollment, rowNumber) => (
          <TableRow key={enrollment.enrollmentId} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{enrollment.studentCode}</TableCell>
            <TableCell>{displayValue(enrollment.studentName)}</TableCell>
            <TableCell>{displayValue(enrollment.courseName)}</TableCell>
            <TableCell>{toDisplayDate(enrollment.enrollmentDate) || '—'}</TableCell>
            <TableCell><Money value={enrollment.firstMonthly?.amount} /></TableCell>
            <TableCell><Money value={enrollment.enrollmentFee?.amount} /></TableCell>
            <TableCell><Money value={enrollment.manualFee?.amount} /></TableCell>
            <TableCell><Money value={enrollment.totalAmount} /></TableCell>
            <TableCell><Money value={enrollment.paidAmount} /></TableCell>
            <TableCell align="right">
              <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                <Tooltip title="Ver detalhes">
                  <IconButton
                    aria-label={`Ver detalhes de ${enrollment.studentCode}`}
                    onClick={() => setViewEnrollment(enrollment)}
                  >
                    <Eye size={17} />
                  </IconButton>
                </Tooltip>
                {enrollment.status !== 'PAID' && (
                  <Tooltip title="Registar pagamento">
                    <IconButton
                      aria-label={`Registar pagamento de ${enrollment.studentCode}`}
                      onClick={() => openPaymentDialog(enrollment)}
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

      <Dialog
        open={Boolean(viewEnrollment)}
        onClose={() => setViewEnrollment(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Recibo de inscrição — {viewEnrollment?.studentCode}</DialogTitle>
        <DialogContent>
          {receipt && (
            <Box sx={{ pt: 1 }}>
              <ReceiptView receipt={receipt} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {receipt && (
            <DataExportMenu
              columns={receipt.columns.map(({ key, label }) => ({ key, label }))}
              rows={receipt.items}
              filename={receipt.filename}
              title={`${receipt.title} ${receipt.number} — ${viewEnrollment.studentCode}`}
              onExportPdf={async () => {
                const exporters = await import('../../utils/dataExport');
                exporters.exportReceiptToPdf(receipt);
              }}
              onError={(exportError) => setError(errorMessage(exportError))}
            />
          )}
          <Button onClick={() => setViewEnrollment(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(payEnrollment)}
        onClose={() => {
          if (!saving) setPayEnrollment(null);
        }}
        fullWidth
        maxWidth="md"
      >
        <form onSubmit={submitPayment}>
          <DialogTitle>
            Pagamento da inscrição — {payEnrollment?.studentCode}
            {payEnrollment?.studentName ? ` · ${payEnrollment.studentName}` : ''}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Alert severity="info">
                {payEnrollment?.courseName}
                {' · Inscrito em '}{toDisplayDate(payEnrollment?.enrollmentDate)}
                {' · Total pendente: '}{money(payEnrollment?.balance)}
              </Alert>
              <FormControl>
                <FormLabel>O que pretende pagar?</FormLabel>
                <RadioGroup
                  row
                  value={paymentMode}
                  onChange={(event) => setPaymentMode(event.target.value)}
                >
                  <FormControlLabel value="ALL" control={<Radio size="small" />} label="Todos" />
                  <FormControlLabel value="EACH" control={<Radio size="small" />} label="Cada" />
                </RadioGroup>
              </FormControl>
              {paymentMode === 'EACH' ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                    gap: 1.5,
                  }}
                >
                  <TextField
                    select
                    required
                    size="small"
                    label="Pagamento"
                    value={selectedItemKey}
                    onChange={(event) => setSelectedItemKey(event.target.value)}
                  >
                    {openItems.map(({ key, label }) => (
                      <MenuItem key={key} value={key}>{label}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    label={selectedOpenItem?.typeLabel ?? 'Tipo'}
                    value={selectedOpenItem?.item.type ?? ''}
                    slotProps={{ input: { readOnly: true } }}
                  />
                  <TextField
                    required
                    size="small"
                    type="number"
                    label="Valor a pagar"
                    value={amounts[selectedOpenItem?.item.chargeId] ?? ''}
                    onChange={(event) => setAmounts((current) => ({
                      ...current,
                      [selectedOpenItem.item.chargeId]: event.target.value,
                    }))}
                    slotProps={{
                      htmlInput: {
                        min: 0.01,
                        max: selectedOpenItem?.item.balance,
                        step: 0.01,
                      },
                    }}
                    helperText={selectedOpenItem
                      ? `Valor: ${money(selectedOpenItem.item.amount)} · Saldo: ${money(selectedOpenItem.item.balance)}`
                      : undefined}
                  />
                </Box>
              ) : (
                <>
                  {openItems.map(({ key, label, typeLabel, item }) => (
                    <Box
                      key={key}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                        gap: 1.5,
                      }}
                    >
                      <TextField
                        size="small"
                        label={typeLabel}
                        value={displayValue(item.type)}
                        slotProps={{ input: { readOnly: true } }}
                      />
                      <TextField
                        size="small"
                        label={label}
                        value={money(item.balance)}
                        slotProps={{ input: { readOnly: true } }}
                      />
                    </Box>
                  ))}
                  <Alert severity="success">
                    Total a pagar: {money(openItems.reduce(
                      (total, { item }) => total + Number(item.balance),
                      0,
                    ))}
                  </Alert>
                </>
              )}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                  gap: 1.5,
                }}
              >
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
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                  label="Referência / observação"
                  value={payment.reference}
                  onChange={(event) => setPayment((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))}
                />
              </Box>
              <Alert severity="info">
                Valor total deste pagamento: {money(amountBeingPaid)}
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={() => setPayEnrollment(null)} disabled={saving}>
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
