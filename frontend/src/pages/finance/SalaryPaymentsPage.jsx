import { isTeacherMode } from '../../utils/teacherMode';
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
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { BadgeCheck, ReceiptText } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import Money from '../../components/Money';
import ReceiptView from '../../components/ReceiptView';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import {
  advanceSalary,
  confirmSalaryReceipt,
  getFinanceSettings,
  getSalaryDebts,
  getSalaryPayments,
  getSalaryPending,
  getSalaryRegistrations,
  liquidateSalary,
  processSalary,
} from '../../services/api';
import { displayText } from '../../utils/displayText';
import { formatMoney as money } from '../../utils/money';
import { filterBySearch } from '../../utils/search';
import { formatNib } from '../mobilemoney/mobileMoneyUtils';
import EmployeePicker from './EmployeePicker';
import { ownDetails, withoutPersonal } from './ownReport';
import {
  errorMessage,
  formatDateTime,
  monthLabel,
  nextMonths,
  parseAmount,
  statusClass,
  statusLabels,
} from './financeUtils';

const heading = {
  process: ['Processamento', 'Processar'],
  processed: ['Processamento', 'Processados'],
  advance: ['Adiantamento', 'Adiantar'],
  advanced: ['Adiantamento', 'Adiantados'],
  settle: ['Dívidas', 'Liquidar'],
};
const personColumns = [
  { key: 'staffCode', label: 'Código do Funcionário' },
  { key: 'staffName', label: 'Nome' },
  { key: 'phone', label: 'Telefone' },
  { key: 'biNumber', label: 'BI' },
  { key: 'nuit', label: 'NUIT' },
  { key: 'positionName', label: 'Cargo' },
  { key: 'salaryTypeName', label: 'Tipo de Salário' },
  { key: 'salary', label: 'Salário' },
  { key: 'bonusTypeName', label: 'Tipo de Bónus' },
  { key: 'bonus', label: 'Bónus' },
  { key: 'discountedBalance', label: 'Saldo Descontado' },
  { key: 'bankName', label: 'Banco' },
  { key: 'account', label: 'Conta' },
  { key: 'nib', label: 'NIB' },
  { key: 'observation', label: 'Observação' },
  { key: 'processedAt', label: 'Data/Hora de Processamento' },
  { key: 'confirmation', label: 'Confirmação do Recebimento' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: 'Acções', align: 'right' },
];

const buildPayslip = (item) => {
  const gross = Number(item.paidAmount) + Number(item.bonus);
  const bank = {
    bank: (item.bankName || '—'),
    account: item.account || '—',
    nib: formatNib(item.nib) || '—',
  };
  return {
    filename: `recibo-salario-${item.staffCode}-${String(item.month).slice(0, 7)}`,
    title: 'Recibo de salário',
    number: '',
    issueDate: formatDateTime(item.processedAt).slice(0, 10),
    status: statusLabels[item.status],
    signer: 'O Funcionário',
    sections: [
      {
        title: 'Dados do funcionário',
        rows: [
          ['Código', item.staffCode],
          ['Nome', displayText(item.staffName)],
          ['Telefone', displayText(item.phone)],
          ['BI', displayText(item.biNumber)],
          ['NUIT', displayText(item.nuit)],
          ['Cargo', displayText(item.positionName)],
        ],
      },
      {
        title: 'Dados do pagamento',
        rows: [
          ['Mês de referência', monthLabel(item.month)],
          ['Tipo de salário', displayText(item.salaryTypeName)],
          ['Observação', displayText(item.observation)],
          ['Confirmação', item.confirmedAt ? `Confirmado em ${formatDateTime(item.confirmedAt)}` : 'Pendente'],
        ],
      },
    ],
    columns: [
      { key: 'description', label: 'Descrição' },
      { key: 'amount', label: 'Valor', align: 'right' },
      { key: 'paid', label: 'Pago', align: 'right' },
      { key: 'balance', label: 'Saldo descontado', align: 'right' },
      { key: 'bank', label: 'Banco' },
      { key: 'account', label: 'Conta' },
      { key: 'nib', label: 'NIB' },
    ],
    items: [
      {
        description: 'Salário',
        amount: money(item.salary),
        paid: money(item.paidAmount),
        balance: money(item.discountedBalance),
        ...bank,
      },
      ...(Number(item.bonus) > 0 ? [{
        description: `Bónus${item.bonusTypeName ? ` — ${item.bonusTypeName}` : ''}`,
        amount: money(item.bonus),
        paid: money(item.bonus),
        balance: money(0),
        ...bank,
      }] : []),
    ],
    totals: {
      description: 'Total pago',
      amount: money(Number(item.salary) + Number(item.bonus)),
      paid: money(gross),
      balance: money(item.discountedBalance),
    },
    payments: [],
  };
};

