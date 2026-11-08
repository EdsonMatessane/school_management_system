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
  createStudentExamGrade,
  deleteStudentExam,
  deleteStudentExamGrade,
  getStudents,
  getStudentExamGrades,
  getStudentExams,
  setStudentExamCompleted,
  updateStudentExamGrade,
} from '../../../services/api';
import { filterBySearch } from '../../../utils/search';

const columns = [
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
  { key: 'unit', label: 'Módulo ou Disciplina' },
  { key: 'name', label: 'Nome do Exame' },
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


const unitLabel = (exam) => (
  `${exam.unitType === 'MODULE' ? 'Módulo' : 'Disciplina'} ${exam.unitNumber} — ${exam.unitName}`
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

export default function StudentExamManagementPage({
  historyMode = false,
  onCreate,
  onEdit,
  onStatusChanged,
  successMessage,
}) {
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [examToDelete, setExamToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [gradesExam, setGradesExam] = useState(null);
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
      const [loadedExams, loadedStudents] = await Promise.all([
        getStudentExams(),
        historyMode ? Promise.resolve([]) : getStudents(),
      ]);
      setExams(loadedExams);
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

  const filteredExams = useMemo(
    () => filterBySearch(
      exams.filter((exam) => (historyMode ? exam.completed : !exam.completed)),
      searchTerm,
      (exam) => [
        exam.courseName,
        exam.categoryName,
        exam.levelName,
        exam.modalityName,
        unitLabel(exam),
        exam.name,
        formatGrade(exam.maxGrade),
      ],
    ),
    [exams, searchTerm, historyMode],
  );

  const exportRows = useMemo(() => filteredExams.map((exam) => ({
    courseName: exam.courseName,
    categoryName: exam.categoryName,
    levelName: exam.levelName,
    modalityName: exam.modalityName,
    unit: unitLabel(exam),
    name: exam.name,
    maxGrade: formatGrade(exam.maxGrade),
  })), [filteredExams]);

  const eligibleStudents = useMemo(() => {
    if (!gradesExam) return [];
    const gradedIds = new Set(grades.map((grade) => grade.studentId));
    return students
      .filter((student) => (
        student.active
        && student.courseId === gradesExam.courseId
        && !gradedIds.has(student.id)
      ))
      .map((student) => ({
        id: student.id,
        code: student.studentCode,
        name: [student.firstName, student.surname].filter(Boolean).join(' '),
      }));
  }, [grades, gradesExam, students]);

  const gradeFieldError = gradesExam ? getGradeError(gradeForm.grade, gradesExam.maxGrade) : '';

  const toggleExamStatus = async (exam) => {
    setUpdatingStatusId(exam.id);
    setActionError('');
    try {
      await setStudentExamCompleted(exam.id, !exam.completed);
      onStatusChanged?.(exam, !exam.completed);
    } catch (statusError) {
      setActionError(getErrorMessage(statusError));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const confirmDeleteExam = async () => {
    if (!examToDelete) return;
    setDeleting(true);
    setActionError('');
    try {
      await deleteStudentExam(examToDelete.id);
      setNotice(`O exame ${examToDelete.name} foi apagado.`);
      setExamToDelete(null);
      await loadData();
    } catch (deleteError) {
      setActionError(getErrorMessage(deleteError));
    } finally {
      setDeleting(false);
    }
  };

  const openGrades = async (exam) => {
    setGradesExam(exam);
    setGrades([]);
    setGradesError('');
    setGradesLoading(true);
    try {
      setGrades(await getStudentExamGrades(exam.id));
    } catch (loadError) {
      setGradesError(getErrorMessage(loadError));
    } finally {
      setGradesLoading(false);
    }
  };

  const closeGrades = () => {
    setGradesExam(null);
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
        await updateStudentExamGrade(gradesExam.id, editingGrade.id, payload);
        setNotice('A nota foi atualizada.');
      } else {
        await createStudentExamGrade(gradesExam.id, payload);
        setNotice('A nota foi adicionada.');
      }
      setGradeFormOpen(false);
      setGrades(await getStudentExamGrades(gradesExam.id));
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
      await deleteStudentExamGrade(gradesExam.id, gradeToDelete.id);
      setNotice('A nota foi apagada.');
      setGradeToDelete(null);
      setGrades(await getStudentExamGrades(gradesExam.id));
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
            filename={historyMode ? 'historico-exames' : 'exames'}
            title={historyMode ? 'Histórico de Exames' : 'Lista de Exames'}
            disabled={loading}
            onError={(exportError) => setActionError(exportError.message)}
          />
          {!historyMode && (
            <Button variant="contained" startIcon={<Plus size={17} />} onClick={onCreate}>
              Criar exame
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
        audit="StudentExam"
        ariaLabel="Lista de exames"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar os exames.'
          : searchTerm.trim()
            ? 'Nenhum exame corresponde à pesquisa.'
            : historyMode
              ? 'Ainda não existem exames no histórico.'
              : 'Ainda não existem exames por concluir.'}
        loading={loading}
        rows={filteredExams}
        renderRow={(exam, rowNumber) => (
          <TableRow key={exam.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{exam.courseName}</TableCell>
            <TableCell>{exam.categoryName}</TableCell>
            <TableCell>{exam.levelName}</TableCell>
            <TableCell>{exam.modalityName}</TableCell>
            <TableCell>{unitLabel(exam)}</TableCell>
            <TableCell>
              <span className="cacoin-level-name">
                <ClipboardList size={17} aria-hidden="true" />
                {exam.name}
              </span>
            </TableCell>
            <TableCell>{formatGrade(exam.maxGrade)}</TableCell>
            <TableCell align="right">
              <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                {historyMode ? (
                  <Tooltip title="Ver notas">
                    <IconButton
                      aria-label={`Ver notas de ${exam.name}`}
                      onClick={() => openGrades(exam)}
                    >
                      <Eye size={17} />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <>
                    <Tooltip title="Adicionar notas">
                      <IconButton
                        aria-label={`Adicionar notas a ${exam.name}`}
                        onClick={() => openGrades(exam)}
                      >
                        <ClipboardPen size={17} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar exame">
                      <IconButton
                        className="cacoin-table-action-edit"
                        aria-label={`Editar ${exam.name}`}
                        onClick={() => onEdit(exam)}
                      >
                        <Pencil size={17} />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
                <Tooltip title={exam.completed ? 'Reabrir exame' : 'Concluir exame'}>
                  <span>
                    <IconButton
                      className={exam.completed
                        ? 'cacoin-table-action-deactivate'
                        : 'cacoin-table-action-activate'}
                      aria-label={`${exam.completed ? 'Reabrir' : 'Concluir'} ${exam.name}`}
                      onClick={() => toggleExamStatus(exam)}
                      disabled={updatingStatusId === exam.id}
                    >
                      {exam.completed ? <RotateCcw size={17} /> : <CircleCheck size={17} />}
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Apagar exame">
                  <IconButton
                    className="cacoin-table-action-delete"
                    aria-label={`Apagar ${exam.name}`}
                    onClick={() => setExamToDelete(exam)}
                  >
                    <Trash2 size={17} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={Boolean(gradesExam)} onClose={closeGrades} fullWidth maxWidth="md">
        <DialogTitle>Notas — {gradesExam?.name}</DialogTitle>
        <DialogContent>
          {gradesError && <Alert severity="error" sx={{ mb: 2 }}>{gradesError}</Alert>}
          <StandardTable
            audit="StudentExamGrade"
            ariaLabel={`Notas do exame ${gradesExam?.name ?? ''}`}
            columns={visibleGradeColumns}
            emptyMessage={gradesLoading
              ? 'A carregar notas…'
              : 'Este exame ainda não tem notas.'}
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
            rows={gradesExam ? [{
              courseName: gradesExam.courseName,
              categoryName: gradesExam.categoryName,
              levelName: gradesExam.levelName,
              modalityName: gradesExam.modalityName,
              unit: unitLabel(gradesExam),
              name: gradesExam.name,
              maxGrade: formatGrade(gradesExam.maxGrade),
            }] : []}
            secondary={{ columns: gradeColumns, rows: gradeExportRows }}
            filename={`notas-${(gradesExam?.name ?? 'exame').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            title={`Notas — ${gradesExam?.name ?? ''}`}
            disabled={gradesLoading}
            onError={(exportError) => setGradesError(exportError.message)}
          />
          {!historyMode && (
            <Button
              variant="contained"
              startIcon={<Plus size={17} />}
              onClick={openGradeCreateForm}
              disabled={!gradesExam || gradesLoading}
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
        open={Boolean(examToDelete)}
        onClose={() => !deleting && setExamToDelete(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Apagar exame</DialogTitle>
        <DialogContent>
          Tem a certeza de que pretende apagar o exame {examToDelete?.name}? As notas
          associadas também serão apagadas.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExamToDelete(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button color="error" variant="contained" onClick={confirmDeleteExam} disabled={deleting}>
            {deleting ? 'A apagar…' : 'Apagar'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
