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
import {
  deleteAttendanceRecord,
  getAttendanceExcesses,
  getAttendanceRecords,
  getOnlineAttendanceSettings,
  getPaymentMethods,
  payAttendanceJustification,
  requestAttendanceJustification,
  updateAttendanceStatus,
} from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatMoney as money } from '../../utils/money';
import { methodLabel } from '../../utils/paymentMethods';
import { filterBySearch } from '../../utils/search';
import AttendanceStatusBar from './AttendanceStatusBar';
import {
  attendanceBadgeClass,
  attendanceStatusLabels,
  errorMessage,
  formatDuration,
  justificationLabels,
} from './attendanceUtils';
import DateField from '../../components/DateField';

const today = () => {
  const date = systemDate();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const student = [
  { key: 'studentCode', label: 'Código do Estudante' },
  { key: 'studentName', label: 'Nome' },
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
  { key: 'duration', label: 'Duração' },
];
const configs = {
  list: {
    title: 'Presenças',
    columns: [
      { key: 'date', label: 'Data' },
      ...student,
      { key: 'status', label: 'Estado' },
      { key: 'actions', label: 'Acções', align: 'right' },
    ],
    empty: 'Ainda não existem presenças registadas.',
  },
  absences: {
    title: 'Faltas',
    columns: [
      ...student,
      { key: 'date', label: 'Data da Falta' },
      { key: 'teacherName', label: 'Professor' },
      { key: 'justification', label: 'Estado' },
      { key: 'actions', label: 'Acções', align: 'right' },
    ],
    empty: 'Ainda não existem faltas registadas.',
  },
  justified: {
    title: 'Justificadas',
    columns: [
      ...student,
      { key: 'date', label: 'Data da Falta' },
      { key: 'teacherName', label: 'Professor' },
      { key: 'fee', label: 'Taxa de Justificação' },
      { key: 'justificationDate', label: 'Data de Justificação' },
      { key: 'justification', label: 'Estado' },
      { key: 'actions', label: 'Acções', align: 'right' },
    ],
    empty: 'Ainda não existem faltas justificadas.',
  },
  excesses: {
    title: 'Excessos',
    columns: [
      ...student,
      { key: 'date', label: 'Data da Falta' },
      { key: 'teacherName', label: 'Professor' },
      { key: 'status', label: 'Estado' },
      { key: 'actions', label: 'Acções', align: 'right' },
    ],
    empty: 'Nenhum estudante excedeu o número máximo de faltas.',
  },
};

const buildReceipt = (item) => {
  const fee = Number(item.justificationFee || 0);
  const paid = item.justification === 'JUSTIFIED' ? fee : 0;
  return {
    filename: `recibo-justificacao-${item.studentCode}-${item.id}`,
    title: 'Recibo de justificação de falta',
    number: '',
    issueDate: toDisplayDate(today()),
    status: item.justification === 'JUSTIFIED' ? 'Pago' : 'Pendente',
    sections: [
      {
        title: 'Dados do estudante',
        rows: [
          ['Código', item.studentCode],
          ['Nome', displayText(item.studentName)],
        ],
      },
      {
        title: 'Dados da falta',
        rows: [
          ['Curso', displayText(item.courseName)],
          ['Categoria', displayText(item.categoryName)],
          ['Nível', displayText(item.levelName)],
          ['Modalidade', displayText(item.modalityName)],
          ['Duração', formatDuration(item.durationMonths) || '—'],
          ['Data da falta', toDisplayDate(item.date)],
          ['Professor', displayText(item.teacherName)],
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

export default function AttendanceTablesPage({ mode }) {
  const config = configs[mode] ?? configs.list;
  const [records, setRecords] = useState([]);
  const [excesses, setExcesses] = useState([]);
  const [methods, setMethods] = useState([]);
  const [justificationFee, setJustificationFee] = useState(0);
  const [justifyItem, setJustifyItem] = useState(null);
  const [paymentItem, setPaymentItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [receiptItem, setReceiptItem] = useState(null);
  const [notificationItem, setNotificationItem] = useState(null);
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
      if (mode === 'excesses') {
        setExcesses(await getAttendanceExcesses());
      } else {
        setRecords(await getAttendanceRecords());
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
  }, [mode]);

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
      () => payAttendanceJustification(paymentItem.id, payment),
      `Pagamento registado para ${paymentItem.studentCode}.`,
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
    item.studentCode,
    item.studentName,
    item.courseName,
    item.categoryName,
    item.levelName,
    item.modalityName,
    item.teacherName,
    attendanceStatusLabels[item.status],
    justificationLabels[item.justification],
  ]), [rows, searchTerm]);

  const exportColumns = config.columns.filter(({ key }) => key !== 'actions');
  const exportRows = visibleRows.map((item) => ({
    date: mode === 'excesses' || mode === 'absences' || mode === 'justified'
      ? toDisplayDate(item.date ?? item.lastAbsenceDate)
      : toDisplayDate(item.date),
    studentCode: item.studentCode,
    studentName: displayText(item.studentName),
    courseName: displayText(item.courseName),
    categoryName: displayText(item.categoryName),
    levelName: displayText(item.levelName),
    modalityName: displayText(item.modalityName),
    duration: formatDuration(item.durationMonths) || '—',
    teacherName: displayText(item.teacherName),
    status: mode === 'excesses'
      ? `Excedeu (${item.absences}/${item.maxAbsences})`
      : attendanceStatusLabels[item.status],
    justification: justificationLabels[item.justification],
    fee: money(item.justificationFee || 0),
    justificationDate: item.justificationDate ? toDisplayDate(item.justificationDate) : '—',
  }));
  const receiptNumber = useReceiptNumber('JUSTIFICATION', receiptItem?.id);
  const receipt = useMemo(
    () => (receiptItem ? { ...buildReceipt(receiptItem), number: receiptNumber } : null),
    [receiptItem, receiptNumber],
  );

  const studentCells = (row) => (
    <>
      <TableCell>{row.studentCode}</TableCell>
      <TableCell>{displayText(row.studentName)}</TableCell>
      <TableCell>{displayText(row.courseName)}</TableCell>
      <TableCell>{displayText(row.categoryName)}</TableCell>
      <TableCell>{displayText(row.levelName)}</TableCell>
      <TableCell>{displayText(row.modalityName)}</TableCell>
      <TableCell>{formatDuration(row.durationMonths) || '—'}</TableCell>
    </>
  );
  const receiptButton = (row) => (
    <Tooltip title="Ver recibo">
      <IconButton
        aria-label={`Ver recibo de ${row.studentCode}`}
        onClick={() => setReceiptItem(row)}
      >
        <ReceiptText size={17} />
      </IconButton>
    </Tooltip>
  );

  const renderRow = (row, rowNumber) => {
    if (mode === 'excesses') {
      return (
        <TableRow key={row.studentId} hover>
          <TableCell>{rowNumber}</TableCell>
          {studentCells(row)}
          <TableCell>{toDisplayDate(row.lastAbsenceDate)}</TableCell>
          <TableCell>{displayText(row.teacherName)}</TableCell>
          <TableCell>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              <span className="cacoin-status-badge pending">
                {`Excedeu (${row.absences}/${row.maxAbsences})`}
              </span>
              {row.notified && <span className="cacoin-status-badge paid">Notificado</span>}
            </Stack>
          </TableCell>
          <TableCell align="right">
            {row.notified && (
              <Tooltip title="Ver notificação">
                <IconButton
                  aria-label={`Ver notificação de ${row.studentCode}`}
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
          {studentCells(row)}
          <TableCell>
            <span className={`cacoin-status-badge ${attendanceBadgeClass(row.status)}`}>
              {attendanceStatusLabels[row.status]}
            </span>
          </TableCell>
          <TableCell align="right">
            <Tooltip title={locked ? 'Falta com justificação iniciada' : 'Alterar estado'}>
              <span>
                <IconButton
                  aria-label={`Alterar estado de ${row.studentCode}`}
                  disabled={locked || saving}
                  onClick={() => run(
                    () => updateAttendanceStatus(
                      row.id,
                      row.status === 'PRESENT' ? 'ABSENT' : 'PRESENT',
                    ),
                    `Estado de ${row.studentCode} actualizado.`,
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
                  aria-label={`Apagar registo de ${row.studentCode}`}
                  disabled={locked || saving}
                  onClick={() => setDeleteItem(row)}
                >
                  <Trash2 size={17} />
                </IconButton>
              </span>
            </Tooltip>
          </TableCell>
        </TableRow>
      );
    }
    return (
      <TableRow key={row.id} hover>
        <TableCell>{rowNumber}</TableCell>
        {studentCells(row)}
        <TableCell>{toDisplayDate(row.date)}</TableCell>
        <TableCell>{displayText(row.teacherName)}</TableCell>
        {mode === 'justified' && (
          <>
            <TableCell><Money value={row.justificationFee} /></TableCell>
            <TableCell>{row.justificationDate ? toDisplayDate(row.justificationDate) : '—'}</TableCell>
          </>
        )}
        <TableCell>
          {mode === 'justified' ? (
            <span className="cacoin-status-badge paid">Justificada</span>
          ) : (
            <AttendanceStatusBar justification={row.justification} />
          )}
        </TableCell>
        <TableCell align="right">
          <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
            {row.justification !== 'NONE' && receiptButton(row)}
            {mode === 'absences' && row.justification === 'NONE' && (
              <Tooltip title="Justificar">
                <IconButton
                  aria-label={`Justificar falta de ${row.studentCode}`}
                  disabled={saving}
                  onClick={() => setJustifyItem(row)}
                >
                  <ShieldCheck size={17} />
                </IconButton>
              </Tooltip>
            )}
            {mode === 'absences' && row.justification === 'PAYMENT_PENDING' && (
              <Tooltip title="Pagar">
                <IconButton
                  aria-label={`Pagar justificação de ${row.studentCode}`}
                  disabled={saving}
                  onClick={() => {
                    setError('');
                    setPaymentItem(row);
                    setPayment({
                      paymentDate: today(),
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
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>{config.title}</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename={`presencas-${mode}`}
            title={config.title}
            disabled={loading}
            onError={(exportError) => setError(errorMessage(exportError))}
          />
        </div>
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <StandardTable
        audit={(row) => (mode === 'excesses' ? null : { entity: 'AttendanceRecord', id: row.id })}
        key={mode}
        ariaLabel={config.title}
        columns={config.columns}
        emptyMessage={error
          ? 'Não foi possível carregar os dados.'
          : searchTerm.trim()
            ? 'Nenhum registo corresponde à pesquisa.'
            : config.empty}
        loading={loading}
        rows={visibleRows}
        renderRow={renderRow}
      />

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
        open={Boolean(justifyItem)}
        onClose={() => {
          if (!saving) setJustifyItem(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Justificar falta</DialogTitle>
        <DialogContent>
          Iniciar a justificação da falta de {justifyItem?.studentCode} em{' '}
          {justifyItem && toDisplayDate(justifyItem.date)}? Taxa de justificação:{' '}
          <Money value={justificationFee} />.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJustifyItem(null)} disabled={saving}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={() => run(
              () => requestAttendanceJustification(justifyItem.id),
              `Justificação iniciada para ${justifyItem.studentCode}.`,
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
          <DialogTitle>Pagamento — {paymentItem?.studentCode}</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Alert severity="info">
                {displayText(paymentItem?.studentName)}
                {' · Taxa de justificação: '}<Money value={paymentItem?.justificationFee} />
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
        open={Boolean(deleteItem)}
        onClose={() => {
          if (!saving) setDeleteItem(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Apagar registo</DialogTitle>
        <DialogContent>
          Apagar o registo de {deleteItem?.studentCode} em{' '}
          {deleteItem && toDisplayDate(deleteItem.date)}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteItem(null)} disabled={saving}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={saving}
            onClick={() => run(
              () => deleteAttendanceRecord(deleteItem.id),
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
        <DialogTitle>Notificação — {notificationItem?.studentCode}</DialogTitle>
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
