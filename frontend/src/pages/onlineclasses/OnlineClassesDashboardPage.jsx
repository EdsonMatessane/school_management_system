import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  MenuItem,
  TableCell,
  TableRow,
  TextField,
} from '@mui/material';
import { CalendarDays, Check, Clock3, Video } from 'lucide-react';
import StandardTable from '../../components/StandardTable';
import { api, getCourses } from '../../services/api';
import { displayText } from '../../utils/displayText';
import { formatDateTime } from '../../utils/date';
import './online-classes.css';

const emptyFilters = {
  courseId: '',
  categoryId: '',
  levelId: '',
  modalityId: '',
};

const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.message ||
  'Não foi possível carregar o Dashboard.';

const columns = [
  { key: 'title', label: 'Aula' },
  { key: 'startAt', label: 'Data e hora' },
  { key: 'platform', label: 'Plataforma' },
  { key: 'status', label: 'Estado' },
];

export default function OnlineClassesDashboardPage() {
  const [lessons, setLessons] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());

  const loadLessons = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [response, loadedCourses] = await Promise.all([
        api.get('/online-classes'),
        getCourses(),
      ]);
      setLessons(response.data);
      setCourses(loadedCourses.filter((course) => course.active));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedCourse = courses.find(
    (course) => String(course.id) === filters.courseId,
  );
  const relatedOptions = useMemo(
    () =>
      selectedCourse
        ? {
            categories: [
              {
                id: selectedCourse.categoryId,
                name: selectedCourse.categoryName,
              },
            ],
            levels: [
              { id: selectedCourse.levelId, name: selectedCourse.levelName },
            ],
            modalities: [
              {
                id: selectedCourse.modalityId,
                name: selectedCourse.modalityName,
              },
            ],
          }
        : { categories: [], levels: [], modalities: [] },
    [selectedCourse],
  );
  const isReady = Object.values(filters).every(Boolean);
  const changeFilter = (key) => (event) => {
    const value = event.target.value;
    if (key === 'courseId') {
      const course = courses.find((item) => String(item.id) === value);
      setFilters({
        ...emptyFilters,
        courseId: value,
        categoryId: course ? String(course.categoryId) : '',
      });
      return;
    }
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const filteredLessons = useMemo(() => {
    if (!isReady) return [];
    return lessons.filter((lesson) => {
      const course = courses.find(
        (item) => String(item.id) === filters.courseId,
      );
      return (
        String(lesson.courseId) === filters.courseId &&
        String(course?.categoryId) === filters.categoryId &&
        String(course?.levelId) === filters.levelId &&
        String(course?.modalityId) === filters.modalityId
      );
    });
  }, [courses, filters, isReady, lessons]);

  const now = currentTime;
  const getStatus = (lesson) =>
    now < new Date(lesson.startAt).getTime()
      ? { label: 'Agendada', className: 'scheduled' }
      : now < new Date(lesson.endAt).getTime()
        ? { label: 'Em direto', className: 'live' }
        : { label: 'Concluída', className: 'completed' };
  const upcomingLessons = [...filteredLessons]
    .filter((lesson) => new Date(lesson.startAt).getTime() > now)
    .sort((left, right) => new Date(left.startAt) - new Date(right.startAt));
  const ongoingLessons = filteredLessons.filter(
    (lesson) => getStatus(lesson).className === 'live',
  );
  const completedLessons = filteredLessons.filter(
    (lesson) => getStatus(lesson).className === 'completed',
  );
  const scheduledLessons = filteredLessons.filter(
    (lesson) => getStatus(lesson).className === 'scheduled',
  );
  const statistics = [
    {
      label: 'Total de aulas',
      value: filteredLessons.length,
      icon: CalendarDays,
    },
    {
      label: 'Agendadas',
      value: scheduledLessons.length,
      icon: Clock3,
    },
    {
      label: 'Em direto',
      value: ongoingLessons.length,
      icon: Video,
    },
    {
      label: 'Concluídas',
      value: completedLessons.length,
      icon: Check,
    },
  ];

  return (
    <section className="cacoin-course-page cacoin-tasks-page online-classes-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Aulas Online</p>
          <h1>Dashboard</h1>
        </div>
      </header>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

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
            value={filters.courseId}
            onChange={changeFilter('courseId')}
          >
            {courses.map((course) => (
              <MenuItem key={course.id} value={String(course.id)}>
                {displayText(course.name)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Categoria"
            value={filters.categoryId}
            disabled={!selectedCourse}
            onChange={changeFilter('categoryId')}
          >
            {relatedOptions.categories.map((category) => (
              <MenuItem key={category.id} value={String(category.id)}>
                {displayText(category.name)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Nível"
            value={filters.levelId}
            disabled={!selectedCourse}
            onChange={changeFilter('levelId')}
          >
            {relatedOptions.levels.map((level) => (
              <MenuItem key={level.id} value={String(level.id)}>
                {displayText(level.name)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Modalidade"
            value={filters.modalityId}
            disabled={!selectedCourse}
            onChange={changeFilter('modalityId')}
          >
            {relatedOptions.modalities.map((modality) => (
              <MenuItem key={modality.id} value={String(modality.id)}>
                {displayText(modality.name)}
              </MenuItem>
            ))}
          </TextField>
        </div>
      </section>

      <div className="cacoin-task-dashboard-cards online-classes-statistics">
        {statistics.map(({ label, value, icon: Icon }) => (
          <article className="cacoin-task-dashboard-card" key={label}>
            <span className="cacoin-task-dashboard-card-icon">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="cacoin-task-dashboard-card-label">{label}</span>
            <strong>{loading || !isReady ? '—' : value}</strong>
          </article>
        ))}
      </div>

      <section className="online-classes-dashboard-section">
        <header className="online-classes-section-heading">
          <h2>Próximas aulas</h2>
        </header>
        <StandardTable
          audit="OnlineLesson"
          ariaLabel="Próximas aulas online"
          columns={columns}
          emptyMessage={
            error
              ? 'Não foi possível carregar as aulas.'
              : !isReady
                ? 'Selecione curso, categoria, nível e modalidade.'
                : 'Não existem próximas aulas.'
          }
          loading={loading}
          rows={upcomingLessons}
          renderRow={(lesson, rowNumber) => (
            <TableRow key={lesson.id} hover>
              <TableCell>{rowNumber}</TableCell>
              <TableCell>{lesson.title}</TableCell>
              <TableCell>{formatDateTime(lesson.startAt)}</TableCell>
              <TableCell>{lesson.platform || '—'}</TableCell>
              <TableCell>
                <span
                  className={`cacoin-status-badge online-class-status-badge ${getStatus(lesson).className}`}
                >
                  {getStatus(lesson).label}
                </span>
              </TableCell>
            </TableRow>
          )}
        />
      </section>
    </section>
  );
}
