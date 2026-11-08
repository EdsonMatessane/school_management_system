import { systemDate } from '../../utils/systemDate';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { CheckCheck, Pencil, Trash2 } from 'lucide-react';
import CourseSelector from '../../components/CourseSelector';
import DataExportMenu from '../../components/DataExportMenu';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import StatusBadge from '../../components/StatusBadge';
import {
  completeAssessmentRecord,
  deleteAssessmentRecord,
  getAssessmentGrades,
  getAssessmentSheets,
  getCourses,
  saveAssessmentGrades,
} from '../../services/api';
import { displayText } from '../../utils/displayText';
import { filterBySearch } from '../../utils/search';
import {
  assessmentComponents,
  displayCell,
  errorMessage,
  getGradeError,
  sanitizeGrade,
  sheetLabel,
  sheetNumbers,
  teachersLabel,
} from './assessmentUtils';

const columns = [
  { key: 'studentCode', label: 'Código do Estudante' },
  { key: 'studentName', label: 'Nome' },
  ...assessmentComponents.map((item) => ({ key: item.code, label: item.label })),
  { key: 'teachers', label: 'Professor/es' },
];
const statusColumn = { key: 'status', label: 'Estado' };
const actionColumns = [
  ...columns,
  statusColumn,
  { key: 'actions', label: 'Acções', align: 'right' },
];

/** Valor de uma nota para editar: "-" quando ausente, vazio quando ainda não existe. */
const editableValue = (cell) => {
  if (!cell) return '';
  return cell.absent ? '-' : String(Number(cell.value));
};

