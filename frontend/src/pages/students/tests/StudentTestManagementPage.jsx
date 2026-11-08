import { formatGrade } from '../../../utils/grade';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CircleCheck,
  ClipboardList,
  ClipboardPen,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
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
import SearchField from '../../../components/SearchField';
import StandardTable from '../../../components/StandardTable';
import DataExportMenu from '../../../components/DataExportMenu';
import {
  createStudentTestGrade,
  deleteStudentTest,
  deleteStudentTestGrade,
  getStudents,
  getStudentTestGrades,
  getStudentTests,
  setStudentTestCompleted,
  updateStudentTestGrade,
} from '../../../services/api';
import { filterBySearch } from '../../../utils/search';

const columns = [
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
  { key: 'unit', label: 'Módulo ou Disciplina' },
  { key: 'name', label: 'Nome do Teste' },
  { key: 'maxGrade', label: 'Nota Máxima' },
  { key: 'actions', label: 'Ações', align: 'right' },
];

const exportColumns = columns.filter(({ key }) => key !== 'actions');

const gradeColumns = [
  { key: 'studentCode', label: 'ID do Estudante' },
  { key: 'studentName', label: 'Nome' },
  { key: 'grade', label: 'Nota' },
  { key: 'observations', label: 'Observações' },
];

const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';


const unitLabel = (test) => (
  `${test.unitType === 'MODULE' ? 'Módulo' : 'Disciplina'} ${test.unitNumber} — ${test.unitName}`
);

const displayGrade = (grade) => (grade.absent ? '-' : formatGrade(grade.grade));

const sanitizeGrade = (value) => (
  value.startsWith('-') ? '-' : value.replace(/[^\d.,]/g, '').slice(0, 5)
);

const getGradeError = (value, maxGrade) => {
  const raw = value.trim();
  if (!raw || raw === '-') return '';
  const normalized = raw.replace(',', '.');
  if (!/^\d{1,2}([.]\d{1,2})?$/.test(normalized)) return 'Indique um número válido ou "-".';
  if (Number(normalized) > Number(maxGrade)) {
    return `A nota não pode ser superior a ${formatGrade(maxGrade)}.`;
  }
  return '';
};

const emptyGradeForm = { student: null, grade: '', observations: '' };

