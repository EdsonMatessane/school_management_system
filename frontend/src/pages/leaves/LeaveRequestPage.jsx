import { systemDate } from '../../utils/systemDate';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  IconButton,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { Ban, CircleCheck } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import StatusBadge from '../../components/StatusBadge';
import {
  createLeaveRequest,
  getLeaveRequests,
  getLeaveSettings,
  getStaff,
  getStaffCourses,
  setLeaveRequestStatus,
} from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { filterBySearch } from '../../utils/search';
import DateField from '../../components/DateField';

import { getPortalKind } from '../../utils/teacherMode';

const staffTypes = ['hr', 'teachers', 'other'];
const columns = [
  { key: 'staffCode', label: 'Código do Funcionário' },
  { key: 'staffName', label: 'Nome' },
  { key: 'phone', label: 'Número de Telefone' },
  { key: 'biNumber', label: 'BI' },
  { key: 'positionName', label: 'Cargo' },
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
  { key: 'requestDate', label: 'Data do Pedido' },
  { key: 'leaveDate', label: 'Data de Saída' },
  { key: 'returnDate', label: 'Data de Regresso' },
  { key: 'reason', label: 'Motivo' },
  { key: 'daysCalculated', label: 'Dias Calculados' },
  { key: 'statusLabel', label: 'Estado' },
];
const tableColumns = [...columns, { key: 'actions', label: 'Acções', align: 'right' }];
const teacherColumns = columns;
const courseColumns = [
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
];
const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.'
);
const today = () => {
  const date = systemDate();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const daysBetween = (from, to) => {
  if (!from || !to) return '';
  const diff = Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000);
  return diff < 0 ? '' : Math.max(1, diff);
};
const staffOption = (member) => ({
  id: member.id,
  staffType: member.staffType,
  code: member.staffCode,
  name: [member.firstName, member.surname].filter(Boolean).join(' '),
  phone: member.phone,
  biNumber: member.biNumber,
  positionName: member.positionName,
});
const lines = (items, key) => (
  items.length
    ? items.map((item, index) => <div key={`${item.courseId}-${index}`}>{displayText(item[key])}</div>)
    : '—'
);
const joinCourses = (items, key) => (
  items.length ? items.map((item) => displayText(item[key])).join(' | ') : '—'
);

