import { systemDate } from '../../utils/systemDate';
import useReceiptNumber from '../../utils/useReceiptNumber';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
import { Ban, ReceiptText, WalletCards } from 'lucide-react';
import CourseStudentPicker from '../../components/CourseStudentPicker';
import DataExportMenu from '../../components/DataExportMenu';
import Money from '../../components/Money';
import ReceiptView from '../../components/ReceiptView';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import {
  createSuspensionRegistration,
  getCourses,
  getPaymentMethods,
  getStudents,
  getSuspensionRegistrations,
  getSuspensionSettings,
  paySuspensionRegistration,
  suspendRegistration,
} from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatMoney as money } from '../../utils/money';
import { methodLabel } from '../../utils/paymentMethods';
import { filterBySearch } from '../../utils/search';
import SuspensionStatusBar from './SuspensionStatusBar';
import { errorMessage, formatDuration, suspensionStatusLabels } from './suspensionUtils';
import DateField from '../../components/DateField';

const today = () => {
  const date = systemDate();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const columns = [
  { key: 'studentCode', label: 'Código do Estudante' },
  { key: 'studentName', label: 'Nome' },
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
  { key: 'duration', label: 'Duração' },
  { key: 'amount', label: 'Taxa de Trancamento' },
  { key: 'suspensionDate', label: 'Data de Trancamento' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: 'Acções', align: 'right' },
];
const exportColumns = columns.filter(({ key }) => key !== 'actions');

const buildReceipt = (item) => {
  const paidAmount = item.paid ? Number(item.amount) : 0;
  return {
    filename: `recibo-trancamento-${item.studentCode}-${item.id}`,
    title: 'Recibo de trancamento',
    number: '',
    issueDate: toDisplayDate(today()),
    status: item.paid ? 'Pago' : 'Pendente',
    sections: [
      {
        title: 'Dados do estudante',
        rows: [
          ['Código', item.studentCode],
          ['Nome', displayText(item.studentName)],
        ],
      },
      {
        title: 'Dados do trancamento',
        rows: [
          ['Curso', displayText(item.courseName)],
          ['Categoria', displayText(item.categoryName)],
          ['Nível', displayText(item.levelName)],
          ['Modalidade', displayText(item.modalityName)],
          ['Duração', formatDuration(item.durationMonths) || '—'],
          ['Data de trancamento', toDisplayDate(item.suspensionDate)],
          ['Estado', suspensionStatusLabels[item.status]],
        ],
      },
    ],
    columns: [
      { key: 'description', label: 'Descrição' },
      { key: 'amount', label: 'Valor', align: 'right' },
      { key: 'paid', label: 'Pago', align: 'right' },
      { key: 'balance', label: 'Saldo', align: 'right' },
    ],
    items: [{
      description: 'Taxa de trancamento',
      amount: money(item.amount),
      paid: money(paidAmount),
      balance: money(Number(item.amount) - paidAmount),
    }],
    totals: {
      description: 'Total',
      amount: money(item.amount),
      paid: money(paidAmount),
      balance: money(Number(item.amount) - paidAmount),
    },
    payments: item.payment ? [{
      date: toDisplayDate(item.payment.paymentDate),
      description: 'Trancamento',
      method: displayText(methodLabel(item.payment.method)),
      reference: displayText(item.payment.reference),
      amount: money(item.payment.amount),
    }] : [],
  };
};

export default function SuspensionRegistrationPage({ mode }) {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [settings, setSettings] = useState(null);
  const [methods, setMethods] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [picked, setPicked] = useState({ course: null, student: null });
  const [suspensionDate, setSuspensionDate] = useState(today());
  const [formKey, setFormKey] = useState(0);
  const [paymentItem, setPaymentItem] = useState(null);
  const [suspendItem, setSuspendItem] = useState(null);
  const [receiptItem, setReceiptItem] = useState(null);
  const [payment, setPayment] = useState({ paymentDate: today(), method: '', reference: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [loadedCourses, loadedStudents, loadedSettings, loadedRegistrations, loadedMethods] =
        await Promise.all([
          getCourses(),
          getStudents(),
          getSuspensionSettings(),
          mode === 'list' ? getSuspensionRegistrations() : Promise.resolve([]),
          mode === 'list' ? getPaymentMethods() : Promise.resolve([]),
        ]);
      setCourses(loadedCourses.filter((course) => course.active));
      setStudents(loadedStudents.filter((item) => item.active));
      setSettings(loadedSettings);
      setRegistrations(loadedRegistrations);
      setMethods(loadedMethods.filter((item) => item.active));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const amount = settings?.feeActive ? Number(settings.fee) : 0;
  const feeIsConfigured = amount > 0;

  const submitRegistration = async (event) => {
    event.preventDefault();
    if (!picked.student || !picked.course || !feeIsConfigured) {
      setError(!feeIsConfigured
        ? 'Defina a taxa de trancamento em Configurações > Trancamento > Definição.'
        : 'Selecione o curso e um estudante inscrito nesse curso.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await createSuspensionRegistration({
        studentId: picked.student.id,
        courseId: picked.course.id,
        suspensionDate,
      });
      setNotice(`Trancamento registado para ${created.studentCode}.`);
      setSuspensionDate(today());
      setPicked({ course: null, student: null });
      setFormKey((current) => current + 1);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const openPayment = (item) => {
    setError('');
    setPaymentItem(item);
    setPayment({ paymentDate: today(), method: methods[0]?.name ?? '', reference: '' });
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!paymentItem) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await paySuspensionRegistration(paymentItem.id, payment);
      setNotice(`Pagamento registado para ${paymentItem.studentCode}.`);
      setPaymentItem(null);
      await loadData();
    } catch (paymentError) {
      setError(errorMessage(paymentError));
    } finally {
      setSaving(false);
    }
  };

  const confirmSuspension = async () => {
    if (!suspendItem) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await suspendRegistration(suspendItem.id);
      setNotice(`${suspendItem.studentCode} foi trancado.`);
      setSuspendItem(null);
      await loadData();
    } catch (suspendError) {
      setSuspendItem(null);
      setError(errorMessage(suspendError));
    } finally {
      setSaving(false);
    }
  };

  const visibleRows = useMemo(() => filterBySearch(registrations, searchTerm, (item) => [
    item.studentCode,
    item.studentName,
    item.courseName,
    item.categoryName,
    item.levelName,
    item.modalityName,
    suspensionStatusLabels[item.status],
  ]), [registrations, searchTerm]);
  const exportRows = visibleRows.map((item) => ({
    studentCode: item.studentCode,
    studentName: displayText(item.studentName),
    courseName: displayText(item.courseName),
    categoryName: displayText(item.categoryName),
    levelName: displayText(item.levelName),
    modalityName: displayText(item.modalityName),
    duration: formatDuration(item.durationMonths) || '—',
    amount: money(item.amount),
    suspensionDate: toDisplayDate(item.suspensionDate),
    status: suspensionStatusLabels[item.status],
  }));
  const receiptNumber = useReceiptNumber('SUSPENSION', receiptItem?.id);
  const receipt = useMemo(
    () => (receiptItem ? { ...buildReceipt(receiptItem), number: receiptNumber } : null),
    [receiptItem, receiptNumber],
  );

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>{mode === 'register' ? 'Registar' : 'Trancados'}</h1>
        </div>
        {mode === 'list' && (
          <div className="cacoin-page-heading-actions">
            <SearchField value={searchTerm} onChange={setSearchTerm} />
            <DataExportMenu
              columns={exportColumns}
              rows={exportRows}
              filename="trancamentos"
              title="Estudantes trancados"
              disabled={loading}
              onError={(exportError) => setError(errorMessage(exportError))}
            />
          </div>
        )}
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {mode === 'register' ? (
        <>
          {!loading && (!courses.length || !students.length || !feeIsConfigured) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {!courses.length && 'Não existem cursos ativos. '}
              {!students.length && 'Não existem estudantes ativos. '}
              {!feeIsConfigured && 'Configure uma taxa de trancamento superior a zero em Configurações > Trancamento > Definição.'}
            </Alert>
          )}
          <form className="cacoin-test-registration-form" onSubmit={submitRegistration}>
            <CourseStudentPicker
              key={formKey}
              courses={courses}
              students={students}
              onChange={setPicked}
            />
            <TextField
              size="small"
              label="Taxa de Trancamento"
              value={feeIsConfigured ? money(amount) : ''}
              slotProps={{ input: { readOnly: true } }}
            />
            <DateField
              required
              size="small"
              label="Data de Trancamento"
              value={suspensionDate}
              onChange={(event) => setSuspensionDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }}
            />
            <div className="cacoin-test-registration-actions">
              <Button
                type="submit"
                variant="contained"
                disabled={saving || loading || !feeIsConfigured}
              >
                {saving ? 'A guardar…' : 'Registar'}
              </Button>
            </div>
          </form>
        </>
      ) : (
        <StandardTable
          audit="SuspensionRegistration"
          ariaLabel="Estudantes trancados"
          columns={columns}
          emptyMessage={error
            ? 'Não foi possível carregar os dados.'
            : searchTerm.trim()
              ? 'Nenhum registo corresponde à pesquisa.'
              : 'Ainda não existem trancamentos registados.'}
          loading={loading}
          rows={visibleRows}
          renderRow={(row, rowNumber) => (
            <TableRow key={row.id} hover>
              <TableCell>{rowNumber}</TableCell>
              <TableCell>{row.studentCode}</TableCell>
              <TableCell>{displayText(row.studentName)}</TableCell>
              <TableCell>{displayText(row.courseName)}</TableCell>
              <TableCell>{displayText(row.categoryName)}</TableCell>
              <TableCell>{displayText(row.levelName)}</TableCell>
              <TableCell>{displayText(row.modalityName)}</TableCell>
              <TableCell>{formatDuration(row.durationMonths) || '—'}</TableCell>
              <TableCell><Money value={row.amount} /></TableCell>
              <TableCell>{toDisplayDate(row.suspensionDate)}</TableCell>
              <TableCell><SuspensionStatusBar paid={row.paid} suspended={row.suspended} /></TableCell>
              <TableCell align="right">
                <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                  <Tooltip title="Ver recibo">
                    <IconButton
                      aria-label={`Ver recibo de ${row.studentCode}`}
                      onClick={() => setReceiptItem(row)}
                    >
                      <ReceiptText size={17} />
                    </IconButton>
                  </Tooltip>
                  {!row.paid && (
                    <Tooltip title="Pagar">
                      <IconButton
                        aria-label={`Pagar trancamento de ${row.studentCode}`}
                        onClick={() => openPayment(row)}
                      >
                        <WalletCards size={17} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {row.paid && !row.suspended && (
                    <Tooltip title="Trancar">
                      <IconButton
                        aria-label={`Trancar ${row.studentCode}`}
                        onClick={() => setSuspendItem(row)}
                      >
                        <Ban size={17} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          )}
        />
      )}

      <Dialog open={Boolean(receiptItem)} onClose={() => setReceiptItem(null)} fullWidth maxWidth="md">
        <DialogTitle>Recibo — {receiptItem?.studentCode}</DialogTitle>
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
              columns={receipt.columns}
              rows={receipt.items}
              filename={receipt.filename}
              title={`${receipt.title} ${receipt.number}`}
              secondary={{
                columns: [
                  { key: 'date', label: 'Data' },
                  { key: 'description', label: 'Descrição' },
                  { key: 'method', label: 'Método' },
                  { key: 'reference', label: 'Referência' },
                  { key: 'amount', label: 'Valor' },
                ],
                rows: receipt.payments,
              }}
              onExportPdf={async () => {
                const exporters = await import('../../utils/dataExport');
                exporters.exportReceiptToPdf(receipt);
              }}
              onError={(exportError) => setError(errorMessage(exportError))}
            />
          )}
          <Button onClick={() => setReceiptItem(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(paymentItem)}
        onClose={() => {
          if (!saving) setPaymentItem(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={submitPayment}>
          <DialogTitle>Pagamento — {paymentItem?.studentCode}</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Alert severity="info">
                {displayText(paymentItem?.studentName)}
                {' · Taxa de trancamento: '}<Money value={paymentItem?.amount} />
              </Alert>
              {methods.length === 0 && (
                <Alert severity="warning">
                  Não existem métodos de pagamento ativos. Configure um método em Configurações.
                </Alert>
              )}
              <DateField
                required
                size="small"
                label="Data do pagamento"
                value={payment.paymentDate}
                onChange={(event) => setPayment((current) => ({
                  ...current,
                  paymentDate: event.target.value,
                }))}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                required
                select
                size="small"
                label="Método de pagamento"
                value={payment.method}
                onChange={(event) => setPayment((current) => ({
                  ...current,
                  method: event.target.value,
                }))}
              >
                {methods.map((method) => (
                  <MenuItem key={method.id} value={method.name}>{displayText(method.name)}</MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label="Referência"
                value={payment.reference}
                onChange={(event) => setPayment((current) => ({
                  ...current,
                  reference: event.target.value,
                }))}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentItem(null)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving || methods.length === 0}>
              {saving ? 'A registar…' : 'Pagar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(suspendItem)}
        onClose={() => {
          if (!saving) setSuspendItem(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Trancar estudante</DialogTitle>
        <DialogContent>
          Confirmar o trancamento de {suspendItem?.studentCode} — {displayText(suspendItem?.studentName)}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendItem(null)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={confirmSuspension} disabled={saving}>
            {saving ? 'A trancar…' : 'Trancar'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