export default function StudentTestManagementPage({
  historyMode = false,
  onCreate,
  onEdit,
  onStatusChanged,
  successMessage,
}) {
  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [testToDelete, setTestToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [gradesTest, setGradesTest] = useState(null);
  const [grades, setGrades] = useState([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesError, setGradesError] = useState('');
  const [gradeFormOpen, setGradeFormOpen] = useState(false);
  const [gradeFormError, setGradeFormError] = useState('');
  const [editingGrade, setEditingGrade] = useState(null);
  const [gradeForm, setGradeForm] = useState(emptyGradeForm);
  const [gradeToDelete, setGradeToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [loadedTests, loadedStudents] = await Promise.all([
        getStudentTests(),
        historyMode ? Promise.resolve([]) : getStudents(),
      ]);
      setTests(loadedTests);
      setStudents(loadedStudents);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [historyMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTests = useMemo(
    () => filterBySearch(
      tests.filter((test) => (historyMode ? test.completed : !test.completed)),
      searchTerm,
      (test) => [
        test.courseName,
        test.categoryName,
        test.levelName,
        test.modalityName,
        unitLabel(test),
        test.name,
        formatGrade(test.maxGrade),
      ],
    ),
    [tests, searchTerm, historyMode],
  );

  const exportRows = useMemo(() => filteredTests.map((test) => ({
    courseName: test.courseName,
    categoryName: test.categoryName,
    levelName: test.levelName,
    modalityName: test.modalityName,
    unit: unitLabel(test),
    name: test.name,
    maxGrade: formatGrade(test.maxGrade),
  })), [filteredTests]);

  const eligibleStudents = useMemo(() => {
    if (!gradesTest) return [];
    const gradedIds = new Set(grades.map((grade) => grade.studentId));
    return students
      .filter((student) => (
        student.active
        && student.courseId === gradesTest.courseId
        && !gradedIds.has(student.id)
      ))
      .map((student) => ({
        id: student.id,
        code: student.studentCode,
        name: [student.firstName, student.surname].filter(Boolean).join(' '),
      }));
  }, [grades, gradesTest, students]);

  const gradeFieldError = gradesTest ? getGradeError(gradeForm.grade, gradesTest.maxGrade) : '';

  const toggleTestStatus = async (test) => {
    setUpdatingStatusId(test.id);
    setActionError('');
    try {
      await setStudentTestCompleted(test.id, !test.completed);
      onStatusChanged?.(test, !test.completed);
    } catch (statusError) {
      setActionError(getErrorMessage(statusError));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const confirmDeleteTest = async () => {
    if (!testToDelete) return;
    setDeleting(true);
    setActionError('');
    try {
      await deleteStudentTest(testToDelete.id);
      setNotice(`O teste ${testToDelete.name} foi apagado.`);
      setTestToDelete(null);
      await loadData();
    } catch (deleteError) {
      setActionError(getErrorMessage(deleteError));
    } finally {
      setDeleting(false);
    }
  };

  const openGrades = async (test) => {
    setGradesTest(test);
    setGrades([]);
    setGradesError('');
    setGradesLoading(true);
    try {
      setGrades(await getStudentTestGrades(test.id));
    } catch (loadError) {
      setGradesError(getErrorMessage(loadError));
    } finally {
      setGradesLoading(false);
    }
  };

  const closeGrades = () => {
    setGradesTest(null);
    setGrades([]);
    setGradesError('');
  };

  const openGradeCreateForm = () => {
    setEditingGrade(null);
    setGradeForm(emptyGradeForm);
    setGradeFormError('');
    setGradeFormOpen(true);
  };

  const openGradeEditForm = (grade) => {
    setEditingGrade(grade);
    setGradeForm({
      student: { id: grade.studentId, code: grade.studentCode, name: grade.studentName },
      grade: displayGrade(grade),
      observations: grade.observations ?? '',
    });
    setGradeFormError('');
    setGradeFormOpen(true);
  };

  const submitGrade = async (event) => {
    event.preventDefault();
    if (!gradeForm.student) {
      setGradeFormError('Selecione um estudante.');
      return;
    }
    if (!gradeForm.grade.trim()) {
      setGradeFormError('Indique a nota ou "-".');
      return;
    }
    if (gradeFieldError) {
      setGradeFormError(gradeFieldError);
      return;
    }
    setSaving(true);
    setGradeFormError('');
    try {
      const payload = {
        studentId: gradeForm.student.id,
        grade: gradeForm.grade.trim(),
        observations: gradeForm.observations,
      };
      if (editingGrade) {
        await updateStudentTestGrade(gradesTest.id, editingGrade.id, payload);
        setNotice('A nota foi atualizada.');
      } else {
        await createStudentTestGrade(gradesTest.id, payload);
        setNotice('A nota foi adicionada.');
      }
      setGradeFormOpen(false);
      setGrades(await getStudentTestGrades(gradesTest.id));
    } catch (saveError) {
      setGradeFormError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteGrade = async () => {
    if (!gradeToDelete) return;
    setSaving(true);
    setGradesError('');
    try {
      await deleteStudentTestGrade(gradesTest.id, gradeToDelete.id);
      setNotice('A nota foi apagada.');
      setGradeToDelete(null);
      setGrades(await getStudentTestGrades(gradesTest.id));
    } catch (deleteError) {
      setGradesError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  const gradeExportRows = grades.map((grade) => ({
    studentCode: grade.studentCode,
    studentName: grade.studentName,
    grade: displayGrade(grade),
    observations: grade.observations || '—',
  }));

  const visibleGradeColumns = historyMode
    ? gradeColumns
    : [...gradeColumns, { key: 'actions', label: 'Ações', align: 'right' }];

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>{historyMode ? 'Histórico' : 'Gerir'}</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename={historyMode ? 'historico-testes' : 'testes'}
            title={historyMode ? 'Histórico de Testes' : 'Lista de Testes'}
            disabled={loading}
            onError={(exportError) => setActionError(exportError.message)}
          />
          {!historyMode && (
            <Button variant="contained" startIcon={<Plus size={17} />} onClick={onCreate}>
              Criar teste
            </Button>
          )}
        </div>
      </header>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>
      )}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError('')}>
          {actionError}
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <StandardTable
        audit="StudentTest"
        ariaLabel="Lista de testes"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar os testes.'
          : searchTerm.trim()
            ? 'Nenhum teste corresponde à pesquisa.'
            : historyMode
              ? 'Ainda não existem testes no histórico.'
              : 'Ainda não existem testes por concluir.'}
        loading={loading}
        rows={filteredTests}
        renderRow={(test, rowNumber) => (
          <TableRow key={test.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{test.courseName}</TableCell>
            <TableCell>{test.categoryName}</TableCell>
            <TableCell>{test.levelName}</TableCell>
            <TableCell>{test.modalityName}</TableCell>
            <TableCell>{unitLabel(test)}</TableCell>
            <TableCell>
              <span className="cacoin-level-name">
                <ClipboardList size={17} aria-hidden="true" />
                {test.name}
              </span>
            </TableCell>
            <TableCell>{formatGrade(test.maxGrade)}</TableCell>
            <TableCell align="right">
              <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                {historyMode ? (
                  <Tooltip title="Ver notas">
                    <IconButton
                      aria-label={`Ver notas de ${test.name}`}
                      onClick={() => openGrades(test)}
                    >
                      <Eye size={17} />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <>
                    <Tooltip title="Adicionar notas">
                      <IconButton
                        aria-label={`Adicionar notas a ${test.name}`}
                        onClick={() => openGrades(test)}
                      >
                        <ClipboardPen size={17} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar teste">
                      <IconButton
                        className="cacoin-table-action-edit"
                        aria-label={`Editar ${test.name}`}
                        onClick={() => onEdit(test)}
                      >
                        <Pencil size={17} />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
                <Tooltip title={test.completed ? 'Reabrir teste' : 'Concluir teste'}>
                  <span>
                    <IconButton
                      className={test.completed
                        ? 'cacoin-table-action-deactivate'
                        : 'cacoin-table-action-activate'}
                      aria-label={`${test.completed ? 'Reabrir' : 'Concluir'} ${test.name}`}
                      onClick={() => toggleTestStatus(test)}
                      disabled={updatingStatusId === test.id}
                    >
                      {test.completed ? <RotateCcw size={17} /> : <CircleCheck size={17} />}
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Apagar teste">
                  <IconButton
                    className="cacoin-table-action-delete"
                    aria-label={`Apagar ${test.name}`}
                    onClick={() => setTestToDelete(test)}
                  >
                    <Trash2 size={17} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={Boolean(gradesTest)} onClose={closeGrades} fullWidth maxWidth="md">
        <DialogTitle>Notas — {gradesTest?.name}</DialogTitle>
        <DialogContent>
          {gradesError && <Alert severity="error" sx={{ mb: 2 }}>{gradesError}</Alert>}
          <StandardTable
            audit="StudentTestGrade"
            ariaLabel={`Notas do teste ${gradesTest?.name ?? ''}`}
            columns={visibleGradeColumns}
            emptyMessage={gradesLoading
              ? 'A carregar notas…'
              : 'Este teste ainda não tem notas.'}
            loading={gradesLoading}
            rows={grades}
            renderRow={(grade, rowNumber) => (
              <TableRow key={grade.id} hover>
                <TableCell>{rowNumber}</TableCell>
                <TableCell>{grade.studentCode}</TableCell>
                <TableCell>{grade.studentName}</TableCell>
                <TableCell>{displayGrade(grade)}</TableCell>
                <TableCell>{grade.observations || '—'}</TableCell>
                {!historyMode && (
                  <TableCell align="right">
                    <Tooltip title="Editar nota">
                      <IconButton
                        className="cacoin-table-action-edit"
                        aria-label={`Editar nota de ${grade.studentCode}`}
                        onClick={() => openGradeEditForm(grade)}
                      >
                        <Pencil size={17} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Apagar nota">
                      <IconButton
                        className="cacoin-table-action-delete"
                        aria-label={`Apagar nota de ${grade.studentCode}`}
                        onClick={() => setGradeToDelete(grade)}
                      >
                        <Trash2 size={17} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            )}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeGrades}>Fechar</Button>
          <DataExportMenu
            columns={exportColumns}
            rows={gradesTest ? [{
              courseName: gradesTest.courseName,
              categoryName: gradesTest.categoryName,
              levelName: gradesTest.levelName,
              modalityName: gradesTest.modalityName,
              unit: unitLabel(gradesTest),
              name: gradesTest.name,
              maxGrade: formatGrade(gradesTest.maxGrade),
            }] : []}
            secondary={{ columns: gradeColumns, rows: gradeExportRows }}
            filename={`notas-${(gradesTest?.name ?? 'teste').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            title={`Notas — ${gradesTest?.name ?? ''}`}
            disabled={gradesLoading}
            onError={(exportError) => setGradesError(exportError.message)}
          />
          {!historyMode && (
            <Button
              variant="contained"
              startIcon={<Plus size={17} />}
              onClick={openGradeCreateForm}
              disabled={!gradesTest || gradesLoading}
            >
              Adicionar nota
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={gradeFormOpen}
        onClose={() => !saving && setGradeFormOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={submitGrade}>
          <DialogTitle>{editingGrade ? 'Editar nota' : 'Adicionar nota'}</DialogTitle>
          <DialogContent>
            {gradeFormError && <Alert severity="error" sx={{ mt: 1, mb: 2 }}>{gradeFormError}</Alert>}
            <div className="cacoin-course-form-grid">
              <Autocomplete
                options={eligibleStudents}
                value={gradeForm.student}
                getOptionLabel={(student) => [student.code, student.name].filter(Boolean).join(' — ')}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                filterOptions={(options, { inputValue }) => filterBySearch(
                  options,
                  inputValue,
                  (student) => [student.code, student.name],
                )}
                onChange={(_, student) => setGradeForm((current) => ({ ...current, student }))}
                disabled={Boolean(editingGrade)}
                noOptionsText="Nenhum estudante disponível."
                renderInput={(params) => (
                  <TextField {...params} required label="Estudante" size="small" />
                )}
              />
              <TextField
                fullWidth
                size="small"
                label="ID do Estudante"
                value={gradeForm.student?.code ?? ''}
                disabled
              />
              <TextField
                fullWidth
                size="small"
                label="Nome"
                value={gradeForm.student?.name ?? ''}
                disabled
              />
              <TextField
                required
                fullWidth
                size="small"
                label="Nota"
                value={gradeForm.grade}
                onChange={(event) => setGradeForm((current) => ({
                  ...current,
                  grade: sanitizeGrade(event.target.value),
                }))}
                error={Boolean(gradeFieldError)}
                helperText={gradeFieldError || undefined}
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              />
              <TextField
                fullWidth
                multiline
                maxRows={4}
                size="small"
                label="Observações"
                value={gradeForm.observations}
                onChange={(event) => setGradeForm((current) => ({
                  ...current,
                  observations: event.target.value,
                }))}
              />
            </div>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setGradeFormOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving || Boolean(gradeFieldError)}>
              {editingGrade ? 'Guardar alterações' : 'Adicionar nota'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(gradeToDelete)}
        onClose={() => !saving && setGradeToDelete(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Apagar nota</DialogTitle>
        <DialogContent>
          Tem a certeza de que pretende apagar a nota de {gradeToDelete?.studentCode}
          {' '}— {gradeToDelete?.studentName}?
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setGradeToDelete(null)} disabled={saving}>Cancelar</Button>
          <Button onClick={confirmDeleteGrade} disabled={saving}>Apagar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(testToDelete)}
        onClose={() => !deleting && setTestToDelete(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Apagar teste</DialogTitle>
        <DialogContent>
          Tem a certeza de que pretende apagar o teste {testToDelete?.name}? As notas
          associadas também serão apagadas.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestToDelete(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button color="error" variant="contained" onClick={confirmDeleteTest} disabled={deleting}>
            {deleting ? 'A apagar…' : 'Apagar'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
