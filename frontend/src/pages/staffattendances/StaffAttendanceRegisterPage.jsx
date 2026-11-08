import { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Button, TableCell, TableRow, TextField } from '@mui/material';
import StandardTable from '../../components/StandardTable';
import { createStaffAttendanceRecord, getStaff, getStaffCourses } from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import useStatuses from '../../utils/useStatuses';
import {
  staffAttendanceErrorMessage as errorMessage,
  todayIso,
} from './staffAttendanceUtils';

const courseColumns = [
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
];

export default function StaffAttendanceRegisterPage({ type }) {
  const isTeacher = type === 'teachers';
  const [employees, setEmployees] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [courses, setCourses] = useState([]);
  const [status, setStatus] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { activeStatuses, error: statusError } = useStatuses('ATTENDANCE_PRESENCE');
  const statusOptions = useMemo(
    () => activeStatuses.filter((item) => ['PRESENT', 'ABSENT'].includes(item.code)),
    [activeStatuses],
  );

  useEffect(() => {
    let mounted = true;
    getStaff(type)
      .then((loaded) => {
        if (!mounted) return;
        setEmployees(loaded.filter((member) => member.active).map((member) => ({
          id: member.id,
          code: member.staffCode,
          name: [member.firstName, member.surname].filter(Boolean).join(' '),
          positionName: member.positionName,
        })));
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
  }, [type]);

  useEffect(() => {
    let mounted = true;
    if (!isTeacher || !employee) {
      setCourses([]);
      return undefined;
    }
    getStaffCourses('teachers', employee.id)
      .then((assignments) => {
        if (mounted) setCourses(assignments.filter((course) => course.active));
      })
      .catch((loadError) => {
        if (mounted) setError(errorMessage(loadError));
      });
    return () => {
      mounted = false;
    };
  }, [employee, isTeacher]);

  const submit = async (event) => {
    event.preventDefault();
    if (!employee || !status) {
      setError('Seleccione o funcionário e o estado.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await createStaffAttendanceRecord(type, {
        staffId: employee.id,
        date: todayIso(),
        status: status.code,
      });
      setNotice(`${status.label} registado para ${created.staffCode}.`);
      setEmployee(null);
      setStatus(null);
      setFormKey((current) => current + 1);
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
          <p className="cacoin-eyebrow">Funcionários</p>
          <h1>Registar</h1>
        </div>
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {(error || statusError) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error || statusError}
        </Alert>
      )}
      {!loading && employees.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>Não existem funcionários activos neste grupo.</Alert>
      )}
      <form className="cacoin-test-registration-form" onSubmit={submit}>
        <TextField
          size="small"
          label="Data"
          value={toDisplayDate(todayIso())}
          slotProps={{ input: { readOnly: true } }}
        />
        <Autocomplete
          key={`employee-${formKey}`}
          options={employees}
          value={employee}
          onChange={(_, selected) => setEmployee(selected)}
          getOptionLabel={(option) => option.code ?? ''}
          isOptionEqualToValue={(option, selected) => option.id === selected.id}
          disabled={loading || saving}
          renderInput={(params) => (
            <TextField {...params} required label="Código do Funcionário" size="small" />
          )}
        />
        <TextField
          size="small"
          label="Nome"
          value={employee ? displayText(employee.name) : ''}
          slotProps={{ input: { readOnly: true } }}
        />
        <TextField
          size="small"
          label="Cargo"
          value={employee ? displayText(employee.positionName) : ''}
          slotProps={{ input: { readOnly: true } }}
        />
        <Autocomplete
          key={`status-${formKey}`}
          options={statusOptions}
          value={status}
          onChange={(_, selected) => setStatus(selected)}
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, selected) => option.code === selected.code}
          renderInput={(params) => (
            <TextField {...params} required label="Estado" size="small" />
          )}
        />
        {isTeacher && employee && (
          <div style={{ gridColumn: '1 / -1' }}>
            <StandardTable
              ariaLabel="Cursos do professor"
              columns={courseColumns}
              emptyMessage="O professor não tem cursos associados."
              rows={courses}
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
          <Button type="submit" variant="contained" disabled={saving || loading}>
            {saving ? 'A guardar…' : 'Registar'}
          </Button>
        </div>
      </form>
    </section>
  );
}
