import { isTeacherMode } from '../../utils/teacherMode';
import { systemDate } from '../../utils/systemDate';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  TableCell,
  TableRow,
  TextField,
} from '@mui/material';
import DataExportMenu from '../../components/DataExportMenu';
import Money from '../../components/Money';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import { getFinanceReport, getSalaryRegistrations } from '../../services/api';
import { displayText } from '../../utils/displayText';
import { formatMoney as money } from '../../utils/money';
import { filterBySearch } from '../../utils/search';
import EmployeePicker from './EmployeePicker';
import {
  errorMessage,
  formatDateTime,
  kindLabels,
  monthLabel,
  statusClass,
  statusLabels,
} from './financeUtils';

const columns = [
  { key: 'staffCode', label: 'Código do Funcionário' },
  { key: 'staffName', label: 'Nome' },
  { key: 'phone', label: 'Telefone' },
  { key: 'biNumber', label: 'BI' },
  { key: 'nuit', label: 'NUIT' },
  { key: 'positionName', label: 'Cargo' },
  { key: 'salaryTypeName', label: 'Tipo de Salário' },
  { key: 'month', label: 'Mês' },
  { key: 'status', label: 'Estado' },
  { key: 'kind', label: 'Origem' },
  { key: 'salary', label: 'Salário' },
  { key: 'paidAmount', label: 'Pago' },
  { key: 'bonus', label: 'Bónus' },
  { key: 'owed', label: 'Em Falta' },
  { key: 'processedAt', label: 'Data/Hora de Processamento' },
  { key: 'observation', label: 'Observação' },
];

const personalKeys = [
  'staffCode', 'staffName', 'phone', 'biNumber', 'nuit', 'positionName', 'salaryTypeName',
];

