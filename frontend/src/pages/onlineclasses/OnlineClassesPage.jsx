import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Chip,
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
import {
  ExternalLink,
  Link2,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Users,
  Video,
} from 'lucide-react';
import RichTextField from '../../components/RichTextField';
import StandardTable from '../../components/StandardTable';
import SearchField from '../../components/SearchField';
import { api, getCourses, getStaff, getStudents } from '../../services/api';
import { displayText } from '../../utils/displayText';
import { richTextToPlain } from '../../utils/richText';
import { formatDateTime } from '../../utils/date';
import './online-classes.css';

const emptyLessonFilters = {
  courseId: '',
  categoryId: '',
  levelId: '',
  modalityId: '',
};

const emptyMaterialForm = {
  lesson: null,
  title: '',
  type: 'LINK',
  url: '',
  description: '',
};

const emptyAttendanceForm = {
  lesson: null,
  student: null,
  status: 'PRESENT',
  notes: '',
};

const platforms = [
  { value: 'GOOGLE_MEET', label: 'Google Meet' },
  { value: 'ZOOM', label: 'Zoom' },
  { value: 'TEAMS', label: 'Microsoft Teams' },
  { value: 'OTHER', label: 'Outro' },
];

const materialTypes = [
  { value: 'LINK', label: 'Link externo' },
  { value: 'RECORDING', label: 'Gravação' },
  { value: 'DOCUMENT', label: 'Documento' },
  { value: 'VIDEO', label: 'Vídeo' },
];

const lessonColumns = [
  { key: 'title', label: 'Aula' },
  { key: 'course', label: 'Curso' },
  { key: 'category', label: 'Categoria' },
  { key: 'level', label: 'Nível' },
  { key: 'modality', label: 'Modalidade' },
  { key: 'teacher', label: 'Professor' },
  { key: 'startAt', label: 'Data e hora' },
  { key: 'platform', label: 'Plataforma' },
  { key: 'materials', label: 'Materiais', align: 'center' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: 'Ações', align: 'right' },
];

const materialColumns = [
  { key: 'title', label: 'Material' },
  { key: 'lesson', label: 'Aula' },
  { key: 'type', label: 'Tipo' },
  { key: 'url', label: 'Ligação' },
  { key: 'actions', label: 'Ações', align: 'right' },
];

const attendanceColumns = [
  { key: 'lesson', label: 'Aula' },
  { key: 'student', label: 'Estudante' },
  { key: 'status', label: 'Presença' },
  { key: 'justificationStatus', label: 'Justificação' },
  { key: 'paymentStatus', label: 'Pagamento' },
  { key: 'recordedAt', label: 'Registado em' },
  { key: 'actions', label: 'Ações', align: 'right' },
];

const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.message ||
  'Não foi possível concluir a operação.';

const getStudentName = (student) =>
  [student?.firstName, student?.surname].filter(Boolean).join(' ') ||
  student?.name ||
  student?.studentCode ||
  '';

const formatTeacherName = (teacher) =>
  [teacher?.firstName, teacher?.surname].filter(Boolean).join(' ') ||
  teacher?.name ||
  teacher?.staffCode ||
  '';

const formatMoney = (value) =>
  Number(value || 0).toLocaleString('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
  });

