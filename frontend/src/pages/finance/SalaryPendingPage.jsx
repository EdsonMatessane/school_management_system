import { useCallback, useEffect, useMemo, useState } from 'react';
import { isTeacherMode } from '../../utils/teacherMode';
import { ownDetails, withoutPersonal } from './ownReport';
import {
  Alert,
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
import { Banknote } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import Money from '../../components/Money';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import {
  getFinanceSettings,
  getSalaryPending,
  processSalary,
} from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatMoney as money } from '../../utils/money';
import { filterBySearch } from '../../utils/search';
import { errorMessage, parseAmount, statusClass, statusLabels } from './financeUtils';

const columns = [
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
  { key: 'lastProcessedDate', label: 'Último Processamento' },
  { key: 'observation', label: 'Observação' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: 'Acções', align: 'right' },
];
const allExportColumns = columns.filter(({ key }) => key !== 'actions');

export default function SalaryPendingPage() {
  const own = isTeacherMode();
  const exportColumns = own ? withoutPersonal(allExportColumns) : allExportColumns;
  const visibleColumns = own ? exportColumns : columns;
  const [rows, setRows] = useState([]);
  const [rule, setRule] = useState('FULL');
  const [target, setTarget] = useState(null);
  const [amount, setAmount] = useState('');
  const [observation, setObservation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [loaded, settings] = await Promise.all([getSalaryPending(), getFinanceSettings()]);
      setRows(loaded);
      setRule(settings.paymentRule);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => filterBySearch(rows, searchTerm, (item) => [
    item.staffCode, item.staffName, item.phone, item.biNumber, item.nuit,
    item.positionName, item.salaryTypeName, item.bonusTypeName,
  ]), [rows, searchTerm]);
  const exportRows = visible.map((item) => ({
    staffCode: item.staffCode,
    staffName: displayText(item.staffName),
    phone: displayText(item.phone),
    biNumber: displayText(item.biNumber),
    nuit: displayText(item.nuit),
    positionName: displayText(item.positionName),
    salaryTypeName: displayText(item.salaryTypeName),
    salary: money(item.salary),
    bonusTypeName: displayText(item.bonusTypeName),
    bonus: item.bonusTypeId ? money(item.bonus) : '—',
    lastProcessedDate: item.lastProcessedDate ? toDisplayDate(item.lastProcessedDate) : '—',
    observation: displayText(item.observation),
    status: statusLabels[item.status],
  }));

  const submit = async (event) => {
    event.preventDefault();
    const value = parseAmount(amount);
    if (rule === 'PARTIAL' && !(value > 0 && value <= Number(target.salary))) {
      setError(`Indique um valor superior a zero e até ${money(target.salary)}.`);
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await processSalary({
        staffId: target.staffId,
        month: null,
        amount: rule === 'PARTIAL' ? value : null,
        observation: observation.trim() || null,
      });
      setNotice(`Salário de ${target.staffCode} processado.`);
      setTarget(null);
      await load();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Finanças</p>
          <h1>Pendente</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          {!isTeacherMode() && <SearchField value={searchTerm} onChange={setSearchTerm} />}
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            details={own ? ownDetails(visible[0]) : undefined}
            filename="salarios-pendentes"
            title="Salários pendentes"
            disabled={loading}
            onError={(exportError) => setError(errorMessage(exportError))}
          />
        </div>
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && !target && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}
      <StandardTable
        ariaLabel="Salários pendentes"
        columns={visibleColumns}
        emptyMessage={error
          ? 'Não foi possível carregar os dados.'
          : searchTerm.trim()
            ? 'Nenhum registo corresponde à pesquisa.'
            : 'Não existem salários pendentes.'}
        loading={loading}
        rows={visible}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.id} hover>
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
            <TableCell><Money value={row.salary} /></TableCell>
            <TableCell>{displayText(row.bonusTypeName)}</TableCell>
            <TableCell>{row.bonusTypeId ? <Money value={row.bonus} /> : '—'}</TableCell>
            <TableCell>{row.lastProcessedDate ? toDisplayDate(row.lastProcessedDate) : '—'}</TableCell>
            <TableCell>{displayText(row.observation)}</TableCell>
            <TableCell>
              <span className={`cacoin-status-badge ${statusClass(row.status)}`}>
                {statusLabels[row.status]}
              </span>
            </TableCell>
            {!isTeacherMode() && (<TableCell align="right">
              <Tooltip title="Processar">
                <IconButton
                  aria-label={`Processar salário de ${row.staffCode}`}
                  onClick={() => {
                    setError('');
                    setAmount(String(row.salary));
                    setObservation('');
                    setTarget(row);
                  }}
                >
                  <Banknote size={17} />
                </IconButton>
              </Tooltip>
            </TableCell>)}
          </TableRow>
        )}
      />

      <Dialog open={Boolean(target)} onClose={() => !saving && setTarget(null)} fullWidth maxWidth="xs">
        <form onSubmit={submit}>
          <DialogTitle>Processar — {target?.staffCode}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
            <TextField
              fullWidth
              size="small"
              label="Salário"
              type={rule === 'PARTIAL' ? 'number' : 'text'}
              value={rule === 'PARTIAL' ? amount : money(target?.salary ?? 0)}
              onChange={(event) => setAmount(event.target.value)}
              sx={{ mt: 1 }}
              slotProps={rule === 'PARTIAL'
                ? { htmlInput: { min: 0.01, step: 0.01 } }
                : { input: { readOnly: true } }}
            />
            <TextField
              fullWidth
              size="small"
              label="Observação"
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
              sx={{ mt: 1.5 }}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTarget(null)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'A processar…' : 'Processar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </section>
  );
}
