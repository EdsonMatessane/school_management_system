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
  Tab,
  Tabs,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { PackageCheck, ReceiptText, WalletCards } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import Money from '../../components/Money';
import ReceiptView from '../../components/ReceiptView';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import {
  createUniformOrder,
  deliverUniformOrder,
  getCourses,
  getPaymentMethods,
  getStudents,
  getUniformOrders,
  getUniformSettings,
  getUniformStock,
  payUniformOrder,
} from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatMoney as money } from '../../utils/money';
import { methodLabel } from '../../utils/paymentMethods';
import { filterBySearch } from '../../utils/search';
import UniformStatusBar from './UniformStatusBar';
import {
  observationFor,
  sizeDistribution,
  standardSizes,
  studentsWithoutUniform,
  uniformStatusLabels,
} from './uniformUtils';
import DateField from '../../components/DateField';

const today = () => {
  const date = systemDate();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const studentName = (student) =>
  [student.firstName, student.surname].filter(Boolean).join(' ');
const optionsFor = (courses, idField, nameField, include) => {
  const options = new Map();
  courses.filter(include).forEach((course) => {
    options.set(String(course[idField]), displayText(course[nameField]));
  });
  return [...options].map(([id, label]) => ({ id, label }));
};
const errorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';

const orderColumns = [
  { key: 'studentCode', label: 'Código do Estudante' },
  { key: 'studentName', label: 'Nome' },
  { key: 'size', label: 'Tamanho' },
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
  { key: 'amount', label: 'Taxa de Uniforme' },
  { key: 'observation', label: 'Observação' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: 'Acções', align: 'right' },
];
const withoutColumns = [
  { key: 'studentCode', label: 'Código do Estudante' },
  { key: 'studentName', label: 'Nome' },
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
];
const orderExportColumns = orderColumns.filter(({ key }) => key !== 'actions');
const tabNames = ['requisitados', 'com-uniforme', 'sem-uniforme'];

const buildReceipt = (order) => ({
  filename: `recibo-uniforme-${order.studentCode}-${order.id}`,
  title: 'Recibo de uniforme',
  number: '',
  issueDate: toDisplayDate(today()),
  status: order.paid ? 'Pago' : 'Pendente',
  sections: [
    {
      title: 'Dados do estudante',
      rows: [
        ['Código', order.studentCode],
        ['Nome', displayText(order.studentName)],
      ],
    },
    {
      title: 'Dados do uniforme',
      rows: [
        ['Tamanho', order.size],
        ['Curso', displayText(order.courseName)],
        ['Categoria', displayText(order.categoryName)],
        ['Nível', displayText(order.levelName)],
        ['Modalidade', displayText(order.modalityName)],
        ['Data do pedido', toDisplayDate(order.orderDate)],
        ['Estado', uniformStatusLabels[order.status]],
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
    description: `Uniforme — tamanho ${order.size}`,
    amount: money(order.amount),
    paid: money(order.paid ? order.amount : 0),
    balance: money(order.paid ? 0 : order.amount),
  }],
  totals: {
    description: 'Total',
    amount: money(order.amount),
    paid: money(order.paid ? order.amount : 0),
    balance: money(order.paid ? 0 : order.amount),
  },
  payments: order.payment ? [{
    date: toDisplayDate(order.payment.paymentDate),
    description: `Uniforme — tamanho ${order.size}`,
    method: displayText(methodLabel(order.payment.method)),
    reference: displayText(order.payment.reference),
    amount: money(order.payment.amount),
  }] : [],
});

export default function UniformOrderPage({ mode }) {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [stock, setStock] = useState({ total: 0, sizes: [] });
  const [settings, setSettings] = useState(null);
  const [methods, setMethods] = useState([]);
  const [orders, setOrders] = useState([]);
  const [student, setStudent] = useState(null);
  const [studentCodeInput, setStudentCodeInput] = useState('');
  const [courseId, setCourseId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [modalityId, setModalityId] = useState('');
  const [size, setSize] = useState(null);
  const [tab, setTab] = useState(0);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [deliveryOrder, setDeliveryOrder] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
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
      const [
        loadedCourses,
        loadedStudents,
        loadedStock,
        loadedSettings,
        loadedOrders,
        loadedMethods,
      ] = await Promise.all([
        getCourses(),
        getStudents(),
        getUniformStock(),
        getUniformSettings(),
        mode === 'list' ? getUniformOrders() : Promise.resolve([]),
        mode === 'list' ? getPaymentMethods() : Promise.resolve([]),
      ]);
      setCourses(loadedCourses.filter((course) => course.active));
      setStudents(loadedStudents.filter((item) => item.active));
      setStock(loadedStock);
      setSettings(loadedSettings);
      setOrders(loadedOrders);
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

  const courseCandidates = categoryId && levelId && modalityId
    ? courses.filter((course) => (
      (!courseId || String(course.id) === courseId)
      && String(course.categoryId) === categoryId
      && String(course.levelId) === levelId
      && String(course.modalityId) === modalityId
    ))
    : [];
  const selectedCourse = courseCandidates.length === 1 ? courseCandidates[0] : undefined;
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
  const amount = settings?.feeActive ? Number(settings.fee) : 0;
  const feeIsConfigured = amount > 0;
  const observation = observationFor(size, stock);
  const sizeWarning = size && observation !== '-'
    ? observation === 'Sem stock'
      ? `Não há stock do tamanho ${size}.`
      : `O tamanho ${size} não existe nas definições de stock.`
    : '';

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

  const submitOrder = async (event) => {
    event.preventDefault();
    if (!student || !selectedCourse || !size || !feeIsConfigured) {
      setError(!feeIsConfigured
        ? 'Defina a taxa de uniforme em Configurações antes de requisitar uniformes.'
        : 'Selecione o curso, um estudante inscrito nesse curso e o tamanho.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await createUniformOrder({
        studentId: student.id,
        courseId: selectedCourse.id,
        size,
      });
      setStudent(null);
      setStudentCodeInput('');
      setCourseId('');
      setCategoryId('');
      setLevelId('');
      setModalityId('');
      setSize(null);
      setStock(await getUniformStock());
      setNotice(`Uniforme tamanho ${created.size} requisitado para ${created.studentCode}.`);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const openPayment = (order) => {
    setError('');
    setPaymentOrder(order);
    setPayment({ paymentDate: today(), method: methods[0]?.name ?? '', reference: '' });
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!paymentOrder) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await payUniformOrder(paymentOrder.id, payment);
      setPaymentOrder(null);
      setNotice(`Pagamento registado para ${paymentOrder.studentCode}.`);
      await loadData();
    } catch (paymentError) {
      setError(errorMessage(paymentError));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelivery = async () => {
    if (!deliveryOrder) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await deliverUniformOrder(deliveryOrder.id);
      setNotice(`Uniforme entregue a ${deliveryOrder.studentCode}.`);
      setDeliveryOrder(null);
      await loadData();
    } catch (deliveryError) {
      setDeliveryOrder(null);
      setError(errorMessage(deliveryError));
    } finally {
      setSaving(false);
    }
  };

  const withUniformOrders = useMemo(() => orders.filter((order) => order.paid), [orders]);
  const withoutUniform = useMemo(() => studentsWithoutUniform(students, orders)
    .map((item) => {
      const course = courses.find((candidate) => candidate.id === item.courseId);
      return {
        id: item.id,
        studentCode: item.studentCode,
        studentName: studentName(item),
        courseName: course?.name ?? '',
        categoryName: course?.categoryName ?? '',
        levelName: course?.levelName ?? '',
        modalityName: course?.modalityName ?? '',
      };
    }), [courses, orders, students]);
  const distribution = useMemo(() => sizeDistribution(orders), [orders]);
  const orderSearchFields = (order) => [
    order.studentCode,
    order.studentName,
    order.size,
    order.courseName,
    order.categoryName,
    order.levelName,
    order.modalityName,
    order.observation,
    uniformStatusLabels[order.status],
  ];
  const visibleRows = useMemo(() => {
    if (tab === 2) {
      return filterBySearch(withoutUniform, searchTerm, (row) => [
        row.studentCode,
        row.studentName,
        row.courseName,
        row.categoryName,
        row.levelName,
        row.modalityName,
      ]);
    }
    return filterBySearch(tab === 1 ? withUniformOrders : orders, searchTerm, orderSearchFields);
  }, [orders, searchTerm, tab, withUniformOrders, withoutUniform]);
  const exportColumns = tab === 2 ? withoutColumns : orderExportColumns;
  const exportRows = visibleRows.map((row) => (tab === 2 ? {
    studentCode: row.studentCode,
    studentName: displayText(row.studentName),
    courseName: displayText(row.courseName),
    categoryName: displayText(row.categoryName),
    levelName: displayText(row.levelName),
    modalityName: displayText(row.modalityName),
  } : {
    studentCode: row.studentCode,
    studentName: displayText(row.studentName),
    size: row.size,
    courseName: displayText(row.courseName),
    categoryName: displayText(row.categoryName),
    levelName: displayText(row.levelName),
    modalityName: displayText(row.modalityName),
    amount: money(row.amount),
    observation: row.observation,
    status: uniformStatusLabels[row.status],
  }));
  const receiptNumber = useReceiptNumber('UNIFORM', receiptOrder?.id);
  const receipt = useMemo(
    () => (receiptOrder ? { ...buildReceipt(receiptOrder), number: receiptNumber } : null),
    [receiptOrder, receiptNumber],
  );

  const renderAutocomplete = (label, value, options, onChange) => (
    <Autocomplete
      options={options}
      value={options.find((option) => option.id === value) ?? null}
      onChange={onChange}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      renderInput={(params) => (
        <TextField {...params} required label={label} size="small" />
      )}
    />
  );

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>{mode === 'request' ? 'Requisitar' : 'Requisitados'}</h1>
        </div>
        {mode === 'list' && (
          <div className="cacoin-page-heading-actions">
            <SearchField value={searchTerm} onChange={setSearchTerm} />
            <DataExportMenu
              columns={exportColumns}
              rows={exportRows}
              filename={`uniformes-${tabNames[tab]}`}
              title={['Uniformes requisitados', 'Estudantes com uniforme', 'Estudantes sem uniforme'][tab]}
              disabled={loading}
              onError={(exportError) => setError(errorMessage(exportError))}
            />
          </div>
        )}
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {mode === 'request' ? (
        <>
          {!loading && (!courses.length || !students.length || !feeIsConfigured) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {!courses.length && 'Não existem cursos ativos. '}
              {!students.length && 'Não existem estudantes ativos. '}
              {!feeIsConfigured && 'Configure uma taxa de uniforme superior a zero em Configurações > Uniforme > Definição.'}
            </Alert>
          )}
          {selectedCourse && enrolledStudents.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Não há estudantes activos inscritos neste curso.
            </Alert>
          )}
          {sizeWarning && (
            <Alert severity="warning" sx={{ mb: 2 }}>{sizeWarning}</Alert>
          )}
          <form className="cacoin-test-registration-form" onSubmit={submitOrder}>
            <Autocomplete
              options={matchingCourses}
              value={selectedCourse ?? null}
              onChange={changeCourse}
              getOptionLabel={(option) => displayText(option.name)}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} required label="Curso" size="small" />
              )}
            />
            {renderAutocomplete('Categoria', categoryId, categoryOptions, changeCourseDetail(setCategoryId))}
            {renderAutocomplete('Nível', levelId, levelOptions, changeCourseDetail(setLevelId))}
            {renderAutocomplete('Modalidade', modalityId, modalityOptions, changeCourseDetail(setModalityId))}
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
              value={student ? displayText(studentName(student)) : ''}
              slotProps={{ input: { readOnly: true } }}
            />
            <Autocomplete
              options={standardSizes}
              value={size}
              onChange={(_, value) => setSize(value)}
              renderInput={(params) => (
                <TextField {...params} required label="Tamanho" size="small" />
              )}
            />
            <TextField
              size="small"
              label="Taxa de Uniforme"
              value={feeIsConfigured ? money(amount) : ''}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              size="small"
              label="Observação"
              value={observation}
              slotProps={{ input: { readOnly: true } }}
            />
            <div className="cacoin-test-registration-actions">
              <Button
                type="submit"
                variant="contained"
                disabled={saving || loading || !feeIsConfigured}
              >
                {saving ? 'A guardar…' : 'Requisitar'}
              </Button>
            </div>
          </form>
        </>
      ) : (
        <>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            sx={{ mb: 2 }}
            aria-label="Vistas de uniformes"
          >
            <Tab label={`Requisitados (${orders.length})`} />
            <Tab label={`Com uniforme (${withUniformOrders.length})`} />
            <Tab label={`Sem uniforme (${withoutUniform.length})`} />
          </Tabs>
          {tab === 0 && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 3,
                p: 1.5,
                mb: 2,
                border: '1px solid var(--border)',
                borderRadius: 2,
                bgcolor: 'var(--surface)',
              }}
            >
              <span>Número total de uniformes requisitados: <strong>{orders.length}</strong></span>
              <span>
                Distribuição por tamanho:{' '}
                <strong>{distribution.map((item) => item.label).join(', ') || '—'}</strong>
              </span>
            </Box>
          )}
          <StandardTable
            audit={tab === 2 ? undefined : 'UniformOrder'}
            key={tab}
            ariaLabel={['Uniformes requisitados', 'Estudantes com uniforme', 'Estudantes sem uniforme'][tab]}
            columns={tab === 2 ? withoutColumns : orderColumns}
            emptyMessage={error
              ? 'Não foi possível carregar os dados.'
              : searchTerm.trim()
                ? 'Nenhum registo corresponde à pesquisa.'
                : ['Ainda não existem uniformes requisitados.',
                  'Ainda não existem estudantes com uniforme.',
                  'Todos os estudantes já têm uniforme.'][tab]}
            loading={loading}
            rows={visibleRows}
            renderRow={(row, rowNumber) => (tab === 2 ? (
              <TableRow key={row.id} hover>
                <TableCell>{rowNumber}</TableCell>
                <TableCell>{row.studentCode}</TableCell>
                <TableCell>{displayText(row.studentName)}</TableCell>
                <TableCell>{displayText(row.courseName)}</TableCell>
                <TableCell>{displayText(row.categoryName)}</TableCell>
                <TableCell>{displayText(row.levelName)}</TableCell>
                <TableCell>{displayText(row.modalityName)}</TableCell>
              </TableRow>
            ) : (
              <TableRow key={row.id} hover>
                <TableCell>{rowNumber}</TableCell>
                <TableCell>{row.studentCode}</TableCell>
                <TableCell>{displayText(row.studentName)}</TableCell>
                <TableCell>{row.size}</TableCell>
                <TableCell>{displayText(row.courseName)}</TableCell>
                <TableCell>{displayText(row.categoryName)}</TableCell>
                <TableCell>{displayText(row.levelName)}</TableCell>
                <TableCell>{displayText(row.modalityName)}</TableCell>
                <TableCell><Money value={row.amount} /></TableCell>
                <TableCell>{row.observation}</TableCell>
                <TableCell><UniformStatusBar paid={row.paid} delivered={row.delivered} /></TableCell>
                <TableCell align="right">
                  <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                    <Tooltip title="Ver recibo">
                      <IconButton
                        aria-label={`Ver recibo de ${row.studentCode}`}
                        onClick={() => setReceiptOrder(row)}
                      >
                        <ReceiptText size={17} />
                      </IconButton>
                    </Tooltip>
                    {!row.paid && (
                      <Tooltip title="Pagar">
                        <IconButton
                          aria-label={`Pagar uniforme de ${row.studentCode}`}
                          onClick={() => openPayment(row)}
                        >
                          <WalletCards size={17} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {row.paid && !row.delivered && (
                      <Tooltip title="Entregar">
                        <IconButton
                          aria-label={`Entregar uniforme a ${row.studentCode}`}
                          onClick={() => setDeliveryOrder(row)}
                        >
                          <PackageCheck size={17} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          />
        </>
      )}

      <Dialog
        open={Boolean(receiptOrder)}
        onClose={() => setReceiptOrder(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Recibo — {receiptOrder?.studentCode}</DialogTitle>
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
          <Button onClick={() => setReceiptOrder(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(paymentOrder)}
        onClose={() => {
          if (!saving) setPaymentOrder(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={submitPayment}>
          <DialogTitle>Pagamento — {paymentOrder?.studentCode}</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Alert severity="info">
                {displayText(paymentOrder?.studentName)}
                {' · Tamanho '}{paymentOrder?.size}
                {' · Taxa de uniforme: '}<Money value={paymentOrder?.amount} />
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
            <Button onClick={() => setPaymentOrder(null)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving || methods.length === 0}>
              {saving ? 'A registar…' : 'Pagar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deliveryOrder)}
        onClose={() => {
          if (!saving) setDeliveryOrder(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Entregar uniforme</DialogTitle>
        <DialogContent>
          Confirmar a entrega do uniforme tamanho {deliveryOrder?.size} a{' '}
          {deliveryOrder?.studentCode} — {displayText(deliveryOrder?.studentName)}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeliveryOrder(null)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={confirmDelivery} disabled={saving}>
            {saving ? 'A entregar…' : 'Entregar'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