export default function OnlineClassesPage({ onEditLesson }) {
  const [lessons, setLessons] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceSettings, setAttendanceSettings] = useState(null);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [lessonFilters, setLessonFilters] = useState(emptyLessonFilters);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [view, setView] = useState('lessons');
  const [dialog, setDialog] = useState('');
  const [materialForm, setMaterialForm] = useState(emptyMaterialForm);
  const [attendanceForm, setAttendanceForm] = useState(emptyAttendanceForm);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [attendanceEditForm, setAttendanceEditForm] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [
        loadedLessons,
        loadedMaterials,
        loadedAttendance,
        loadedCourses,
        loadedTeachers,
        loadedStudents,
        loadedAttendanceSettings,
      ] = await Promise.all([
        api.get('/online-classes'),
        api.get('/online-classes/materials'),
        api.get('/online-classes/attendance'),
        getCourses(),
        getStaff('teachers'),
        getStudents(),
        api.get('/online-classes/settings/attendance'),
      ]);
      setLessons(loadedLessons.data);
      setMaterials(loadedMaterials.data);
      setAttendance(loadedAttendance.data);
      setCourses(loadedCourses);
      setTeachers(loadedTeachers);
      setStudents(loadedStudents);
      setAttendanceSettings(loadedAttendanceSettings.data);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredLessons = useMemo(() => {
    const isReady = Object.values(lessonFilters).every(Boolean);
    if (!isReady) return [];
    const query = searchTerm.trim().toLocaleLowerCase('pt-MZ');
    return lessons.filter((lesson) => {
      const course = courses.find(
        (item) => String(item.id) === String(lesson.courseId),
      );
      const teacher = teachers.find((item) => item.id === lesson.teacherId);
      const matchesFilters =
        String(lesson.courseId) === lessonFilters.courseId &&
        String(course?.categoryId) === lessonFilters.categoryId &&
        String(course?.levelId) === lessonFilters.levelId &&
        String(course?.modalityId) === lessonFilters.modalityId;
      const matchesQuery = [
        lesson.title,
        richTextToPlain(lesson.description),
        course?.name,
        formatTeacherName(teacher),
        lesson.platform,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-MZ')
        .includes(query);
      return matchesFilters && matchesQuery;
    });
  }, [courses, lessonFilters, lessons, searchTerm, teachers]);

  const filterCourses = useMemo(
    () => courses.filter((course) => course.active),
    [courses],
  );
  const selectedFilterCourse = filterCourses.find(
    (course) => String(course.id) === lessonFilters.courseId,
  );
  const lessonFilterOptions = useMemo(
    () =>
      selectedFilterCourse
        ? {
            categories: [
              {
                id: selectedFilterCourse.categoryId,
                name: selectedFilterCourse.categoryName,
              },
            ],
            levels: [
              {
                id: selectedFilterCourse.levelId,
                name: selectedFilterCourse.levelName,
              },
            ],
            modalities: [
              {
                id: selectedFilterCourse.modalityId,
                name: selectedFilterCourse.modalityName,
              },
            ],
          }
        : { categories: [], levels: [], modalities: [] },
    [selectedFilterCourse],
  );
  const lessonFiltersReady = Object.values(lessonFilters).every(Boolean);
  const changeLessonFilter = (key) => (event) => {
    const value = event.target.value;
    if (key === 'courseId') {
      const course = filterCourses.find((item) => String(item.id) === value);
      setLessonFilters({
        ...emptyLessonFilters,
        courseId: value,
        categoryId: course ? String(course.categoryId) : '',
      });
      return;
    }
    setLessonFilters((current) => ({ ...current, [key]: value }));
  };

  const filteredMaterials = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('pt-MZ');
    return materials.filter((material) => {
      const lesson = lessons.find((item) => item.id === material.lessonId);
      return [
        material.title,
        material.type,
        richTextToPlain(material.description),
        lesson?.title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-MZ')
        .includes(query);
    });
  }, [lessons, materials, searchTerm]);

  const filteredAttendance = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('pt-MZ');
    return attendance.filter((record) => {
      const lesson = lessons.find((item) => item.id === record.lessonId);
      const student = students.find((item) => item.id === record.studentId);
      return [
        lesson?.title,
        record.studentName,
        student && getStudentName(student),
        record.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-MZ')
        .includes(query);
    });
  }, [attendance, lessons, searchTerm, students]);

  const resetForm = () => {
    setMaterialForm(emptyMaterialForm);
    setAttendanceForm(emptyAttendanceForm);
  };

  const openDialog = (name) => {
    resetForm();
    setError('');
    setDialog(name);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog('');
    setError('');
  };

  const saveMaterial = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/online-classes/materials', {
        title: materialForm.title.trim(),
        type: materialForm.type,
        url: materialForm.url,
        description: materialForm.description,
        lessonId: materialForm.lesson.id,
      });
      setDialog('');
      setNotice('O material foi adicionado.');
      await loadData();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const saveAttendance = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const student = attendanceForm.student;
    const isStudentOption = student && typeof student === 'object';
    // Estudante registado: só o ID é guardado (o nome lê-se da tabela de estudantes).
    const studentName = isStudentOption
      ? null
      : typeof student === 'string'
        ? student.trim()
        : '';
    try {
      await api.post('/online-classes/attendance', {
        lessonId: attendanceForm.lesson.id,
        studentId: isStudentOption ? student.id : null,
        studentName,
        status: attendanceForm.status,
        notes: attendanceForm.notes,
      });
      setDialog('');
      setNotice('A presença foi registada.');
      await loadData();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const openAttendanceEdit = (record) => {
    setEditingAttendance(record);
    setAttendanceEditForm({
      status: record.status,
      justificationStatus: record.justificationStatus || 'NOT_JUSTIFIED',
      paymentStatus: record.paymentStatus || 'PENDING',
      notes: record.notes || '',
    });
    setError('');
    setDialog('attendance-edit');
  };

  const saveAttendanceEdit = async (event) => {
    event.preventDefault();
    if (!editingAttendance || !attendanceEditForm) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/online-classes/attendance/${editingAttendance.id}`, {
        ...attendanceEditForm,
        justificationStatus:
          attendanceEditForm.status === 'ABSENT'
            ? attendanceEditForm.justificationStatus
            : null,
        paymentStatus:
          attendanceEditForm.status === 'ABSENT'
            ? attendanceEditForm.paymentStatus
            : null,
      });
      setDialog('');
      setEditingAttendance(null);
      setAttendanceEditForm(null);
      setNotice('A presença foi atualizada.');
      await loadData();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async () => {
    if (!deletingItem) return;
    setSaving(true);
    setError('');
    const { type, item } = deletingItem;
    const path =
      type === 'lesson'
        ? `/online-classes/${item.id}`
        : type === 'material'
          ? `/online-classes/materials/${item.id}`
          : `/online-classes/attendance/${item.id}`;
    try {
      await api.delete(path);
      setDeletingItem(null);
      setNotice(
        type === 'lesson'
          ? 'A aula foi eliminada.'
          : type === 'material'
            ? 'O material foi eliminado.'
            : 'A presença foi eliminada.',
      );
      await loadData();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  const pageActions = {
    materials: {
      label: 'Adicionar material',
      onClick: () => openDialog('material'),
    },
    attendance: {
      label: 'Registar presença',
      onClick: () => openDialog('attendance'),
    },
  };
  const PageActionIcon = view === 'materials' ? Paperclip : Plus;
  const deletingLabel =
    deletingItem?.type === 'lesson'
      ? deletingItem.item.title
      : deletingItem?.type === 'material'
        ? deletingItem.item.title
        : deletingItem?.item.studentName || 'presença';

  return (
    <section className="cacoin-course-page cacoin-tasks-page online-classes-page">
      <header className="cacoin-page-heading online-classes-heading">
        <div>
          <p className="cacoin-eyebrow">Aulas Online</p>
          <h1>Registadas</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          {view !== 'lessons' && (
            <Button
              variant="contained"
              startIcon={<PageActionIcon size={17} />}
              onClick={pageActions[view].onClick}
            >
              {pageActions[view].label}
            </Button>
          )}
        </div>
      </header>

      {error && !dialog && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      {view === 'lessons' && (
        <section className="cacoin-task-dashboard-panel cacoin-tests-dashboard-filters">
          <header>
            <div>
              <h2>Filtros do relatório</h2>
            </div>
            <Video size={20} aria-hidden="true" />
          </header>
          <div className="cacoin-tests-dashboard-filter-grid">
            <TextField
              select
              size="small"
              label="Curso"
              value={lessonFilters.courseId}
              onChange={changeLessonFilter('courseId')}
            >
              {filterCourses.map((course) => (
                <MenuItem key={course.id} value={String(course.id)}>
                  {displayText(course.name)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Categoria"
              value={lessonFilters.categoryId}
              disabled={!selectedFilterCourse}
              onChange={changeLessonFilter('categoryId')}
            >
              {lessonFilterOptions.categories.map((category) => (
                <MenuItem key={category.id} value={String(category.id)}>
                  {displayText(category.name)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Nível"
              value={lessonFilters.levelId}
              disabled={!selectedFilterCourse}
              onChange={changeLessonFilter('levelId')}
            >
              {lessonFilterOptions.levels.map((level) => (
                <MenuItem key={level.id} value={String(level.id)}>
                  {displayText(level.name)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Modalidade"
              value={lessonFilters.modalityId}
              disabled={!selectedFilterCourse}
              onChange={changeLessonFilter('modalityId')}
            >
              {lessonFilterOptions.modalities.map((modality) => (
                <MenuItem key={modality.id} value={String(modality.id)}>
                  {displayText(modality.name)}
                </MenuItem>
              ))}
            </TextField>
          </div>
        </section>
      )}

      <Tabs
        className="online-classes-tabs"
        value={view}
        onChange={(_, nextView) => {
          setView(nextView);
          setSearchTerm('');
        }}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label="Registos das aulas online"
      >
        <Tab
          value="lessons"
          label="Aulas"
          icon={<Video size={17} />}
          iconPosition="start"
        />
        <Tab
          value="materials"
          label={`Materiais (${materials.length})`}
          icon={<Paperclip size={17} />}
          iconPosition="start"
        />
        <Tab
          value="attendance"
          label={`Presenças (${attendance.length})`}
          icon={<Users size={17} />}
          iconPosition="start"
        />
      </Tabs>

      {view === 'lessons' && (
        <StandardTable
          audit="OnlineLesson"
          ariaLabel="Lista de aulas online"
          columns={lessonColumns}
          emptyMessage={
            error
              ? 'Não foi possível carregar as aulas.'
              : searchTerm.trim()
                ? 'Nenhuma aula corresponde aos critérios selecionados.'
                : !lessonFiltersReady
                  ? 'Selecione curso, categoria, nível e modalidade.'
                  : 'Ainda não existem aulas registadas.'
          }
          loading={loading}
          rows={filteredLessons}
          renderRow={(lesson, rowNumber) => {
            const course = courses.find((item) => item.id === lesson.courseId);
            const teacher = teachers.find(
              (item) => item.id === lesson.teacherId,
            );
            const lessonStatus =
              currentTime < new Date(lesson.startAt).getTime()
                ? { label: 'Agendada', className: 'scheduled' }
                : currentTime < new Date(lesson.endAt).getTime()
                  ? { label: 'Em direto', className: 'live' }
                  : { label: 'Concluída', className: 'completed' };
            return (
              <TableRow key={lesson.id} hover>
                <TableCell>{rowNumber}</TableCell>
                <TableCell>{lesson.title}</TableCell>
                <TableCell>{course?.name || '—'}</TableCell>
                <TableCell>{course?.categoryName || '—'}</TableCell>
                <TableCell>{course?.levelName || '—'}</TableCell>
                <TableCell>{course?.modalityName || '—'}</TableCell>
                <TableCell>{formatTeacherName(teacher) || '—'}</TableCell>
                <TableCell>
                  <Stack>
                    <span>{formatDateTime(lesson.startAt)}</span>
                    <span className="online-classes-secondary-value">
                      {formatDateTime(lesson.endAt)}
                    </span>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack>
                    <span>
                      {platforms.find((item) => item.value === lesson.platform)
                        ?.label ||
                        lesson.platform ||
                        '—'}
                    </span>
                    {lesson.meetingPassword && (
                      <span className="online-classes-secondary-value">
                        Código: {lesson.meetingPassword}
                      </span>
                    )}
                  </Stack>
                </TableCell>
                <TableCell align="center">
                  {
                    materials.filter(
                      (material) => material.lessonId === lesson.id,
                    ).length
                  }
                </TableCell>
                <TableCell>
                  <span
                    className={`cacoin-status-badge online-class-status-badge ${lessonStatus.className}`}
                  >
                    {lessonStatus.label}
                  </span>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                    {lesson.meetingUrl && (
                      <Tooltip title="Abrir aula">
                        <IconButton
                          component="a"
                          href={lesson.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Abrir aula ${lesson.title}`}
                        >
                          <ExternalLink size={17} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Editar aula">
                      <IconButton
                        className="cacoin-table-action-edit"
                        aria-label={`Editar ${lesson.title}`}
                        onClick={() => onEditLesson(lesson)}
                      >
                        <Pencil size={17} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Apagar aula">
                      <IconButton
                        className="cacoin-table-action-delete"
                        aria-label={`Apagar ${lesson.title}`}
                        onClick={() =>
                          setDeletingItem({ type: 'lesson', item: lesson })
                        }
                      >
                        <Trash2 size={17} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          }}
        />
      )}

      {view === 'materials' && (
        <StandardTable
          audit="OnlineMaterial"
          ariaLabel="Materiais das aulas online"
          columns={materialColumns}
          emptyMessage={
            error
              ? 'Não foi possível carregar os materiais.'
              : searchTerm.trim()
                ? 'Nenhum material corresponde à pesquisa.'
                : 'Ainda não existem materiais.'
          }
          loading={loading}
          rows={filteredMaterials}
          renderRow={(material, rowNumber) => (
            <TableRow key={material.id} hover>
              <TableCell>{rowNumber}</TableCell>
              <TableCell>{material.title}</TableCell>
              <TableCell>
                {lessons.find((lesson) => lesson.id === material.lessonId)
                  ?.title || '—'}
              </TableCell>
              <TableCell>
                {materialTypes.find((item) => item.value === material.type)
                  ?.label || material.type}
              </TableCell>
              <TableCell>
                {material.url ? (
                  <Tooltip title="Abrir material">
                    <IconButton
                      component="a"
                      href={material.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Abrir material ${material.title}`}
                    >
                      <Link2 size={17} />
                    </IconButton>
                  </Tooltip>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Apagar material">
                  <IconButton
                    className="cacoin-table-action-delete"
                    aria-label={`Apagar ${material.title}`}
                    onClick={() =>
                      setDeletingItem({ type: 'material', item: material })
                    }
                  >
                    <Trash2 size={17} />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          )}
        />
      )}

      {view === 'attendance' && (
        <StandardTable
          audit="OnlineAttendance"
          ariaLabel="Presenças das aulas online"
          columns={attendanceColumns}
          emptyMessage={
            error
              ? 'Não foi possível carregar as presenças.'
              : searchTerm.trim()
                ? 'Nenhuma presença corresponde à pesquisa.'
                : 'Ainda não existem presenças.'
          }
          loading={loading}
          rows={filteredAttendance}
          renderRow={(record, rowNumber) => {
            const student = students.find(
              (item) => item.id === record.studentId,
            );
            const presence = attendanceSettings?.attendanceStatuses.find(
              (item) => item.value === record.status,
            );
            const justification = attendanceSettings?.justificationStatuses.find(
              (item) => item.value === record.justificationStatus,
            );
            const payment = attendanceSettings?.paymentStatuses.find(
              (item) => item.value === record.paymentStatus,
            );
            return (
              <TableRow key={record.id} hover>
                <TableCell>{rowNumber}</TableCell>
                <TableCell>
                  {lessons.find((lesson) => lesson.id === record.lessonId)
                    ?.title || '—'}
                </TableCell>
                <TableCell>
                  {record.studentName ||
                    (student && getStudentName(student)) ||
                    '—'}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={record.status === 'PRESENT' ? 'success' : 'error'}
                    label={presence?.label || record.status || '—'}
                  />
                </TableCell>
                <TableCell>{justification?.label || '—'}</TableCell>
                <TableCell>
                  {payment ? (
                    <Stack>
                      <span>{payment.label}</span>
                      <span className="online-classes-secondary-value">
                        {formatMoney(record.justificationFee)}
                      </span>
                    </Stack>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>{formatDateTime(record.recordedAt)}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar presença">
                    <IconButton
                      className="cacoin-table-action-edit"
                      aria-label="Editar presença"
                      onClick={() => openAttendanceEdit(record)}
                    >
                      <Pencil size={17} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Apagar presença">
                    <IconButton
                      className="cacoin-table-action-delete"
                      aria-label="Apagar presença"
                      onClick={() =>
                        setDeletingItem({ type: 'attendance', item: record })
                      }
                    >
                      <Trash2 size={17} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          }}
        />
      )}

      <Dialog
        open={dialog === 'material'}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={saveMaterial}>
          <DialogTitle>Adicionar material</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                {error}
              </Alert>
            )}
            <div className="cacoin-course-form-grid online-classes-dialog-grid">
              <Autocomplete
                options={lessons}
                value={materialForm.lesson}
                getOptionLabel={(lesson) => lesson?.title || ''}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, lesson) =>
                  setMaterialForm({ ...materialForm, lesson })
                }
                noOptionsText="Sem aulas disponíveis"
                renderInput={(params) => (
                  <TextField {...params} required label="Aula" size="small" />
                )}
              />
              <TextField
                required
                label="Título"
                size="small"
                value={materialForm.title}
                onChange={(event) =>
                  setMaterialForm({
                    ...materialForm,
                    title: event.target.value,
                  })
                }
                slotProps={{ htmlInput: { maxLength: 180 } }}
              />
              <TextField
                select
                label="Tipo"
                size="small"
                value={materialForm.type}
                onChange={(event) =>
                  setMaterialForm({ ...materialForm, type: event.target.value })
                }
              >
                {materialTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                required
                label="URL"
                type="url"
                size="small"
                value={materialForm.url}
                onChange={(event) =>
                  setMaterialForm({ ...materialForm, url: event.target.value })
                }
                className="online-classes-grid-wide"
              />
              <RichTextField
                label="Descrição"
                value={materialForm.description}
                onChange={(description) =>
                  setMaterialForm((current) => ({ ...current, description }))
                }
              />
            </div>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialog} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'A guardar…' : 'Adicionar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={dialog === 'attendance'}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={saveAttendance}>
          <DialogTitle>Registar presença</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                {error}
              </Alert>
            )}
            <div className="cacoin-course-form-grid online-classes-dialog-grid">
              <Autocomplete
                options={lessons}
                value={attendanceForm.lesson}
                getOptionLabel={(lesson) => lesson?.title || ''}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, lesson) =>
                  setAttendanceForm({ ...attendanceForm, lesson })
                }
                noOptionsText="Sem aulas disponíveis"
                renderInput={(params) => (
                  <TextField {...params} required label="Aula" size="small" />
                )}
              />
              <Autocomplete
                freeSolo
                options={students}
                value={attendanceForm.student}
                getOptionLabel={(student) =>
                  typeof student === 'string'
                    ? student
                    : getStudentName(student)
                }
                isOptionEqualToValue={(option, value) =>
                  value != null &&
                  typeof value !== 'string' &&
                  option.id === value.id
                }
                onChange={(_, student) =>
                  setAttendanceForm({ ...attendanceForm, student })
                }
                onInputChange={(_, value, reason) => {
                  if (reason === 'input') {
                    setAttendanceForm({ ...attendanceForm, student: value });
                  }
                }}
                noOptionsText="Sem estudantes disponíveis"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Estudante"
                    size="small"
                  />
                )}
              />
              <TextField
                select
                label="Estado"
                size="small"
                value={attendanceForm.status}
                onChange={(event) =>
                  setAttendanceForm({
                    ...attendanceForm,
                    status: event.target.value,
                  })
                }
              >
                {(attendanceSettings?.attendanceStatuses || []).map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Observações"
                multiline
                minRows={2}
                size="small"
                value={attendanceForm.notes}
                onChange={(event) =>
                  setAttendanceForm({
                    ...attendanceForm,
                    notes: event.target.value,
                  })
                }
                className="online-classes-grid-wide"
              />
            </div>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialog} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'A guardar…' : 'Registar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={dialog === 'attendance-edit'}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={saveAttendanceEdit}>
          <DialogTitle>Actualizar presença</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                {error}
              </Alert>
            )}
            {attendanceEditForm && (
              <div className="cacoin-course-form-grid online-classes-dialog-grid">
                <TextField
                  select
                  label="Presença"
                  size="small"
                  value={attendanceEditForm.status}
                  onChange={(event) =>
                    setAttendanceEditForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  {(attendanceSettings?.attendanceStatuses || []).map(
                    (status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ),
                  )}
                </TextField>
                <TextField
                  select
                  label="Justificação"
                  size="small"
                  value={attendanceEditForm.justificationStatus}
                  disabled={attendanceEditForm.status !== 'ABSENT'}
                  onChange={(event) =>
                    setAttendanceEditForm((current) => ({
                      ...current,
                      justificationStatus: event.target.value,
                    }))
                  }
                >
                  {(attendanceSettings?.justificationStatuses || []).map(
                    (status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ),
                  )}
                </TextField>
                <TextField
                  select
                  label="Pagamento"
                  size="small"
                  value={attendanceEditForm.paymentStatus}
                  disabled={attendanceEditForm.status !== 'ABSENT'}
                  onChange={(event) =>
                    setAttendanceEditForm((current) => ({
                      ...current,
                      paymentStatus: event.target.value,
                    }))
                  }
                >
                  {(attendanceSettings?.paymentStatuses || []).map(
                    (status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ),
                  )}
                </TextField>
                <TextField
                  label="Observações"
                  multiline
                  minRows={2}
                  size="small"
                  value={attendanceEditForm.notes}
                  onChange={(event) =>
                    setAttendanceEditForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  className="online-classes-grid-wide"
                />
              </div>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialog} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'A guardar…' : 'Guardar alterações'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deletingItem)}
        onClose={() => !saving && setDeletingItem(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {deletingItem?.type === 'lesson'
            ? 'Apagar aula'
            : deletingItem?.type === 'material'
              ? 'Apagar material'
              : 'Apagar presença'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
              {error}
            </Alert>
          )}
          Confirmar a eliminação de “{deletingLabel}”?
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletingItem(null)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={deleteItem}
            disabled={saving}
          >
            {saving ? 'A eliminar…' : 'Apagar'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
