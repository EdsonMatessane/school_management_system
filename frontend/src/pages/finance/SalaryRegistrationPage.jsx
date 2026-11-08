import { useCallback, useEffect, useMemo, useState } from 'react';
import { isTeacherMode } from '../../utils/teacherMode';
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { Pencil, Trash2 } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import Money from '../../components/Money';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import {
  createSalaryRegistration,
  deleteSalaryRegistration,
  getFinanceBonusTypes,
  getFinanceEmployees,
  getFinancePositions,
  getFinanceSalaryTypes,
  getSalaryRegistrations,
  updateSalaryRegistration,
} from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatMoney as money } from '../../utils/money';
import { filterBySearch } from '../../utils/search';
import EmployeePicker from './EmployeePicker';
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
  { key: 'registrationDate', label: 'Data de Cadastro' },
  { key: 'observation', label: 'Observação' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: 'Acções', align: 'right' },
];
const exportColumns = columns.filter(({ key }) => key !== 'actions');
const emptyForm = {
  employee: null,
  position: null,
  salaryType: null,
  salary: '',
  bonusType: null,
  bonus: '',
  observation: '',
};

function RegistrationFields({ form, setForm, positions, salaryTypes, bonusTypes, disabled }) {
  return (
    <>
      <Autocomplete
        options={positions}
        value={form.position}
        onChange={(_, value) => setForm((current) => ({ ...current, position: value }))}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        disabled={disabled}
        renderInput={(params) => <TextField {...params} required label="Cargo" size="small" />}
      />
      <Autocomplete
        options={salaryTypes}
        value={form.salaryType}
        onChange={(_, value) => setForm((current) => ({
          ...current,
          salaryType: value,
          salary: value ? String(value.amount) : '',
        }))}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        disabled={disabled}
        renderInput={(params) => <TextField {...params} required label="Tipo de Salário" size="small" />}
      />
      <TextField
        required
        size="small"
        type="number"
        label="Salário"
        value={form.salary}
        onChange={(event) => setForm((current) => ({ ...current, salary: event.target.value }))}
        disabled={disabled}
        slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
      />
      <Autocomplete
        options={bonusTypes}
        value={form.bonusType}
        onChange={(_, value) => setForm((current) => ({
          ...current,
          bonusType: value,
          bonus: value ? String(value.amount) : '',
        }))}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        disabled={disabled}
        renderInput={(params) => <TextField {...params} label="Tipo de Bónus" size="small" />}
      />
      <TextField
        size="small"
        type="number"
        label="Bónus"
        value={form.bonus}
        onChange={(event) => setForm((current) => ({ ...current, bonus: event.target.value }))}
        disabled={disabled || !form.bonusType}
        slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
      />
      <TextField
        size="small"
        label="Observação"
        value={form.observation}
        onChange={(event) => setForm((current) => ({ ...current, observation: event.target.value }))}
        disabled={disabled}
        slotProps={{ htmlInput: { maxLength: 500 } }}
      />
    </>
  );
}

