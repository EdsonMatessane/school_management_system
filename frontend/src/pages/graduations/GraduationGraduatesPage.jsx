import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TableCell,
  TableRow,
} from '@mui/material';
import { UserPlus } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import {
  createGraduate,
  getCourses,
  getGraduates,
  getStudents,
} from '../../services/api';
import { displayText } from '../../utils/displayText';
import { filterBySearch } from '../../utils/search';
import GraduationStudentPicker from './GraduationStudentPicker';
import {
  errorMessage,
  formatDuration,
  graduationStatusClass,
  graduationStatusLabels,
} from './graduationUtils';

const columns = [
  { key: 'studentCode', label: 'Código do Estudante' },
  { key: 'studentName', label: 'Nome' },
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
  { key: 'duration', label: 'Duração' },
  { key: 'status', label: 'Estado' },
];

export default function GraduationGraduatesPage() {
  const [graduates, setGraduates] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [picked, setPicked] = useState({ course: null, student: null });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [loadedGraduates, loadedCourses, loadedStudents] = await Promise.all([
        getGraduates(),
        getCourses(),
        getStudents(),
      ]);
      setGraduates(loadedGraduates);
      setCourses(loadedCourses.filter((course) => course.active));
      setStudents(loadedStudents.filter((item) => item.active));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const registerGraduate = async (event) => {
    event.preventDefault();
    if (!picked.course || !picked.student) {
      setError('Selecione o curso e um estudante inscrito nesse curso.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await createGraduate({
        studentId: picked.student.id,
        courseId: picked.course.id,
      });
      setNotice(`${created.studentCode} foi registado como formado.`);
      setDialogOpen(false);
      setPicked({ course: null, student: null });
      await loadData();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(() => filterBySearch(graduates, searchTerm, (item) => [
    item.studentCode,
    item.studentName,
    item.courseName,
    item.categoryName,
    item.levelName,
    item.modalityName,
    graduationStatusLabels[item.status],
  ]), [graduates, searchTerm]);
  const exportRows = rows.map((item) => ({
    studentCode: item.studentCode,
    studentName: displayText(item.studentName),
    courseName: displayText(item.courseName),
    categoryName: displayText(item.categoryName),
    levelName: displayText(item.levelName),
    modalityName: displayText(item.modalityName),
    duration: formatDuration(item.durationMonths) || '—',
    status: graduationStatusLabels[item.status],
  }));

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>Formados</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <Button
            variant="contained"
            startIcon={<UserPlus size={17} />}
            onClick={() => {
              setError('');
              setDialogOpen(true);
            }}
          >
            Registar formado
          </Button>
          <DataExportMenu
            columns={columns}
            rows={exportRows}
            filename="graduacao-formados"
            title="Estudantes formados"
            disabled={loading}
            onError={(exportError) => setError(errorMessage(exportError))}
          />
        </div>
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && !dialogOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}
      <StandardTable
        audit="Graduate"
        ariaLabel="Estudantes formados"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar os dados.'
          : searchTerm.trim()
            ? 'Nenhum registo corresponde à pesquisa.'
            : 'Ainda não existem estudantes formados.'}
        loading={loading}
        rows={rows}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{row.studentCode}</TableCell>
            <TableCell>{displayText(row.studentName)}</TableCell>
            <TableCell>{displayText(row.courseName)}</TableCell>
            <TableCell>{displayText(row.categoryName)}</TableCell>
            <TableCell>{displayText(row.levelName)}</TableCell>
            <TableCell>{displayText(row.modalityName)}</TableCell>
            <TableCell>{formatDuration(row.durationMonths) || '—'}</TableCell>
            <TableCell>
              <span className={`cacoin-status-badge ${graduationStatusClass(row.status)}`}>
                {graduationStatusLabels[row.status]}
              </span>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog
        open={dialogOpen}
        onClose={() => {
          if (!saving) setDialogOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={registerGraduate}>
          <DialogTitle>Registar formado</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <GraduationStudentPicker
                courses={courses}
                students={students}
                onChange={setPicked}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'A registar…' : 'Registar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </section>
  );
}
