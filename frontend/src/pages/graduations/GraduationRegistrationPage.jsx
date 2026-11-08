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
import { GraduationCap, ReceiptText, WalletCards } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import Money from '../../components/Money';
import ReceiptView from '../../components/ReceiptView';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import {
  createGraduationRegistration,
  getCourses,
  getGraduationRegistrations,
  getGraduationSettings,
  getPaymentMethods,
  getStudents,
  graduateRegistration,
  payGraduationRegistration,
} from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatMoney as money } from '../../utils/money';
import { methodLabel } from '../../utils/paymentMethods';
import { filterBySearch } from '../../utils/search';
import GraduationStatusBar from './GraduationStatusBar';
import GraduationStudentPicker from './GraduationStudentPicker';
import {
  errorMessage,
  formatDuration,
  graduationStatusLabels,
  quoteGraduation,
} from './graduationUtils';
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
  { key: 'amount', label: 'Taxa de Graduação' },
  { key: 'registrationDate', label: 'Data de Inscrição' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: 'Acções', align: 'right' },
];
const exportColumns = columns.filter(({ key }) => key !== 'actions');

const buildReceipt = (item) => {
  const lines = [
    { description: 'Taxa de graduação', amount: Number(item.feeAmount) },
    { description: 'Requisitos', amount: Number(item.requirementsAmount) },
    { description: `Convidados (${item.guests})`, amount: Number(item.extraGuestsAmount) },
  ].filter((line) => line.amount > 0);
  const paidAmount = item.paid ? Number(item.amount) : 0;
  return {
    filename: `recibo-graduacao-${item.studentCode}-${item.id}`,
    title: 'Recibo de graduação',
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
        title: 'Dados da graduação',
        rows: [
          ['Curso', displayText(item.courseName)],
          ['Categoria', displayText(item.categoryName)],
          ['Nível', displayText(item.levelName)],
          ['Modalidade', displayText(item.modalityName)],
          ['Duração', formatDuration(item.durationMonths) || '—'],
          ['Convidados', String(item.guests)],
          ['Data de inscrição', toDisplayDate(item.registrationDate)],
          ['Estado', graduationStatusLabels[item.status]],
        ],
      },
    ],
    columns: [
      { key: 'description', label: 'Descrição' },
      { key: 'amount', label: 'Valor', align: 'right' },
      { key: 'paid', label: 'Pago', align: 'right' },
      { key: 'balance', label: 'Saldo', align: 'right' },
    ],
    items: lines.map((line) => ({
      description: line.description,
      amount: money(line.amount),
      paid: money(item.paid ? line.amount : 0),
      balance: money(item.paid ? 0 : line.amount),
    })),
    totals: {
      description: 'Total',
      amount: money(item.amount),
      paid: money(paidAmount),
      balance: money(Number(item.amount) - paidAmount),
    },
    payments: item.payment ? [{
      date: toDisplayDate(item.payment.paymentDate),
      description: 'Graduação',
      method: displayText(methodLabel(item.payment.method)),
      reference: displayText(item.payment.reference),
      amount: money(item.payment.amount),
    }] : [],
  };
};