export default function SalaryRegistrationPage({ mode }) {
  const visibleColumns = isTeacherMode() ? exportColumns : columns;
  const [employees, setEmployees] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [positions, setPositions] = useState([]);
  const [salaryTypes, setSalaryTypes] = useState([]);
  const [bonusTypes, setBonusTypes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [loadedEmployees, loadedRegistrations, loadedPositions, loadedSalaryTypes, loadedBonusTypes] =
        await Promise.all([
          getFinanceEmployees(),
          getSalaryRegistrations(),
          getFinancePositions(),
          getFinanceSalaryTypes(),
          getFinanceBonusTypes(),
        ]);
      setEmployees(loadedEmployees);
      setRegistrations(loadedRegistrations);
      setPositions(loadedPositions);
      setSalaryTypes(loadedSalaryTypes);
      setBonusTypes(loadedBonusTypes);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const available = useMemo(() => {
    const registered = new Set(registrations.map((item) => item.staffId));
    return employees.filter((employee) => !registered.has(employee.id));
  }, [employees, registrations]);

  const toPayload = (source) => {
    const salary = parseAmount(source.salary);
    const bonus = source.bonusType ? parseAmount(source.bonus) : null;
    if (!source.position || !source.salaryType || !(salary > 0)
      || (source.bonusType && !(bonus > 0))) {
      return null;
    }
    return {
      positionId: source.position.id,
      salaryTypeId: source.salaryType.id,
      salary,
      bonusTypeId: source.bonusType?.id ?? null,
      bonus,
      observation: source.observation.trim() || null,
    };
  };

  const run = async (action, message, onDone) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(message);
      onDone?.();
      await load();
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setSaving(false);
    }
  };

  const submitCreate = (event) => {
    event.preventDefault();
    const payload = toPayload(form);
    if (!form.employee || !payload) {
      setError('Selecione o funcionário, o cargo, o tipo de salário e valores válidos.');
      return;
    }
    run(
      () => createSalaryRegistration({ staffId: form.employee.id, ...payload }),
      `Cadastro de ${form.employee.code} registado.`,
      () => setForm(emptyForm),
    );
  };

  const openEdit = (row) => setEditing({
    id: row.id,
    employee: { id: row.staffId, code: row.staffCode, name: row.staffName, phone: row.phone, biNumber: row.biNumber, nuit: row.nuit },
    position: positions.find((item) => item.id === row.positionId) ?? null,
    salaryType: salaryTypes.find((item) => item.id === row.salaryTypeId) ?? null,
    salary: String(row.salary),
    bonusType: bonusTypes.find((item) => item.id === row.bonusTypeId) ?? null,
    bonus: row.bonusTypeId ? String(row.bonus) : '',
    observation: row.observation ?? '',
  });

  const submitEdit = (event) => {
    event.preventDefault();
    const payload = toPayload(editing);
    if (!payload) {
      setError('Indique o cargo, o tipo de salário e valores válidos.');
      return;
    }
    run(
      () => updateSalaryRegistration(editing.id, { staffId: editing.employee.id, ...payload }),
      'Cadastro actualizado.',
      () => setEditing(null),
    );
  };

  const rows = useMemo(() => filterBySearch(registrations, searchTerm, (item) => [
    item.staffCode,
    item.staffName,
    item.phone,
    item.biNumber,
    item.nuit,
    item.positionName,
    item.salaryTypeName,
    item.bonusTypeName,
    statusLabels[item.status],
  ]), [registrations, searchTerm]);
  const exportRows = rows.map((item) => ({
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
    registrationDate: toDisplayDate(item.registrationDate),
    observation: displayText(item.observation),
    status: statusLabels[item.status],
  }));

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Finanças</p>
          <h1>{mode === 'register' ? 'Registar' : 'Registados'}</h1>
        </div>
        {mode === 'list' && (
          <div className="cacoin-page-heading-actions">
            {!isTeacherMode() && <SearchField value={searchTerm} onChange={setSearchTerm} />}
            <DataExportMenu
              columns={exportColumns}
              rows={exportRows}
              filename="salarios-registados"
              title="Funcionários com cadastro de salário"
              disabled={loading}
              onError={(exportError) => setError(errorMessage(exportError))}
            />
          </div>
        )}
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && !editing && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      {mode === 'register' ? (
        <>
          {!loading && (positions.length === 0 || salaryTypes.length === 0) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Configure cargos e tipos de salário em Configurações antes de registar funcionários.
            </Alert>
          )}
          <form className="cacoin-test-registration-form" onSubmit={submitCreate}>
            <EmployeePicker
              employees={available}
              value={form.employee}
              onChange={(employee) => setForm((current) => ({ ...current, employee }))}
            />
            <RegistrationFields
              form={form}
              setForm={setForm}
              positions={positions}
              salaryTypes={salaryTypes}
              bonusTypes={bonusTypes}
              disabled={saving}
            />
            <div className="cacoin-test-registration-actions">
              <Button type="submit" variant="contained" disabled={saving || loading}>
                {saving ? 'A guardar…' : 'Registar'}
              </Button>
            </div>
          </form>
        </>
      ) : (
        <StandardTable
          audit="SalaryRegistration"
          ariaLabel="Funcionários com cadastro de salário"
          columns={visibleColumns}
          emptyMessage={error
            ? 'Não foi possível carregar os dados.'
            : searchTerm.trim()
              ? 'Nenhum registo corresponde à pesquisa.'
              : 'Ainda não existem funcionários registados.'}
          loading={loading}
          rows={rows}
          renderRow={(row, rowNumber) => (
            <TableRow key={row.id} hover>
              <TableCell>{rowNumber}</TableCell>
              <TableCell>{row.staffCode}</TableCell>
              <TableCell>{displayText(row.staffName)}</TableCell>
              <TableCell>{displayText(row.phone)}</TableCell>
              <TableCell>{displayText(row.biNumber)}</TableCell>
              <TableCell>{displayText(row.nuit)}</TableCell>
              <TableCell>{displayText(row.positionName)}</TableCell>
              <TableCell>{displayText(row.salaryTypeName)}</TableCell>
              <TableCell><Money value={row.salary} /></TableCell>
              <TableCell>{displayText(row.bonusTypeName)}</TableCell>
              <TableCell>{row.bonusTypeId ? <Money value={row.bonus} /> : '—'}</TableCell>
              <TableCell>{toDisplayDate(row.registrationDate)}</TableCell>
              <TableCell>{displayText(row.observation)}</TableCell>
              <TableCell>
                <span className={`cacoin-status-badge ${statusClass(row.status)}`}>
                  {statusLabels[row.status]}
                </span>
              </TableCell>
              {!isTeacherMode() && (<TableCell align="right">
                <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                  <Tooltip title="Editar">
                    <IconButton
                      className="cacoin-table-action-edit"
                      aria-label={`Editar cadastro de ${row.staffCode}`}
                      disabled={saving}
                      onClick={() => openEdit(row)}
                    >
                      <Pencil size={17} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Apagar">
                    <IconButton
                      className="cacoin-table-action-delete"
                      aria-label={`Apagar cadastro de ${row.staffCode}`}
                      disabled={saving}
                      onClick={() => setDeleting(row)}
                    >
                      <Trash2 size={17} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>)}
            </TableRow>
          )}
        />
      )}

      <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} fullWidth maxWidth="sm">
        <form onSubmit={submitEdit}>
          <DialogTitle>Editar cadastro — {editing?.employee.code}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              {editing && (
                <RegistrationFields
                  form={editing}
                  setForm={setEditing}
                  positions={positions}
                  salaryTypes={salaryTypes}
                  bonusTypes={bonusTypes}
                  disabled={saving}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>Guardar</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={Boolean(deleting)} onClose={() => !saving && setDeleting(null)} fullWidth maxWidth="xs">
        <DialogTitle>Apagar cadastro</DialogTitle>
        <DialogContent>
          Apagar o cadastro de salário de {deleting?.staffCode} — {displayText(deleting?.staffName)}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)} disabled={saving}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={saving}
            onClick={() => run(
              () => deleteSalaryRegistration(deleting.id),
              'Cadastro apagado.',
              () => setDeleting(null),
            )}
          >
            Apagar
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