export default function LeaveRequestPage({ mode, teacher = false }) {
  const [employees, setEmployees] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [employeeCourses, setEmployeeCourses] = useState([]);
  const [form, setForm] = useState({ leaveDate: today(), returnDate: today(), reason: '' });
  const [formKey, setFormKey] = useState(0);
  const [settings, setSettings] = useState(null);
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'request') {
        const [loadedSettings, ...groups] = await Promise.all([
          getLeaveSettings(),
          ...(teacher ? [getPortalKind()] : staffTypes).map((type) => getStaff(type)),
        ]);
        setSettings(loadedSettings);
        const options = groups.flat().filter((member) => member.active).map(staffOption);
        setEmployees(options);
        if (teacher && options.length === 1) setEmployee(options[0]);
      } else {
        setRequests(await getLeaveRequests());
      }
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [mode, teacher]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let mounted = true;
    if (employee?.staffType !== 'teachers') {
      setEmployeeCourses([]);
      return undefined;
    }
    getStaffCourses('teachers', employee.id)
      .then((courses) => {
        if (mounted) setEmployeeCourses(courses.filter((course) => course.active));
      })
      .catch((courseError) => {
        if (mounted) setError(errorMessage(courseError));
      });
    return () => {
      mounted = false;
    };
  }, [employee]);

  const days = daysBetween(form.leaveDate, form.returnDate);
  const maxConfigured = Number(settings?.maxRequestsPerMonth) > 0;

  const submit = async (event) => {
    event.preventDefault();
    if (!employee) {
      setError('Seleccione o funcionário.');
      return;
    }
    if (days === '') {
      setError('A data de regresso não pode ser anterior à data de saída.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await createLeaveRequest({
        staffId: employee.id,
        leaveDate: form.leaveDate,
        returnDate: form.returnDate,
        reason: form.reason,
      });
      setNotice(`Pedido de saída registado para ${created.staffCode}.`);
      setEmployee(null);
      setForm({ leaveDate: today(), returnDate: today(), reason: '' });
      setFormKey((current) => current + 1);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const decide = async (row, status) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await setLeaveRequestStatus(row.id, status);
      setNotice(`Pedido de ${row.staffCode} actualizado.`);
      await load();
    } catch (statusError) {
      setError(errorMessage(statusError));
    } finally {
      setSaving(false);
    }
  };

  const visibleRows = useMemo(() => filterBySearch(requests, searchTerm, (item) => [
    item.staffCode,
    item.staffName,
    item.phone,
    item.biNumber,
    item.positionName,
    item.reason,
    item.statusLabel,
    ...item.courses.flatMap((course) => [
      course.courseName, course.categoryName, course.levelName, course.modalityName,
    ]),
  ]), [requests, searchTerm]);
  const exportRows = visibleRows.map((item) => ({
    staffCode: item.staffCode,
    staffName: displayText(item.staffName),
    phone: displayText(item.phone),
    biNumber: displayText(item.biNumber),
    positionName: displayText(item.positionName),
    courseName: joinCourses(item.courses, 'courseName'),
    categoryName: joinCourses(item.courses, 'categoryName'),
    levelName: joinCourses(item.courses, 'levelName'),
    modalityName: joinCourses(item.courses, 'modalityName'),
    requestDate: toDisplayDate(item.requestDate),
    leaveDate: toDisplayDate(item.leaveDate),
    returnDate: toDisplayDate(item.returnDate),
    reason: item.reason,
    daysCalculated: item.daysCalculated,
    statusLabel: item.statusLabel,
  }));

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Funcionários</p>
          <h1>{mode === 'request' ? 'Pedir Saída' : 'Saídas Registadas'}</h1>
        </div>
        {mode === 'list' && (
          <div className="cacoin-page-heading-actions">
            <SearchField value={searchTerm} onChange={setSearchTerm} />
            <DataExportMenu
              columns={columns}
              rows={exportRows}
              filename="saidas-registadas"
              title="Saídas registadas"
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
          {!loading && !maxConfigured && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Defina o número máximo de pedidos por mês em Configurações &gt; Pedidos de Saída &gt; Definição.
            </Alert>
          )}
          <form className="cacoin-test-registration-form" onSubmit={submit}>
            {!teacher && (
              <Autocomplete
                key={formKey}
                options={employees}
                value={employee}
                onChange={(_, selected) => setEmployee(selected)}
                getOptionLabel={(option) => option.code ?? ''}
                isOptionEqualToValue={(option, selected) => option.id === selected.id
                  && option.staffType === selected.staffType}
                groupBy={(option) => ({ hr: 'RH', teachers: 'Professores', other: 'Outros' })[option.staffType]}
                disabled={loading || saving}
                renderInput={(params) => (
                  <TextField {...params} required label="Código do Funcionário" size="small" />
                )}
              />
            )}
            <TextField
              size="small"
              label="Nome"
              value={employee ? displayText(employee.name) : ''}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              size="small"
              label="Número de Telefone"
              value={employee ? displayText(employee.phone) : ''}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              size="small"
              label="BI"
              value={employee ? displayText(employee.biNumber) : ''}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              size="small"
              label="Cargo"
              value={employee ? displayText(employee.positionName) : ''}
              slotProps={{ input: { readOnly: true } }}
            />
            <DateField
              required
              size="small"
              label="Data de Saída"
              value={form.leaveDate}
              onChange={(event) => setForm((current) => ({ ...current, leaveDate: event.target.value }))}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today() } }}
            />
            <DateField
              required
              size="small"
              label="Data de Regresso"
              value={form.returnDate}
              onChange={(event) => setForm((current) => ({ ...current, returnDate: event.target.value }))}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: form.leaveDate || today() } }}
            />
            <TextField
              size="small"
              label="Dias Calculados"
              value={days}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              required
              multiline
              minRows={2}
              size="small"
              label="Motivo"
              value={form.reason}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              sx={{ gridColumn: '1 / -1' }}
            />
            {employee?.staffType === 'teachers' && (
              <div style={{ gridColumn: '1 / -1' }}>
                <StandardTable
                  ariaLabel="Cursos do professor"
                  columns={courseColumns}
                  emptyMessage="O professor não tem cursos associados."
                  rows={employeeCourses}
                  renderRow={(row, rowNumber) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{rowNumber}</TableCell>
                      <TableCell>{displayText(row.courseName)}</TableCell>
                      <TableCell>{displayText(row.categoryName)}</TableCell>
                      <TableCell>{displayText(row.levelName)}</TableCell>
                      <TableCell>{displayText(row.modalityName)}</TableCell>
                    </TableRow>
                  )}
                />
              </div>
            )}
            <div className="cacoin-test-registration-actions">
              <Button type="submit" variant="contained" disabled={saving || loading || !maxConfigured}>
                {saving ? 'A guardar…' : 'Pedir saída'}
              </Button>
            </div>
          </form>
        </>
      ) : (
        <StandardTable
          audit="LeaveRequest"
          ariaLabel="Saídas registadas"
          columns={teacher ? teacherColumns : tableColumns}
          emptyMessage={error
            ? 'Não foi possível carregar os dados.'
            : searchTerm.trim()
              ? 'Nenhum registo corresponde à pesquisa.'
              : 'Ainda não existem pedidos de saída registados.'}
          loading={loading}
          rows={visibleRows}
          renderRow={(row, rowNumber) => (
            <TableRow key={row.id} hover>
              <TableCell>{rowNumber}</TableCell>
              <TableCell>{row.staffCode}</TableCell>
              <TableCell>{displayText(row.staffName)}</TableCell>
              <TableCell>{displayText(row.phone)}</TableCell>
              <TableCell>{displayText(row.biNumber)}</TableCell>
              <TableCell>{displayText(row.positionName)}</TableCell>
              <TableCell>{lines(row.courses, 'courseName')}</TableCell>
              <TableCell>{lines(row.courses, 'categoryName')}</TableCell>
              <TableCell>{lines(row.courses, 'levelName')}</TableCell>
              <TableCell>{lines(row.courses, 'modalityName')}</TableCell>
              <TableCell>{toDisplayDate(row.requestDate)}</TableCell>
              <TableCell>{toDisplayDate(row.leaveDate)}</TableCell>
              <TableCell>{toDisplayDate(row.returnDate)}</TableCell>
              <TableCell>{row.reason}</TableCell>
              <TableCell>{row.daysCalculated}</TableCell>
              <TableCell><StatusBadge label={row.statusLabel} tone={row.statusTone} /></TableCell>
              {!teacher && (<TableCell align="right">
                <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                  {row.status !== 'APPROVED' && (
                    <Tooltip title="Aprovar">
                      <span>
                        <IconButton
                          className="cacoin-table-action-activate"
                          aria-label={`Aprovar pedido de ${row.staffCode}`}
                          disabled={saving}
                          onClick={() => decide(row, 'APPROVED')}
                        >
                          <CircleCheck size={17} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  {row.status !== 'REJECTED' && (
                    <Tooltip title="Rejeitar">
                      <span>
                        <IconButton
                          className="cacoin-table-action-delete"
                          aria-label={`Rejeitar pedido de ${row.staffCode}`}
                          disabled={saving}
                          onClick={() => decide(row, 'REJECTED')}
                        >
                          <Ban size={17} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              </TableCell>)}
            </TableRow>
          )}
        />
      )}
    </section>
  );
}