export default function GraduationRegistrationPage({ mode }) {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [settings, setSettings] = useState(null);
  const [methods, setMethods] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [picked, setPicked] = useState({ course: null, student: null });
  const [guests, setGuests] = useState('0');
  const [formKey, setFormKey] = useState(0);
  const [paymentItem, setPaymentItem] = useState(null);
  const [graduateItem, setGraduateItem] = useState(null);
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
          getGraduationSettings(),
          mode === 'list' ? getGraduationRegistrations() : Promise.resolve([]),
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

  const guestCount = Number(guests);
  const validGuests = Number.isInteger(guestCount) && guestCount >= 0 && guestCount <= 50;
  const quote = quoteGraduation(settings, validGuests ? guestCount : 0);
  const periodClosed = (() => {
    if (!settings?.periodStart || !settings?.periodEnd) return false;
    const now = new Date();
    return now < new Date(settings.periodStart) || now > new Date(settings.periodEnd);
  })();

  const submitRegistration = async (event) => {
    event.preventDefault();
    if (!picked.student || !picked.course || !validGuests || !quote.ready) {
      setError(!quote.ready
        ? 'Defina a taxa de graduação (e o valor por convidado extra) em Configurações > Graduação > Definição.'
        : 'Selecione o curso, um estudante inscrito nesse curso e indique os convidados (0 a 50).');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await createGraduationRegistration({
        studentId: picked.student.id,
        courseId: picked.course.id,
        guests: guestCount,
      });
      setNotice(`Inscrição na graduação registada para ${created.studentCode}.`);
      setGuests('0');
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
      await payGraduationRegistration(paymentItem.id, payment);
      setNotice(`Pagamento registado para ${paymentItem.studentCode}.`);
      setPaymentItem(null);
      await loadData();
    } catch (paymentError) {
      setError(errorMessage(paymentError));
    } finally {
      setSaving(false);
    }
  };

  const confirmGraduation = async () => {
    if (!graduateItem) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await graduateRegistration(graduateItem.id);
      setNotice(`${graduateItem.studentCode} foi graduado.`);
      setGraduateItem(null);
      await loadData();
    } catch (graduateError) {
      setGraduateItem(null);
      setError(errorMessage(graduateError));
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
    graduationStatusLabels[item.status],
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
    registrationDate: toDisplayDate(item.registrationDate),
    status: graduationStatusLabels[item.status],
  }));
  const receiptNumber = useReceiptNumber('GRADUATION', receiptItem?.id);
  const receipt = useMemo(
    () => (receiptItem ? { ...buildReceipt(receiptItem), number: receiptNumber } : null),
    [receiptItem, receiptNumber],
  );

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>{mode === 'enroll' ? 'Inscrever' : 'Inscritos'}</h1>
        </div>
        {mode === 'list' && (
          <div className="cacoin-page-heading-actions">
            <SearchField value={searchTerm} onChange={setSearchTerm} />
            <DataExportMenu
              columns={exportColumns}
              rows={exportRows}
              filename="graduacao-inscritos"
              title="Inscritos na graduação"
              disabled={loading}
              onError={(exportError) => setError(errorMessage(exportError))}
            />
          </div>
        )}
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {mode === 'enroll' ? (
        <>
          {!loading && (!courses.length || !students.length || !quote.ready) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {!courses.length && 'Não existem cursos ativos. '}
              {!students.length && 'Não existem estudantes ativos. '}
              {!quote.ready && (quote.missingExtraFee
                ? 'Configure o valor por convidado extra em Configurações > Graduação > Definição.'
                : 'Configure uma taxa de graduação superior a zero em Configurações > Graduação > Definição.')}
            </Alert>
          )}
          {periodClosed && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              As inscrições estão fora do período de graduação configurado.
            </Alert>
          )}
          <form className="cacoin-test-registration-form" onSubmit={submitRegistration}>
            <GraduationStudentPicker
              key={formKey}
              courses={courses}
              students={students}
              onChange={setPicked}
            />
            <TextField
              required
              size="small"
              type="number"
              label="Convidados"
              value={guests}
              onChange={(event) => setGuests(event.target.value)}
              slotProps={{ htmlInput: { min: 0, max: 50, step: 1 } }}
            />
            <TextField
              size="small"
              label="Taxa de Graduação"
              value={quote.total > 0 ? money(quote.total) : ''}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              size="small"
              label="Data de Inscrição"
              value={toDisplayDate(today())}
              slotProps={{ input: { readOnly: true } }}
            />
            <div className="cacoin-test-registration-actions">
              <Button
                type="submit"
                variant="contained"
                disabled={saving || loading || !quote.ready}
              >
                {saving ? 'A guardar…' : 'Inscrever'}
              </Button>
            </div>
          </form>
        </>
      ) : (
        <StandardTable
          audit="GraduationRegistration"
          ariaLabel="Inscritos na graduação"
          columns={columns}
          emptyMessage={error
            ? 'Não foi possível carregar os dados.'
            : searchTerm.trim()
              ? 'Nenhum registo corresponde à pesquisa.'
              : 'Ainda não existem inscritos na graduação.'}
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
              <TableCell>{toDisplayDate(row.registrationDate)}</TableCell>
              <TableCell><GraduationStatusBar paid={row.paid} graduated={row.graduated} /></TableCell>
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
                        aria-label={`Pagar graduação de ${row.studentCode}`}
                        onClick={() => openPayment(row)}
                      >
                        <WalletCards size={17} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {row.paid && !row.graduated && (
                    <Tooltip title="Graduar">
                      <IconButton
                        aria-label={`Graduar ${row.studentCode}`}
                        onClick={() => setGraduateItem(row)}
                      >
                        <GraduationCap size={17} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          )}
        />
      )}

      <Dialog
        open={Boolean(receiptItem)}
        onClose={() => setReceiptItem(null)}
        fullWidth
        maxWidth="md"
      >
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
                {' · Taxa de graduação: '}<Money value={paymentItem?.amount} />
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
        open={Boolean(graduateItem)}
        onClose={() => {
          if (!saving) setGraduateItem(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Graduar estudante</DialogTitle>
        <DialogContent>
          Confirmar a graduação de {graduateItem?.studentCode} — {displayText(graduateItem?.studentName)}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGraduateItem(null)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={confirmGraduation} disabled={saving}>
            {saving ? 'A graduar…' : 'Graduar'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