function PaymentForm({ mode }) {
  const [settings, setSettings] = useState(null);
  const [options, setOptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [month, setMonth] = useState('');
  const [amount, setAmount] = useState('');
  const [observation, setObservation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedSettings, loadedPayments] = await Promise.all([
        getFinanceSettings(),
        getSalaryPayments(),
      ]);
      setSettings(loadedSettings);
      setPayments(loadedPayments);
      if (mode === 'process') setOptions(await getSalaryPending());
      else if (mode === 'advance') setOptions(await getSalaryRegistrations());
      else {
        const debts = await getSalaryDebts();
        setOptions(debts.map((debt) => ({ ...debt, id: debt.staffId, staffId: debt.staffId })));
      }
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  const rule = settings?.paymentRule ?? 'FULL';
  const nowIso = (() => {
    const date = systemDate();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  })();
  const monthOptions = useMemo(() => {
    if (!selected) return [];
    if (mode === 'settle') return selected.months.map((item) => ({ month: item.month, owed: item.owed }));
    if (mode === 'advance') {
      const taken = new Set(payments.filter((item) => item.staffId === selected.staffId).map((item) => item.month));
      return nextMonths(settings?.maxAdvanceMonths ?? 0)
        .filter((item) => !taken.has(item))
        .map((item) => ({ month: item, owed: Number(selected.salary) }));
    }
    const existing = payments.find((item) => item.staffId === selected.staffId && item.month === nowIso);
    return [{ month: nowIso, owed: existing ? Number(existing.discountedBalance) : Number(selected.salary) }];
  }, [mode, nowIso, payments, selected, settings]);
  const chosenMonth = mode === 'process' ? monthOptions[0] : monthOptions.find((item) => item.month === month);
  const max = chosenMonth?.owed ?? 0;
  const paying = rule === 'FULL' ? max : parseAmount(amount);
  const discounted = Number.isFinite(paying) ? Math.max(0, max - paying) : max;
  const amountError = rule === 'PARTIAL' && amount !== '' && (paying <= 0 || paying > max)
    ? `O valor deve ser superior a zero e até ${money(max)}`
    : '';

  const choose = (value) => {
    setSelected(value);
    setMonth('');
    setAmount('');
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!selected || !chosenMonth || (rule === 'PARTIAL' && (!(paying > 0) || paying > max))) {
      setError('Selecione o funcionário, o mês e um valor válido.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      staffId: selected.staffId,
      month: mode === 'process' ? null : chosenMonth.month,
      amount: rule === 'PARTIAL' ? paying : null,
      observation: observation.trim() || null,
    };
    try {
      const action = mode === 'process' ? processSalary : mode === 'advance' ? advanceSalary : liquidateSalary;
      const created = await action(payload);
      setNotice(`Pagamento de ${monthLabel(created.month)} registado para ${created.staffCode}.`);
      setSelected(null);
      setMonth('');
      setAmount('');
      setObservation('');
      await load();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {mode === 'advance' && settings && settings.maxAdvanceMonths <= 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {'Os adiantamentos não estão permitidos. Defina os meses em Configurações > Finanças > Definição.'}
        </Alert>
      )}
      <form className="cacoin-test-registration-form" onSubmit={submit}>
        {mode === 'advance' && (
          <Autocomplete
            options={monthOptions}
            value={monthOptions.find((item) => item.month === month) ?? null}
            onChange={(_, value) => setMonth(value?.month ?? '')}
            getOptionLabel={(option) => monthLabel(option.month)}
            isOptionEqualToValue={(option, value) => option.month === value.month}
            disabled={!selected}
            renderInput={(params) => <TextField {...params} required label="Mês de Adiantamento" size="small" />}
          />
        )}
        <EmployeePicker employees={options} value={selected} onChange={choose} disabled={loading} />
        {mode === 'settle' && (
          <Autocomplete
            options={monthOptions}
            value={monthOptions.find((item) => item.month === month) ?? null}
            onChange={(_, value) => setMonth(value?.month ?? '')}
            getOptionLabel={(option) => `${monthLabel(option.month)} (${money(option.owed)})`}
            isOptionEqualToValue={(option, value) => option.month === value.month}
            disabled={!selected}
            renderInput={(params) => <TextField {...params} required label="Mês de Dívida" size="small" />}
          />
        )}
        <TextField size="small" label="Cargo" value={selected ? displayText(selected.positionName) : ''} disabled />
        <TextField size="small" label="Tipo de Salário" value={selected ? displayText(selected.salaryTypeName) : ''} disabled />
        <TextField
          size="small"
          label="Salário"
          type={rule === 'PARTIAL' ? 'number' : 'text'}
          value={rule === 'PARTIAL' ? amount : (chosenMonth ? money(max) : '')}
          onChange={(event) => setAmount(event.target.value)}
          error={Boolean(amountError)}
          helperText={amountError || (rule === 'PARTIAL' && chosenMonth ? `Máximo ${money(max)}` : undefined)}
          disabled={rule === 'PARTIAL' ? !chosenMonth : true}
          slotProps={rule === 'PARTIAL' ? { htmlInput: { min: 0.01, max, step: 0.01 } } : undefined}
        />
        <TextField size="small" label="Tipo de Bónus" value={selected ? displayText(selected.bonusTypeName) : ''} disabled />
        <TextField size="small" label="Bónus" value={selected?.bonusTypeName ? money(selected.bonus) : ''} disabled />
        <TextField size="small" label="Saldo Descontado" value={chosenMonth ? money(discounted) : ''} disabled />
        {mode !== 'settle' && (
          <>
            <TextField size="small" label="Banco" value={selected ? (selected.bankName || '—') : ''} disabled />
            <TextField size="small" label="Conta" value={selected?.account ?? ''} disabled />
            <TextField size="small" label="NIB" value={selected ? formatNib(selected.nib) : ''} disabled />
          </>
        )}
        <TextField
          size="small"
          label="Observação"
          value={observation}
          onChange={(event) => setObservation(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
        <div className="cacoin-test-registration-actions">
          <Button type="submit" variant="contained" disabled={saving || loading || !selected}>
            {saving ? 'A processar…' : heading[mode][1]}
          </Button>
        </div>
      </form>
    </>
  );
}

function PaymentList({ mode }) {
  const advanced = mode === 'advanced';
  const [rows, setRows] = useState([]);
  const [receiptItem, setReceiptItem] = useState(null);
  const [confirmItem, setConfirmItem] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getSalaryPayments(advanced ? 'ADVANCE' : 'PROCESSING')
      .then((loaded) => {
        if (mounted) setRows(loaded);
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
  }, [advanced]);

  const own = isTeacherMode();
  const columns = useMemo(() => {
    const list = advanced
      ? [{ key: 'month', label: 'Mês de Adiantamento' }, ...personColumns]
      : [{ key: 'month', label: 'Mês' }, ...personColumns];
    return own ? withoutPersonal(list) : list;
  }, [advanced, own]);
  const visible = useMemo(() => filterBySearch(rows, searchTerm, (item) => [
    item.staffCode, item.staffName, item.phone, item.biNumber, item.nuit,
    item.positionName, item.salaryTypeName, monthLabel(item.month), statusLabels[item.status],
    item.bankName, item.account, item.nib,
  ]), [rows, searchTerm]);
  const confirmationText = (item) => (
    item.confirmedAt ? `Confirmado em ${formatDateTime(item.confirmedAt)}` : 'Pendente'
  );
  const confirmReceipt = async () => {
    setConfirming(true);
    setError('');
    try {
      const updated = await confirmSalaryReceipt(confirmItem.id);
      setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      setNotice('Recebimento confirmado.');
    } catch (confirmError) {
      setError(errorMessage(confirmError));
    } finally {
      setConfirming(false);
      setConfirmItem(null);
    }
  };
  const exportColumns = columns.filter(({ key }) => key !== 'actions');
  const exportRows = visible.map((item) => ({
    month: monthLabel(item.month),
    staffCode: item.staffCode,
    staffName: displayText(item.staffName),
    phone: displayText(item.phone),
    biNumber: displayText(item.biNumber),
    nuit: displayText(item.nuit),
    positionName: displayText(item.positionName),
    salaryTypeName: displayText(item.salaryTypeName),
    salary: money(item.paidAmount),
    bonusTypeName: displayText(item.bonusTypeName),
    bonus: Number(item.bonus) > 0 ? money(item.bonus) : '—',
    discountedBalance: money(item.discountedBalance),
    bankName: (item.bankName || '—'),
    account: item.account || '—',
    nib: formatNib(item.nib) || '—',
    observation: displayText(item.observation),
    processedAt: formatDateTime(item.processedAt),
    confirmation: confirmationText(item),
    status: statusLabels[item.status],
  }));
  const receiptNumber = useReceiptNumber('SALARY', receiptItem?.id);
  const receipt = useMemo(
    () => (receiptItem ? { ...buildPayslip(receiptItem), number: receiptNumber } : null),
    [receiptItem, receiptNumber],
  );

  return (
    <>
      <div className="cacoin-page-heading-actions" style={{ marginBottom: 12 }}>
        {!isTeacherMode() && <SearchField value={searchTerm} onChange={setSearchTerm} />}
        <DataExportMenu
          columns={exportColumns}
          rows={exportRows}
          details={own ? ownDetails(visible[0]) : undefined}
          filename={advanced ? 'salarios-adiantados' : 'salarios-processados'}
          title={advanced ? 'Salários adiantados' : 'Salários processados'}
          disabled={loading}
          onError={(exportError) => setError(errorMessage(exportError))}
        />
      </div>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <StandardTable
        audit="SalaryPayment"
        ariaLabel={advanced ? 'Salários adiantados' : 'Salários processados'}
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar os dados.'
          : searchTerm.trim()
            ? 'Nenhum registo corresponde à pesquisa.'
            : advanced ? 'Ainda não existem salários adiantados.' : 'Ainda não existem salários processados.'}
        loading={loading}
        rows={visible}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{monthLabel(row.month)}</TableCell>
            {!own && (
              <>
                <TableCell>{row.staffCode}</TableCell>
                <TableCell>{displayText(row.staffName)}</TableCell>
                <TableCell>{displayText(row.phone)}</TableCell>
                <TableCell>{displayText(row.biNumber)}</TableCell>
                <TableCell>{displayText(row.nuit)}</TableCell>
                <TableCell>{displayText(row.positionName)}</TableCell>
                <TableCell>{displayText(row.salaryTypeName)}</TableCell>
              </>
            )}
            <TableCell><Money value={row.paidAmount} /></TableCell>
            <TableCell>{displayText(row.bonusTypeName)}</TableCell>
            <TableCell>{Number(row.bonus) > 0 ? <Money value={row.bonus} /> : '—'}</TableCell>
            <TableCell><Money value={row.discountedBalance} /></TableCell>
            <TableCell>{(row.bankName || '—')}</TableCell>
            <TableCell>{row.account || '—'}</TableCell>
            <TableCell>{formatNib(row.nib) || '—'}</TableCell>
            <TableCell>{displayText(row.observation)}</TableCell>
            <TableCell>{formatDateTime(row.processedAt)}</TableCell>
            <TableCell>
              <span className={`cacoin-status-badge ${row.confirmedAt ? 'paid' : 'pending'}`}>
                {confirmationText(row)}
              </span>
            </TableCell>
            <TableCell>
              <span className={`cacoin-status-badge ${statusClass(row.status)}`}>
                {statusLabels[row.status]}
              </span>
            </TableCell>
            <TableCell align="right">
              {own && !row.confirmedAt && (
                <Tooltip title="Confirmar recebimento">
                  <IconButton
                    aria-label={`Confirmar recebimento de ${monthLabel(row.month)}`}
                    disabled={confirming}
                    onClick={() => setConfirmItem(row)}
                  >
                    <BadgeCheck size={17} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Ver recibo">
                <IconButton
                  aria-label={`Ver recibo de ${row.staffCode}`}
                  onClick={() => setReceiptItem(row)}
                >
                  <ReceiptText size={17} />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />
      <Dialog open={Boolean(confirmItem)} onClose={() => !confirming && setConfirmItem(null)} fullWidth maxWidth="xs">
        <DialogTitle>Confirmar recebimento</DialogTitle>
        <DialogContent>
          Confirma que recebeu o pagamento de {monthLabel(confirmItem?.month)}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmItem(null)} disabled={confirming}>Cancelar</Button>
          <Button variant="contained" onClick={confirmReceipt} disabled={confirming}>
            {confirming ? 'A confirmar…' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
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
    </>
  );
}

export default function SalaryPaymentsPage({ mode }) {
  const [, title] = heading[mode] ?? heading.process;
  const isForm = mode === 'process' || mode === 'advance' || mode === 'settle';
  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Finanças</p>
          <h1>{title}</h1>
        </div>
      </header>
      {isForm ? <PaymentForm mode={mode} /> : <PaymentList mode={mode} />}
    </section>
  );
}