export default function AssessmentGradesPage({ mode = 'grades' }) {
  const history = mode === 'history';
  const currentYear = systemDate().getFullYear();
  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState(null);
  const [years, setYears] = useState([currentYear]);
  const [year, setYear] = useState(currentYear);
  const [allRows, setAllRows] = useState([]);
  const [yearSheets, setYearSheets] = useState([]);
  const [sheetId, setSheetId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState({});
  const [confirming, setConfirming] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([getCourses(), getAssessmentSheets()])
      .then(([loadedCourses, sheets]) => {
        if (!mounted) return;
        setCourses(loadedCourses.filter((item) => item.active));
        const found = new Set([currentYear, ...sheets.map((item) => item.academicYear)]);
        setYears([...found].sort((a, b) => b - a));
      })
      .catch((loadError) => {
        if (mounted) setError(errorMessage(loadError));
      });
    return () => {
      mounted = false;
    };
  }, [currentYear]);

  const courseId = course?.id ?? null;
  useEffect(() => {
    let mounted = true;
    setAllRows([]);
    setYearSheets([]);
    setSheetId(null);
    if (!courseId) {
      return () => {
        mounted = false;
      };
    }
    setLoading(true);
    Promise.all([
      getAssessmentSheets({ courseId, year }),
      getAssessmentGrades(courseId, year, undefined, history ? true : undefined),
    ])
      .then(([loadedSheets, loadedRows]) => {
        if (!mounted) return;
        const ordered = [...loadedSheets].sort((a, b) => a.id - b.id);
        setYearSheets(ordered);
        setAllRows(loadedRows);
        const withRows = new Set(loadedRows.map((row) => row.sheetId));
        setSheetId((current) => (
          current && withRows.has(current)
            ? current
            : ordered.find((item) => withRows.has(item.id))?.id ?? null
        ));
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
  }, [courseId, year, history, reload]);

  // Só aparecem as abas dos registos que têm estudantes nesta página.
  const tabSheets = useMemo(() => {
    const withRows = new Set(allRows.map((row) => row.sheetId));
    return yearSheets.filter((item) => withRows.has(item.id));
  }, [yearSheets, allRows]);
  const rows = useMemo(
    () => allRows.filter((row) => row.sheetId === sheetId),
    [allRows, sheetId],
  );

  const numbers = useMemo(() => sheetNumbers(yearSheets), [yearSheets]);
  const activeLabel = sheetId ? sheetLabel(numbers[sheetId], year) : '';

  const visibleRows = useMemo(() => filterBySearch(rows, searchTerm, (row) => [
    row.studentCode,
    row.studentName,
  ]), [rows, searchTerm]);
  const exportRows = visibleRows.map((row) => ({
    studentCode: row.studentCode,
    studentName: displayText(row.studentName),
    ...Object.fromEntries(assessmentComponents.map((item) => [item.code, displayCell(row.grades[item.code])])),
    teachers: teachersLabel(row.teachers),
    status: row.completed ? 'Concluído' : 'Em curso',
  }));
  const exportColumns = history ? columns : [...columns, statusColumn];
  const title = `${history ? 'Histórico de Notas' : 'Notas'} ${course ? activeLabel || year : ''}`.trim();
  const details = course ? [
    { label: 'Curso', value: displayText(course.name) },
    { label: 'Categoria', value: displayText(course.categoryName) },
    { label: 'Nível', value: displayText(course.levelName) },
    { label: 'Modalidade', value: displayText(course.modalityName) },
  ] : [];

  const openEdit = (row) => {
    setDialogError('');
    setValues(Object.fromEntries(
      assessmentComponents.map((item) => [item.code, editableValue(row.grades[item.code])]),
    ));
    setEditing(row);
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    const invalid = assessmentComponents.find((item) => getGradeError(values[item.code] ?? ''));
    if (invalid) {
      setDialogError(`Nota inválida em ${invalid.label}.`);
      return;
    }
    const changed = assessmentComponents.filter((item) => (
      (values[item.code] ?? '').trim() !== editableValue(editing.grades[item.code])
    ));
    setSaving(true);
    setDialogError('');
    try {
      for (const item of changed) {
        await saveAssessmentGrades(editing.sheetId, item.code, {
          entries: [{ studentId: editing.studentId, grade: (values[item.code] ?? '').trim() }],
        });
      }
      setEditing(null);
      setNotice('Notas actualizadas.');
      setReload((current) => current + 1);
    } catch (saveError) {
      setDialogError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const openConfirm = (action, row) => {
    setDialogError('');
    setConfirming({ action, row });
  };

  const submitConfirm = async () => {
    const { action, row } = confirming;
    setSaving(true);
    setDialogError('');
    try {
      if (action === 'delete') {
        await deleteAssessmentRecord(row.sheetId, row.studentId);
      } else {
        await completeAssessmentRecord(row.sheetId, row.studentId);
      }
      setConfirming(null);
      setNotice(action === 'delete' ? 'Registo apagado.' : 'Registo concluído.');
      setReload((current) => current + 1);
    } catch (saveError) {
      setDialogError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>{history ? 'Histórico' : 'Notas'}</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename={`${history ? 'historico-notas' : 'notas'}-${year}${sheetId ? `-registo-${numbers[sheetId]}` : ''}`}
            title={title}
            details={details}
            disabled={loading || !course}
            onError={(exportError) => setError(errorMessage(exportError))}
          />
        </div>
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <form className="cacoin-test-registration-form" onSubmit={(event) => event.preventDefault()}>
        <CourseSelector courses={courses} onChange={setCourse} />
        <TextField
          select
          size="small"
          label="Ano"
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
        >
          {years.map((item) => (
            <MenuItem key={item} value={item}>{item}</MenuItem>
          ))}
        </TextField>
      </form>
      {tabSheets.length > 0 && (
        <Tabs
          value={sheetId}
          onChange={(_, value) => setSheetId(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 1 }}
        >
          {tabSheets.map((item) => (
            <Tab
              key={item.id}
              value={item.id}
              label={sheetLabel(numbers[item.id], item.academicYear)}
            />
          ))}
        </Tabs>
      )}
      <StandardTable
        ariaLabel="Notas dos estudantes"
        columns={history ? columns : actionColumns}
        emptyMessage={!course
          ? 'Selecione o curso, a categoria, o nível e a modalidade.'
          : searchTerm.trim()
            ? 'Nenhum registo corresponde à pesquisa.'
            : history
              ? 'Ainda não existem registos concluídos para este curso e ano.'
              : 'Ainda não existe registo de notas para este curso e ano.'}
        loading={loading}
        rows={visibleRows}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.studentId} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{row.studentCode}</TableCell>
            <TableCell>{displayText(row.studentName)}</TableCell>
            {assessmentComponents.map((item) => (
              <TableCell key={item.code}>{displayCell(row.grades[item.code])}</TableCell>
            ))}
            <TableCell>{teachersLabel(row.teachers)}</TableCell>
            {!history && (
              <TableCell>
                <StatusBadge
                  label={row.completed ? 'Concluído' : 'Em curso'}
                  tone={row.completed ? 'paid' : 'neutral'}
                />
              </TableCell>
            )}
            {!history && (
              <TableCell align="right">
                {row.canEdit && (
                  <Tooltip title="Editar">
                    <IconButton aria-label={`Editar ${row.studentCode}`} onClick={() => openEdit(row)}>
                      <Pencil size={17} />
                    </IconButton>
                  </Tooltip>
                )}
                {!row.completed && (
                  <Tooltip title="Concluir">
                    <IconButton
                      aria-label={`Concluir ${row.studentCode}`}
                      onClick={() => openConfirm('complete', row)}
                    >
                      <CheckCheck size={17} />
                    </IconButton>
                  </Tooltip>
                )}
                {row.canDelete && (
                  <Tooltip title="Apagar">
                    <IconButton
                      aria-label={`Apagar ${row.studentCode}`}
                      onClick={() => openConfirm('delete', row)}
                    >
                      <Trash2 size={17} />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            )}
          </TableRow>
        )}
      />

      <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} fullWidth maxWidth="sm">
        <form onSubmit={submitEdit}>
          <DialogTitle>Editar notas — {editing?.studentCode}</DialogTitle>
          <DialogContent>
            {dialogError && <Alert severity="error" sx={{ mb: 1 }}>{dialogError}</Alert>}
            <div className="cacoin-test-registration-form" style={{ paddingTop: 8 }}>
              {assessmentComponents.map((item) => (
                <TextField
                  key={item.code}
                  size="small"
                  label={item.label}
                  value={values[item.code] ?? ''}
                  error={Boolean(getGradeError(values[item.code] ?? ''))}
                  onChange={(event) => setValues((current) => ({
                    ...current,
                    [item.code]: sanitizeGrade(event.target.value),
                  }))}
                  disabled={saving}
                />
              ))}
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>Guardar</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={Boolean(confirming)} onClose={() => !saving && setConfirming(null)} fullWidth maxWidth="xs">
        <DialogTitle>{confirming?.action === 'delete' ? 'Apagar registo' : 'Concluir registo'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1}>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            <span>
              {confirming?.action === 'delete' ? 'Apagar' : 'Concluir'} o registo de{' '}
              {confirming?.row.studentCode} — {displayText(confirming?.row.studentName)}?
            </span>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(null)} disabled={saving}>Cancelar</Button>
          <Button
            variant="contained"
            color={confirming?.action === 'delete' ? 'error' : 'primary'}
            disabled={saving}
            onClick={submitConfirm}
          >
            {confirming?.action === 'delete' ? 'Apagar' : 'Concluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
