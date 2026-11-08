import { systemDate } from '../../utils/systemDate';
import useReceiptNumber from '../../utils/useReceiptNumber';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
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
import { ReceiptText, WalletCards } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import Money from '../../components/Money';
import ReceiptView from '../../components/ReceiptView';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import {
  createTestRegistration,
  getCourses,
  getPaymentMethods,
  getStudents,
  getTestSettings,
  getTestRegistrations,
  recordTestRegistrationPayment,
} from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatMoney as money } from '../../utils/money';
import { methodLabel } from '../../utils/paymentMethods';
import { filterBySearch } from '../../utils/search';
import DateField from '../../components/DateField';

const testLabels = {
  NORMAL: 'Teste normal',
  RECOVERY: 'Teste de recuperação',
  SPECIAL: 'Teste especial',
};
const feeFields = {
  NORMAL: 'normalFee',
  RECOVERY: 'recoveryFee',
  SPECIAL: 'specialFee',
};
const feeActiveFields = {
  NORMAL: 'normalFeeActive',
  RECOVERY: 'recoveryFeeActive',
  SPECIAL: 'specialFeeActive',
};
const statusLabel = (status) => (
  status === 'PAID' ? 'Pago' : status === 'FREE' ? 'Sem taxa de cobrança' : 'Pendente'
);
const statusClass = (status) => (status === 'FREE' ? 'neutral' : String(status).toLowerCase());
const today = () => {
  const date = systemDate();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const studentName = (student) =>
  [student.firstName, student.surname].filter(Boolean).join(' ');
const optionsFor = (courses, idField, nameField, include) => {
  const options = new Map();
  courses.filter(include).forEach((course) => {
    options.set(String(course[idField]), displayValue(course[nameField]));
  });
  return [...options].map(([id, label]) => ({ id, label }));
};
const errorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';
const displayValue = displayText;
const columns = [
  { key: 'studentCode', label: 'Código do Estudante' },
  { key: 'studentName', label: 'Nome' },
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
  { key: 'amount', label: 'Valor' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: 'Acções', align: 'right' },
];
const buildReceipt = (registration) => ({
  filename: `recibo-teste-${registration.studentCode}-${registration.id}`,
  title: `Recibo de inscrição — ${testLabels[registration.testType].toLowerCase()}`,
  number: '',
  issueDate: toDisplayDate(today()),
  status: statusLabel(registration.status),
  sections: [
    {
      title: 'Dados do estudante',
      rows: [
        ['Código', registration.studentCode],
        ['Nome', displayValue(registration.studentName)],
      ],
    },
    {
      title: 'Dados do teste',
      rows: [
        ['Tipo', testLabels[registration.testType]],
        ['Curso', displayValue(registration.courseName)],
        ['Categoria', displayValue(registration.categoryName)],
        ['Nível', displayValue(registration.levelName)],
        ['Modalidade', displayValue(registration.modalityName)],
        ['Data de inscrição', toDisplayDate(registration.registrationDate)],
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
    description: testLabels[registration.testType],
    amount: money(registration.amount),
    paid: money(registration.paidAmount),
    balance: money(registration.balance),
  }],
  totals: {
    description: 'Total',
    amount: money(registration.amount),
    paid: money(registration.paidAmount),
    balance: money(registration.balance),
  },
  payments: (registration.payments ?? []).map((payment) => ({
    date: toDisplayDate(payment.paymentDate),
    description: testLabels[registration.testType],
    method: displayValue(methodLabel(payment.method)),
    reference: displayValue(payment.reference),
    amount: money(payment.amount),
  })),
});

export default function TestRegistrationPage({ testType, mode }) {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [testSettings, setTestSettings] = useState(null);
  const [methods, setMethods] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [student, setStudent] = useState(null);
  const [studentCodeInput, setStudentCodeInput] = useState('');
  const [courseId, setCourseId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [modalityId, setModalityId] = useState('');
  const [paymentRegistration, setPaymentRegistration] = useState(null);
  const [receiptRegistration, setReceiptRegistration] = useState(null);
  const [payment, setPayment] = useState({ amount: '', paymentDate: today(), method: '', reference: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [loadedCourses, loadedStudents, loadedRegistrations, loadedMethods, loadedTestSettings] = await Promise.all([
        getCourses(),
        getStudents(),
        mode === 'list' ? getTestRegistrations(testType) : Promise.resolve([]),
        mode === 'list' ? getPaymentMethods() : Promise.resolve([]),
        getTestSettings(),
      ]);
      setCourses(loadedCourses.filter((course) => course.active));
      setStudents(loadedStudents.filter((item) => item.active));
      setRegistrations(loadedRegistrations);
      setMethods(loadedMethods.filter((item) => item.active));
      setTestSettings(loadedTestSettings);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [mode, testType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleRegistrations = useMemo(() => filterBySearch(
    registrations,
    searchTerm,
    (registration) => [
      registration.studentCode,
      registration.studentName,
      registration.courseName,
      registration.categoryName,
      registration.levelName,
      registration.modalityName,
      registration.status,
    ],
  ), [registrations, searchTerm]);
  const receiptNumber = useReceiptNumber('TEST', receiptRegistration?.id);
  const receipt = useMemo(
    () => (receiptRegistration ? { ...buildReceipt(receiptRegistration), number: receiptNumber } : null),
    [receiptRegistration, receiptNumber],
  );
  const exportColumns = [
    { key: 'studentCode', label: 'Código do estudante' },
    { key: 'studentName', label: 'Nome' },
    { key: 'courseName', label: 'Curso' },
    { key: 'categoryName', label: 'Categoria' },
    { key: 'levelName', label: 'Nível' },
    { key: 'modalityName', label: 'Modalidade' },
    { key: 'amount', label: 'Valor' },
    { key: 'paidAmount', label: 'Pago' },
    { key: 'balance', label: 'Saldo' },
    { key: 'status', label: 'Estado' },
    { key: 'registrationDate', label: 'Data de inscrição' },
  ];
  const exportRows = visibleRegistrations.map((registration) => ({
    studentCode: registration.studentCode,
    studentName: displayValue(registration.studentName),
    courseName: displayValue(registration.courseName),
    categoryName: displayValue(registration.categoryName),
    levelName: displayValue(registration.levelName),
    modalityName: displayValue(registration.modalityName),
    amount: money(registration.amount),
    paidAmount: money(registration.paidAmount),
    balance: money(registration.balance),
    status: statusLabel(registration.status),
    registrationDate: toDisplayDate(registration.registrationDate),
  }));
  const title = `Inscritos — ${testLabels[testType]}`;
  const selectedCourse = courses.find((course) => (
    String(course.id) === courseId
    && String(course.categoryId) === categoryId
    && String(course.levelId) === levelId
    && String(course.modalityId) === modalityId
  ));
  const matchingCourses = courses.filter((course) => (
    (!categoryId || String(course.categoryId) === categoryId)
    && (!levelId || String(course.levelId) === levelId)
    && (!modalityId || String(course.modalityId) === modalityId)
  ));
  const categoryOptions = optionsFor(
    courses,
    'categoryId',
    'categoryName',
    (course) => (!levelId || String(course.levelId) === levelId)
      && (!modalityId || String(course.modalityId) === modalityId),
  );
  const levelOptions = optionsFor(
    courses,
    'levelId',
    'levelName',
    (course) => (!categoryId || String(course.categoryId) === categoryId)
      && (!modalityId || String(course.modalityId) === modalityId),
  );
  const modalityOptions = optionsFor(
    courses,
    'modalityId',
    'modalityName',
    (course) => (!categoryId || String(course.categoryId) === categoryId)
      && (!levelId || String(course.levelId) === levelId),
  );
  const enrolledStudents = selectedCourse
    ? students.filter((item) => String(item.courseId) === String(selectedCourse.id))
    : [];
  const amount = testSettings?.[feeFields[testType]] ?? 0;
  // "Sem taxa de cobrança" (por omissão) permite inscrever sem processo de pagamento.
  const chargesFee = Boolean(testSettings?.[feeActiveFields[testType]]) && Number(amount) > 0;
  const changeCourse = (_, course) => {
    setCourseId(course ? String(course.id) : '');
    setCategoryId(course ? String(course.categoryId) : '');
    setLevelId(course ? String(course.levelId) : '');
    setModalityId(course ? String(course.modalityId) : '');
    setStudent(null);
    setStudentCodeInput('');
  };
  const changeCourseDetail = (setter) => (_, option) => {
    setter(option?.id ?? '');
    setCourseId('');
    setStudent(null);
    setStudentCodeInput('');
  };

  const submitRegistration = async (event) => {
    event.preventDefault();
    if (!student || !selectedCourse) {
      setError('Selecione o curso e um estudante inscrito nesse curso.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await createTestRegistration({
        studentId: student.id,
        courseId: selectedCourse.id,
        testType,
      });
      setStudent(null);
      setStudentCodeInput('');
      setCourseId('');
      setCategoryId('');
      setLevelId('');
      setModalityId('');
      setNotice(`Inscrição de ${created.studentCode} no ${testLabels[testType]} criada com sucesso${created.status === 'FREE' ? ' (sem taxa de cobrança)' : ''}.`);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const openPayment = (registration) => {
    setError('');
    setPaymentRegistration(registration);
    setPayment({
      amount: String(registration.balance),
      paymentDate: today(),
      method: methods[0]?.name ?? '',
      reference: '',
    });
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!paymentRegistration) return;
    const paymentAmount = Number(payment.amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0
      || paymentAmount > Number(paymentRegistration.balance)) {
      setError('O valor deve ser superior a zero e não pode exceder o saldo pendente.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await recordTestRegistrationPayment(paymentRegistration.id, {
        ...payment,
        amount: paymentAmount,
      });
      setPaymentRegistration(null);
      setNotice(`Pagamento registado para ${paymentRegistration.studentCode}.`);
      await loadData();
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
          <h1>{mode === 'enroll' ? 'Inscrever' : 'Inscritos'}</h1>
        </div>
        {mode === 'list' && (
          <div className="cacoin-page-heading-actions">
            <SearchField value={searchTerm} onChange={setSearchTerm} />
            <DataExportMenu
              columns={exportColumns}
              rows={exportRows}
              filename={`inscritos-${testType.toLowerCase()}`}
              title={title}
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
          {!loading && (!courses.length || !students.length) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {!courses.length && 'Não existem cursos ativos. '}
              {!students.length && 'Não existem estudantes ativos para inscrição.'}
            </Alert>
          )}
          {selectedCourse && enrolledStudents.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Não há estudantes activos inscritos neste curso.
            </Alert>
          )}
          <form className="cacoin-test-registration-form" onSubmit={submitRegistration}>
            <Autocomplete
              options={matchingCourses}
              value={selectedCourse ?? null}
              onChange={changeCourse}
              getOptionLabel={(option) => displayValue(option.name)}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} required label="Curso" size="small" />
              )}
            />
            <Autocomplete
              options={categoryOptions}
              value={categoryOptions.find((option) => option.id === categoryId) ?? null}
              onChange={changeCourseDetail(setCategoryId)}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} required label="Categoria" size="small" />
              )}
            />
            <Autocomplete
              options={levelOptions}
              value={levelOptions.find((option) => option.id === levelId) ?? null}
              onChange={changeCourseDetail(setLevelId)}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} required label="Nível" size="small" />
              )}
            />
            <Autocomplete
              options={modalityOptions}
              value={modalityOptions.find((option) => option.id === modalityId) ?? null}
              onChange={changeCourseDetail(setModalityId)}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} required label="Modalidade" size="small" />
              )}
            />
            <Autocomplete
              options={enrolledStudents}
              value={student}
              inputValue={studentCodeInput}
              onChange={(_, value) => {
                setStudent(value);
                setStudentCodeInput(value?.studentCode ?? '');
              }}
              onInputChange={(_, value, reason) => {
                setStudentCodeInput(value);
                if (reason === 'input') {
                  setStudent(enrolledStudents.find((item) => item.studentCode === value) ?? null);
                }
              }}
              getOptionLabel={(item) => item.studentCode}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              disabled={!selectedCourse}
              renderInput={(params) => (
                <TextField {...params} required label="Código do Estudante" size="small" />
              )}
            />
            <TextField
              size="small"
              label="Nome"
              value={student ? displayValue(studentName(student)) : ''}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              size="small"
              label="Valor"
              value={chargesFee ? money(amount) : 'Sem taxa de cobrança'}
              slotProps={{ input: { readOnly: true } }}
            />
            <div className="cacoin-test-registration-actions">
              <Button
                type="submit"
                variant="contained"
                disabled={saving || loading}
              >
                {saving ? 'A guardar…' : 'Inscrever'}
              </Button>
            </div>
          </form>
        </>
      ) : (
        <StandardTable
          audit="TestRegistration"
          ariaLabel={`Inscritos — ${testLabels[testType]}`}
          columns={columns}
          emptyMessage={error
            ? 'Não foi possível carregar os inscritos.'
            : searchTerm.trim()
              ? 'Nenhuma inscrição corresponde à pesquisa.'
              : `Ainda não existem inscritos em ${testLabels[testType]}.`}
          loading={loading}
          rows={visibleRegistrations}
          renderRow={(registration, rowNumber) => (
            <TableRow key={registration.id} hover>
              <TableCell>{rowNumber}</TableCell>
              <TableCell>{registration.studentCode}</TableCell>
              <TableCell>{displayValue(registration.studentName)}</TableCell>
              <TableCell>{displayValue(registration.courseName)}</TableCell>
              <TableCell>{displayValue(registration.categoryName)}</TableCell>
              <TableCell>{displayValue(registration.levelName)}</TableCell>
              <TableCell>{displayValue(registration.modalityName)}</TableCell>
              <TableCell>{registration.status === 'FREE' ? '—' : <Money value={registration.amount} />}</TableCell>
              <TableCell>
                <span className={`cacoin-status-badge ${statusClass(registration.status)}`}>
                  {statusLabel(registration.status)}
                </span>
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                  {registration.status !== 'FREE' && (
                    <Tooltip title="Ver recibo">
                      <IconButton
                        aria-label={`Ver recibo de ${registration.studentCode}`}
                        onClick={() => setReceiptRegistration(registration)}
                      >
                        <ReceiptText size={17} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {registration.status === 'PENDING' && (
                    <Tooltip title="Registar pagamento">
                      <IconButton
                        aria-label={`Registar pagamento de ${registration.studentCode}`}
                        onClick={() => openPayment(registration)}
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
      )}

      <Dialog
        open={Boolean(receiptRegistration)}
        onClose={() => setReceiptRegistration(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Recibo — {receiptRegistration?.studentCode}</DialogTitle>
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
          <Button onClick={() => setReceiptRegistration(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(paymentRegistration)}
        onClose={() => {
          if (!saving) setPaymentRegistration(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={submitPayment}>
          <DialogTitle>Pagamento — {paymentRegistration?.studentCode}</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Alert severity="info">
                {displayValue(paymentRegistration?.studentName)}
                {' · '}{displayValue(paymentRegistration?.courseName)}
                {' · Saldo pendente: '}<Money value={paymentRegistration?.balance} />
              </Alert>
              {methods.length === 0 && (
                <Alert severity="warning">
                  Não existem métodos de pagamento ativos. Configure um método em Configurações.
                </Alert>
              )}
              <TextField
                required
                size="small"
                type="number"
                label="Valor a pagar"
                value={payment.amount}
                onChange={(event) => setPayment((current) => ({
                  ...current,
                  amount: event.target.value,
                }))}
                slotProps={{
                  htmlInput: {
                    min: 0.01,
                    max: paymentRegistration?.balance,
                    step: 0.01,
                  },
                }}
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
                  <MenuItem key={method.id} value={method.name}>{displayValue(method.name)}</MenuItem>
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
            <Button onClick={() => setPaymentRegistration(null)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving || methods.length === 0}>
              {saving ? 'A registar…' : 'Registar pagamento'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </section>
  );
}
