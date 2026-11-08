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
import {
  ArrowLeftRight,
  Bell,
  ReceiptText,
  ShieldCheck,
  Trash2,
  WalletCards,
} from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import Money from '../../components/Money';
import ReceiptView from '../../components/ReceiptView';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import StatusBadge from '../../components/StatusBadge';
import {
  deleteStaffAttendanceRecord,
  getOnlineAttendanceSettings,
  getPaymentMethods,
  getStaffAttendanceExcesses,
  getStaffAttendanceRecords,
  payStaffAttendanceJustification,
  requestStaffAttendanceJustification,
  updateStaffAttendanceStatus,
} from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatMoney as money } from '../../utils/money';
import { methodLabel } from '../../utils/paymentMethods';
import { filterBySearch } from '../../utils/search';
import useReceiptNumber from '../../utils/useReceiptNumber';
import useStatuses from '../../utils/useStatuses';
import AttendanceStatusBar from '../attendances/AttendanceStatusBar';
import {
  joinCourses,
  justificationLabels,
  staffAttendanceErrorMessage as errorMessage,
  staffAttendanceLabels,
  todayIso,
} from './staffAttendanceUtils';
import DateField from '../../components/DateField';

const lines = (courses, key) => (
  courses.length
    ? courses.map((course, index) => (
      <div key={`${course.courseId}-${index}`}>{displayText(course[key])}</div>
    ))
    : '—'
);

const buildColumns = (isTeacher) => {
  const person = [
    { key: 'staffCode', label: 'Código do Funcionário' },
    { key: 'staffName', label: 'Nome' },
    { key: 'positionName', label: 'Cargo' },
    ...(isTeacher ? [
      { key: 'courseName', label: 'Curso' },
      { key: 'categoryName', label: 'Categoria' },
      { key: 'levelName', label: 'Nível' },
      { key: 'modalityName', label: 'Modalidade' },
    ] : []),
  ];
  const actions = { key: 'actions', label: 'Acções', align: 'right' };
  return {
    list: {
      title: 'Presenças',
      columns: [{ key: 'date', label: 'Data' }, ...person, { key: 'status', label: 'Estado' }, actions],
      empty: 'Ainda não existem presenças registadas.',
    },
    absences: {
      title: 'Faltas',
      columns: [...person, { key: 'date', label: 'Data da Falta' }, { key: 'justification', label: 'Estado' }, actions],
      empty: 'Ainda não existem faltas registadas.',
    },
    justified: {
      title: 'Justificadas',
      columns: [
        ...person,
        { key: 'date', label: 'Data da Falta' },
        { key: 'fee', label: 'Taxa de Justificação' },
        { key: 'justificationDate', label: 'Data de Justificação' },
        { key: 'justification', label: 'Estado' },
        actions,
      ],
      empty: 'Ainda não existem faltas justificadas.',
    },
    excesses: {
      title: 'Excessos',
      columns: [...person, { key: 'date', label: 'Data da Falta' }, { key: 'status', label: 'Estado' }, actions],
      empty: 'Nenhum funcionário excedeu o número máximo de faltas.',
    },
  };
};

