import { systemDate } from '../../utils/systemDate';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { RefreshCw, Trash2 } from 'lucide-react';
import CourseSelector from '../../components/CourseSelector';
import DataExportMenu from '../../components/DataExportMenu';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import {
  deletePauta,
  getCourses,
  getPautaYears,
  getPautas,
  refreshPauta,
} from '../../services/api';
import { displayText } from '../../utils/displayText';
import { filterBySearch } from '../../utils/search';
import {
  errorMessage,
  formatGrade,
  resultClass,
  resultLabels,
} from './pautaUtils';

const columns = [
  { key: 'studentCode', label: 'Código do Estudante' },
  { key: 'studentName', label: 'Nome' },
  { key: 'biNumber', label: 'BI' },
  { key: 'phone', label: 'Telefone' },
  { key: 't1', label: 'T1' },
  { key: 't2', label: 'T2' },
  { key: 't3', label: 'T3' },
  { key: 't4', label: 'T4' },
  { key: 't5', label: 'T5' },
  { key: 't6', label: 'T6' },
  { key: 'frequency', label: 'Frequência' },
  { key: 'exam1', label: 'Exame1' },
  { key: 'exam2', label: 'Exame2' },
  { key: 'work', label: 'Trabalho' },
  { key: 'finalAverage', label: 'Média Final' },
  { key: 'result', label: 'Resultado' },
];
const tableColumns = [...columns, { key: 'actions', label: 'Acções', align: 'right' }];
const gradeKeys = ['t1', 't2', 't3', 't4', 't5', 't6', 'exam1', 'exam2', 'work'];

export default function PautaListPage() {
  const currentYear = systemDate().getFullYear();
  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState(null);
  const [years, setYears] = useState([currentYear]);
  const [year, setYear] = useState(currentYear);
  const [pautas, setPautas] = useState([]);
  const [deleteItem, setDeleteItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([getCourses(), getPautaYears()])
      .then(([loadedCourses, loadedYears]) => {
        if (!mounted) return;
        setCourses(loadedCourses.filter((item) => item.active));
        setYears(loadedYears);
      })
      .catch((loadError) => {
        if (mounted) setError(errorMessage(loadError));
      });
    return () => {
      mounted = false;
    };
  }, []);

  const courseId = course?.id ?? null;
  const load = useCallback(async () => {
    if (!courseId) {
      setPautas([]);
      return;
    }
    setLoading(true);
    try {
      setPautas(await getPautas({ year, courseId }));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [courseId, year]);

  useEffect(() => {
    load();
  }, [load]);

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
      onDone?.();
      setError(errorMessage(actionError));
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(() => filterBySearch(pautas, searchTerm, (item) => [
    item.studentCode,
    item.studentName,
    item.biNumber,
    item.phone,
    resultLabels[item.result],
  ]), [pautas, searchTerm]);
  const exportRows = rows.map((item) => ({
    studentCode: item.studentCode,
    studentName: displayText(item.studentName),
    biNumber: displayText(item.biNumber),
    phone: displayText(item.phone),
    ...Object.fromEntries(gradeKeys.map((key) => [key, formatGrade(item[key])])),
    frequency: formatGrade(item.frequency),
    finalAverage: formatGrade(item.finalAverage),
    result: resultLabels[item.result],
  }));
  const title = course ? `Pauta ${year}` : 'Pauta';
  const details = course ? [
    { label: 'Curso', value: displayText(course.name) },
    { label: 'Categoria', value: displayText(course.categoryName) },
    { label: 'Nível', value: displayText(course.levelName) },
    { label: 'Modalidade', value: displayText(course.modalityName) },
  ] : [];

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>Pautas</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={columns}
            rows={exportRows}
            filename={`pauta-${year}`}
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
        <CourseSelector courses={courses} onChange={setCourse} />
      </form>
      <StandardTable
        audit="PautaEntry"
        ariaLabel="Pautas"
        columns={tableColumns}
        emptyMessage={!course
          ? 'Selecione o curso, a categoria, o nível e a modalidade.'
          : searchTerm.trim()
            ? 'Nenhum registo corresponde à pesquisa.'
            : 'Ainda não existem pautas lançadas para este curso e ano.'}
        loading={loading}
        rows={rows}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{row.studentCode}</TableCell>
            <TableCell>{displayText(row.studentName)}</TableCell>
            <TableCell>{displayText(row.biNumber)}</TableCell>
            <TableCell>{displayText(row.phone)}</TableCell>
            {['t1', 't2', 't3', 't4', 't5', 't6'].map((key) => (
              <TableCell key={key}>{formatGrade(row[key])}</TableCell>
            ))}
            <TableCell>{formatGrade(row.frequency)}</TableCell>
            <TableCell>{formatGrade(row.exam1)}</TableCell>
            <TableCell>{formatGrade(row.exam2)}</TableCell>
            <TableCell>{formatGrade(row.work)}</TableCell>
            <TableCell>{formatGrade(row.finalAverage)}</TableCell>
            <TableCell>
              <span className={`cacoin-status-badge ${resultClass(row.result)}`}>
                {resultLabels[row.result]}
              </span>
            </TableCell>
            <TableCell align="right">
              <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                <Tooltip title="Actualizar com as notas actuais">
                  <span>
                    <IconButton
                      aria-label={`Actualizar pauta de ${row.studentCode}`}
                      disabled={saving}
                      onClick={() => run(
                        () => refreshPauta(row.id),
                        `Pauta de ${row.studentCode} actualizada.`,
                      )}
                    >
                      <RefreshCw size={17} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Apagar">
                  <span>
                    <IconButton
                      className="cacoin-table-action-delete"
                      aria-label={`Apagar pauta de ${row.studentCode}`}
                      disabled={saving}
                      onClick={() => setDeleteItem(row)}
                    >
                      <Trash2 size={17} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={Boolean(deleteItem)} onClose={() => !saving && setDeleteItem(null)} fullWidth maxWidth="xs">
        <DialogTitle>Apagar pauta</DialogTitle>
        <DialogContent>
          Apagar a pauta de {deleteItem?.studentCode} — {displayText(deleteItem?.studentName)}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteItem(null)} disabled={saving}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={saving}
            onClick={() => run(
              () => deletePauta(deleteItem.id),
              'Pauta apagada.',
              () => setDeleteItem(null),
            )}
          >
            {saving ? 'A apagar…' : 'Apagar'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