export default function SalaryReportsPage() {
  const own = isTeacherMode();
  // O professor só vê o seu relatório: os dados pessoais vão no cabeçalho, não em cada linha.
  const tableColumns = own ? columns.filter(({ key }) => !personalKeys.includes(key)) : columns;
  const currentYear = systemDate().getFullYear();
  const [registrations, setRegistrations] = useState([]);
  const [year, setYear] = useState(currentYear);
  const [scope, setScope] = useState('all');
  const [employee, setEmployee] = useState(null);
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getSalaryRegistrations()
      .then((loaded) => {
        if (mounted) setRegistrations(loaded);
      })
      .catch((loadError) => {
        if (mounted) setError(errorMessage(loadError));
      });
    return () => {
      mounted = false;
    };
  }, []);

  const staffId = scope === 'each' ? employee?.staffId ?? null : null;
  const ready = scope === 'all' || Boolean(staffId);
  useEffect(() => {
    let mounted = true;
    if (!ready) {
      setRows([]);
      return () => {
        mounted = false;
      };
    }
    setLoading(true);
    getFinanceReport({ year, staffId })
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
  }, [ready, staffId, year]);

  const years = useMemo(
    () => Array.from({ length: 6 }, (_, index) => currentYear - index),
    [currentYear],
  );
  const visible = useMemo(() => filterBySearch(rows, searchTerm, (item) => [
    item.staffCode, item.staffName, item.phone, item.biNumber, item.nuit,
    item.positionName, monthLabel(item.month), statusLabels[item.status],
  ]), [rows, searchTerm]);
  const exportRows = visible.map((item) => ({
    staffCode: item.staffCode,
    staffName: displayText(item.staffName),
    phone: displayText(item.phone),
    biNumber: displayText(item.biNumber),
    nuit: displayText(item.nuit),
    positionName: displayText(item.positionName),
    salaryTypeName: displayText(item.salaryTypeName),
    month: monthLabel(item.month),
    status: statusLabels[item.status],
    kind: item.kind ? kindLabels[item.kind] : '—',
    salary: money(item.salary),
    paidAmount: money(item.paidAmount),
    bonus: money(item.bonus),
    owed: money(item.owed),
    processedAt: item.processedAt ? formatDateTime(item.processedAt) : '—',
    observation: displayText(item.observation),
  }));
  const first = rows[0];
  const title = own
    ? `Relatório de salários ${year}`
    : scope === 'all'
      ? `Relatório de salários ${year} — todos os funcionários`
      : `Relatório de salários ${year} — ${employee?.staffCode ?? ''} ${displayText(employee?.staffName)}`;
  const details = own && first ? [
    { label: 'Código', value: String(first.staffCode ?? '').toUpperCase() },
    { label: 'Nome', value: displayText(first.staffName) },
    { label: 'Cargo', value: displayText(first.positionName) },
    { label: 'Tipo de Salário', value: displayText(first.salaryTypeName) },
  ] : [];

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Finanças</p>
          <h1>Relatórios</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          {!isTeacherMode() && <SearchField value={searchTerm} onChange={setSearchTerm} />}
          <DataExportMenu
            columns={tableColumns}
            rows={exportRows}
            details={details}
            filename={`relatorio-salarios-${year}${scope === 'each' ? `-${employee?.staffCode ?? ''}` : ''}`}
            title={title}
            disabled={loading || !ready}
            onError={(exportError) => setError(errorMessage(exportError))}
          />
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <form className="cacoin-test-registration-form" onSubmit={(event) => event.preventDefault()}>
        <TextField
          select
          size="small"
          label="Seleccionar ano"
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
        >
          {years.map((item) => (
            <MenuItem key={item} value={item}>{item === currentYear ? `${item} (este ano)` : item}</MenuItem>
          ))}
        </TextField>
        {!isTeacherMode() && (
          <FormControl>
            <FormLabel>Relatório</FormLabel>
            <RadioGroup row value={scope} onChange={(event) => { setScope(event.target.value); setEmployee(null); }}>
              <FormControlLabel value="all" control={<Radio size="small" />} label="Todos" />
              <FormControlLabel value="each" control={<Radio size="small" />} label="Cada" />
            </RadioGroup>
          </FormControl>
        )}
        {!isTeacherMode() && scope === 'each' && (
          <>
            <EmployeePicker employees={registrations} value={employee} onChange={setEmployee} />
            <TextField size="small" label="Cargo" value={employee ? displayText(employee.positionName) : ''} slotProps={{ input: { readOnly: true } }} />
            <TextField size="small" label="Tipo de Salário" value={employee ? displayText(employee.salaryTypeName) : ''} slotProps={{ input: { readOnly: true } }} />
          </>
        )}
      </form>
      <StandardTable
        ariaLabel="Relatório de salários"
        columns={tableColumns}
        emptyMessage={!ready
          ? 'Selecione o funcionário para ver o relatório.'
          : searchTerm.trim()
            ? 'Nenhum registo corresponde à pesquisa.'
            : 'Não existem dados para este ano.'}
        loading={loading}
        rows={visible}
        renderRow={(row, rowNumber) => (
          <TableRow key={`${row.staffId}-${row.month}`} hover>
            <TableCell>{rowNumber}</TableCell>
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
            <TableCell>{monthLabel(row.month)}</TableCell>
            <TableCell>
              <span className={`cacoin-status-badge ${statusClass(row.status)}`}>
                {statusLabels[row.status]}
              </span>
            </TableCell>
            <TableCell>{row.kind ? kindLabels[row.kind] : '—'}</TableCell>
            <TableCell><Money value={row.salary} /></TableCell>
            <TableCell><Money value={row.paidAmount} /></TableCell>
            <TableCell><Money value={row.bonus} /></TableCell>
            <TableCell><Money value={row.owed} /></TableCell>
            <TableCell>{row.processedAt ? formatDateTime(row.processedAt) : '—'}</TableCell>
            <TableCell>{displayText(row.observation)}</TableCell>
          </TableRow>
        )}
      />
    </section>
  );
}