const buildReceipt = (item, type) => {
  const fee = Number(item.justificationFee || 0);
  const paid = item.justification === 'JUSTIFIED' ? fee : 0;
  return {
    filename: `recibo-justificacao-${item.staffCode}-${item.id}`,
    title: 'Recibo de justificação de falta',
    number: '',
    issueDate: toDisplayDate(todayIso()),
    status: item.justification === 'JUSTIFIED' ? 'Pago' : 'Pendente',
    sections: [
      {
        title: 'Dados do funcionário',
        rows: [
          ['Código', item.staffCode],
          ['Nome', displayText(item.staffName)],
          ['Grupo', staffAttendanceLabels[type]],
          ['Cargo', displayText(item.positionName)],
        ],
      },
      {
        title: 'Dados da falta',
        rows: [
          ...(type === 'teachers' ? [
            ['Curso', joinCourses(item.courses, 'courseName')],
            ['Categoria', joinCourses(item.courses, 'categoryName')],
            ['Nível', joinCourses(item.courses, 'levelName')],
            ['Modalidade', joinCourses(item.courses, 'modalityName')],
          ] : []),
          ['Data da falta', toDisplayDate(item.date)],
          ['Estado', justificationLabels[item.justification]],
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
      description: `Justificação da falta de ${toDisplayDate(item.date)}`,
      amount: money(fee),
      paid: money(paid),
      balance: money(fee - paid),
    }],
    totals: {
      description: 'Total',
      amount: money(fee),
      paid: money(paid),
      balance: money(fee - paid),
    },
    payments: item.payment ? [{
      date: toDisplayDate(item.payment.paymentDate),
      description: 'Justificação de falta',
      method: displayText(methodLabel(item.payment.method)),
      reference: displayText(item.payment.reference),
      amount: money(item.payment.amount),
    }] : [],
  };
};

export default function StaffAttendanceTablesPage({ type, mode, readOnly = false }) {
  const isTeacher = type === 'teachers';
  const config = (buildColumns(isTeacher)[mode]) ?? buildColumns(isTeacher).list;
  const [records, setRecords] = useState([]);
  const [excesses, setExcesses] = useState([]);
  const [methods, setMethods] = useState([]);
  const [justificationFee, setJustificationFee] = useState(0);
  const [justifyItem, setJustifyItem] = useState(null);
  const [paymentItem, setPaymentItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [receiptItem, setReceiptItem] = useState(null);
  const [notificationItem, setNotificationItem] = useState(null);
  const [payment, setPayment] = useState({ paymentDate: todayIso(), method: '', reference: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { toneOf, labelOf, error: statusError } = useStatuses('ATTENDANCE_PRESENCE');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'excesses') {
        setExcesses(await getStaffAttendanceExcesses(type));
      } else {
        setRecords(await getStaffAttendanceRecords(type));
      }
      if (mode === 'absences' || mode === 'justified') {
        const [loadedMethods, loadedSettings] = await Promise.all([
          getPaymentMethods(),
          getOnlineAttendanceSettings(),
        ]);
        setMethods(loadedMethods.filter((item) => item.active));
        setJustificationFee(Number(loadedSettings.justificationFee || 0));
      }
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [mode, type]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const run = async (action, successMessage, onDone) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(successMessage);
      onDone?.();
      await loadData();
    } catch (actionError) {
      onDone?.();
      setError(errorMessage(actionError));
    } finally {
      setSaving(false);
    }
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!paymentItem) return;
    await run(
      () => payStaffAttendanceJustification(type, paymentItem.id, payment),
      `Pagamento registado para ${paymentItem.staffCode}.`,
      () => setPaymentItem(null),
    );
  };

  const rows = useMemo(() => {
    if (mode === 'excesses') return excesses;
    if (mode === 'absences') return records.filter((item) => item.status === 'ABSENT');
    if (mode === 'justified') return records.filter((item) => item.justification === 'JUSTIFIED');
    return records;
  }, [excesses, mode, records]);
  const visibleRows = useMemo(() => filterBySearch(rows, searchTerm, (item) => [
    item.staffCode,
    item.staffName,
    item.positionName,
    labelOf(item.status),
    justificationLabels[item.justification],
    ...(item.courses ?? []).flatMap((course) => [
      course.courseName, course.categoryName, course.levelName, course.modalityName,
    ]),
  ]), [rows, searchTerm, labelOf]);

  const exportColumns = config.columns.filter(({ key }) => key !== 'actions');
  const exportRows = visibleRows.map((item) => ({
    date: toDisplayDate(item.date ?? item.lastAbsenceDate),
    staffCode: item.staffCode,
    staffName: displayText(item.staffName),
    positionName: displayText(item.positionName),
    courseName: joinCourses(item.courses, 'courseName'),
    categoryName: joinCourses(item.courses, 'categoryName'),
    levelName: joinCourses(item.courses, 'levelName'),
    modalityName: joinCourses(item.courses, 'modalityName'),
    status: mode === 'excesses'
      ? `Excedeu (${item.absences}/${item.maxAbsences})`
      : labelOf(item.status),
    justification: justificationLabels[item.justification],
    fee: money(item.justificationFee || 0),
    justificationDate: item.justificationDate ? toDisplayDate(item.justificationDate) : '—',
  }));
  const receiptNumber = useReceiptNumber('STAFF_JUSTIFICATION', receiptItem?.id);
  const receipt = useMemo(
    () => (receiptItem ? { ...buildReceipt(receiptItem, type), number: receiptNumber } : null),
    [receiptItem, type, receiptNumber],
  );

  const personCells = (row) => (
    <>
      <TableCell>{row.staffCode}</TableCell>
      <TableCell>{displayText(row.staffName)}</TableCell>
      <TableCell>{displayText(row.positionName)}</TableCell>
      {isTeacher && (
        <>
          <TableCell>{lines(row.courses, 'courseName')}</TableCell>
          <TableCell>{lines(row.courses, 'categoryName')}</TableCell>
          <TableCell>{lines(row.courses, 'levelName')}</TableCell>
          <TableCell>{lines(row.courses, 'modalityName')}</TableCell>
        </>
      )}
    </>
  );
  const receiptButton = (row) => (
    <Tooltip title="Ver recibo">
      <IconButton aria-label={`Ver recibo de ${row.staffCode}`} onClick={() => setReceiptItem(row)}>
        <ReceiptText size={17} />
      </IconButton>
    </Tooltip>
  );

  const renderRow = (row, rowNumber) => {
    if (mode === 'excesses') {
      return (
        <TableRow key={row.staffId} hover>
          <TableCell>{rowNumber}</TableCell>
          {personCells(row)}
          <TableCell>{toDisplayDate(row.lastAbsenceDate)}</TableCell>
          <TableCell>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              <StatusBadge label={`Excedeu (${row.absences}/${row.maxAbsences})`} tone="pending" />
              {row.notified && <StatusBadge label="Notificado" tone="paid" />}
            </Stack>
          </TableCell>
          <TableCell align="right">
            {row.notified && (
              <Tooltip title="Ver notificação">
                <IconButton
                  aria-label={`Ver notificação de ${row.staffCode}`}
                  onClick={() => setNotificationItem(row)}
                >
                  <Bell size={17} />
                </IconButton>
              </Tooltip>
            )}
          </TableCell>
        </TableRow>
      );
    }
    if (mode === 'list') {
      const locked = row.justification !== 'NONE';
      return (
        <TableRow key={row.id} hover>
          <TableCell>{rowNumber}</TableCell>
          <TableCell>{toDisplayDate(row.date)}</TableCell>
          {personCells(row)}
          <TableCell>
            <StatusBadge label={labelOf(row.status)} tone={toneOf(row.status)} />
          </TableCell>
          <TableCell align="right">
            {!readOnly && (<>
            <Tooltip title={locked ? 'Falta com justificação iniciada' : 'Alterar estado'}>
              <span>
                <IconButton
                  aria-label={`Alterar estado de ${row.staffCode}`}
                  disabled={locked || saving}
                  onClick={() => run(
                    () => updateStaffAttendanceStatus(
                      type, row.id, row.status === 'PRESENT' ? 'ABSENT' : 'PRESENT',
                    ),
                    `Estado de ${row.staffCode} actualizado.`,
                  )}
                >
                  <ArrowLeftRight size={17} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={locked ? 'Falta com justificação iniciada' : 'Apagar'}>
              <span>
                <IconButton
                  className="cacoin-table-action-delete"
                  aria-label={`Apagar registo de ${row.staffCode}`}
                  disabled={locked || saving}
                  onClick={() => setDeleteItem(row)}
                >
                  <Trash2 size={17} />
                </IconButton>
              </span>
            </Tooltip>
            </>)}
          </TableCell>
        </TableRow>
      );
    }
    return (
      <TableRow key={row.id} hover>
        <TableCell>{rowNumber}</TableCell>
        {personCells(row)}
        <TableCell>{toDisplayDate(row.date)}</TableCell>
        {mode === 'justified' && (
          <>
            <TableCell><Money value={row.justificationFee} /></TableCell>
            <TableCell>{row.justificationDate ? toDisplayDate(row.justificationDate) : '—'}</TableCell>
          </>
        )}
        <TableCell>
          {mode === 'justified'
            ? <StatusBadge label="Justificada" tone="paid" />
            : <AttendanceStatusBar justification={row.justification} />}
        </TableCell>
        <TableCell align="right">
          <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
            {row.justification !== 'NONE' && receiptButton(row)}
            {!readOnly && mode === 'absences' && row.justification === 'NONE' && (
              <Tooltip title="Justificar">
                <IconButton
                  aria-label={`Justificar falta de ${row.staffCode}`}
                  disabled={saving}
                  onClick={() => setJustifyItem(row)}
                >
                  <ShieldCheck size={17} />
                </IconButton>
              </Tooltip>
            )}
            {!readOnly && mode === 'absences' && row.justification === 'PAYMENT_PENDING' && (
              <Tooltip title="Pagar">
                <IconButton
                  aria-label={`Pagar justificação de ${row.staffCode}`}
                  disabled={saving}
                  onClick={() => {
                    setError('');
                    setPaymentItem(row);
                    setPayment({
                      paymentDate: todayIso(),
                      method: methods[0]?.name ?? '',
                      reference: '',
                    });
                  }}
                >
                  <WalletCards size={17} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Funcionários</p>
          <h1>{config.title}</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename={`presencas-funcionarios-${type}-${mode}`}
            title={`${config.title} — ${staffAttendanceLabels[type]}`}
            disabled={loading}
            onError={(exportError) => setError(errorMessage(exportError))}
          />
        </div>
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {(error || statusError) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error || statusError}</Alert>
      )}
      <StandardTable
        audit={(row) => (mode === 'excesses' ? null : { entity: 'StaffAttendanceRecord', id: row.id })}
        key={`${type}-${mode}`}
        ariaLabel={config.title}
        columns={config.columns}
        emptyMessage={error
          ? 'Não foi possível carregar os dados.'
          : searchTerm.trim() ? 'Nenhum registo corresponde à pesquisa.' : config.empty}
        loading={loading}
        rows={visibleRows}
        renderRow={renderRow}
      />

      <Dialog open={Boolean(receiptItem)} onClose={() => setReceiptItem(null)} fullWidth maxWidth="md">
        <DialogTitle>Recibo — {receiptItem?.staffCode}</DialogTitle>
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
        open={Boolean(justifyItem)}
        onClose={() => {
          if (!saving) setJustifyItem(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Justificar falta</DialogTitle>
        <DialogContent>
          Iniciar a justificação da falta de {justifyItem?.staffCode} em{' '}
          {justifyItem && toDisplayDate(justifyItem.date)}? Taxa de justificação:{' '}
          <Money value={justificationFee} />.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJustifyItem(null)} disabled={saving}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={() => run(
              () => requestStaffAttendanceJustification(type, justifyItem.id),
              `Justificação iniciada para ${justifyItem.staffCode}.`,
              () => setJustifyItem(null),
            )}
          >
            {saving ? 'A guardar…' : 'Justificar'}
          </Button>
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
          <DialogTitle>Pagamento — {paymentItem?.staffCode}</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Alert severity="info">
                {displayText(paymentItem?.staffName)}
                {' · Taxa de justificação: '}<Money value={paymentItem?.justificationFee} />
              </Alert>
              {methods.length === 0 && (
                <Alert severity="warning">
                  Não existem métodos de pagamento activos. Configure um método em Configurações.
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
        open={Boolean(deleteItem)}
        onClose={() => {
          if (!saving) setDeleteItem(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Apagar registo</DialogTitle>
        <DialogContent>
          Apagar o registo de {deleteItem?.staffCode} em{' '}
          {deleteItem && toDisplayDate(deleteItem.date)}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteItem(null)} disabled={saving}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={saving}
            onClick={() => run(
              () => deleteStaffAttendanceRecord(type, deleteItem.id),
              'Registo apagado.',
              () => setDeleteItem(null),
            )}
          >
            {saving ? 'A apagar…' : 'Apagar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(notificationItem)}
        onClose={() => setNotificationItem(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Notificação — {notificationItem?.staffCode}</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ pt: 1 }}>
            <span>
              Enviada a {notificationItem?.notifiedAt && toDisplayDate(notificationItem.notifiedAt)}
              {' · '}{notificationItem?.absences} faltas (máximo {notificationItem?.maxAbsences})
            </span>
            <Alert severity="info" icon={false}>{notificationItem?.notificationMessage}</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotificationItem(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
