import { changeCourseFilters, relatedCourseOptions } from '../../utils/courseFilters';
import { systemDate } from '../../utils/systemDate';
import { useEffect, useMemo, useState } from 'react';
import { Alert, MenuItem, TextField } from '@mui/material';
import {
  CircleCheck,
  ClipboardList,
  Clock3,
  FileText,
  GraduationCap,
  TrendingUp,
  UserX,
  UsersRound,
} from 'lucide-react';
import { getCourses, getPautaYears, getPautas, getStudents } from '../../services/api';
import { displayText } from '../../utils/displayText';
import { errorMessage } from './pautaUtils';

const emptyFilters = { courseId: '', categoryId: '', levelId: '', modalityId: '' };

export default function PautaDashboardPage() {
  const currentYear = systemDate().getFullYear();
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [years, setYears] = useState([currentYear]);
  const [year, setYear] = useState(currentYear);
  const [pautas, setPautas] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([getCourses(), getStudents(), getPautaYears()])
      .then(([loadedCourses, loadedStudents, loadedYears]) => {
        if (!mounted) return;
        setCourses(loadedCourses.filter((course) => course.active));
        setStudents(loadedStudents.filter((student) => student.active));
        setYears(loadedYears);
      })
      .catch((loadError) => {
        if (mounted) setError(errorMessage(loadError));
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getPautas({ year })
      .then((loaded) => {
        if (mounted) setPautas(loaded);
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
  }, [year]);

  const selectedCourse = courses.find((course) => String(course.id) === filters.courseId);
  const relatedOptions = useMemo(
    () => relatedCourseOptions(courses, selectedCourse),
    [courses, selectedCourse],
  );
  const isReady = Object.values(filters).every(Boolean);
  const filtered = isReady
    ? pautas.filter((item) => (
      String(item.courseId) === filters.courseId
      && String(item.categoryId) === filters.categoryId
      && String(item.levelId) === filters.levelId
      && String(item.modalityId) === filters.modalityId
    ))
    : [];
  const classStudents = isReady
    ? students.filter((student) => String(student.courseId) === filters.courseId)
    : [];
  const approved = filtered.filter((item) => item.result === 'APPROVED').length;
  const rejected = filtered.length - approved;
  const averages = filtered.map((item) => item.finalAverage);
  const classAverage = averages.length
    ? (averages.reduce((total, value) => total + value, 0) / averages.length).toFixed(1)
    : '—';
  const cards = [
    { label: 'Estudantes', value: classStudents.length, icon: UsersRound, detail: 'Activos no curso' },
    { label: 'Pautas lançadas', value: filtered.length, icon: FileText, detail: `Ano ${year}` },
    { label: 'Pendentes', value: Math.max(0, classStudents.length - filtered.length), icon: Clock3, detail: 'Sem pauta lançada' },
    { label: 'Aprovados', value: approved, icon: CircleCheck, detail: 'Média final de 10 ou mais' },
    { label: 'Reprovados', value: rejected, icon: UserX, detail: 'Média final abaixo de 10' },
    { label: 'Taxa de aprovação', value: filtered.length ? `${((approved / filtered.length) * 100).toFixed(1)}%` : '—', icon: GraduationCap, detail: 'Aprovados sobre lançados' },
    { label: 'Média da turma', value: classAverage, icon: TrendingUp, detail: 'Média das médias finais' },
    { label: 'Maior média', value: averages.length ? Math.max(...averages) : '—', icon: ClipboardList, detail: 'Melhor média final' },
    { label: 'Menor média', value: averages.length ? Math.min(...averages) : '—', icon: ClipboardList, detail: 'Pior média final' },
  ];
  const changeFilter = (key) => (event) => {
    const value = event.target.value;
    setFilters((current) => changeCourseFilters(courses, current, key, value));
  };

  return (
    <section className="cacoin-course-page cacoin-tasks-page cacoin-task-dashboard cacoin-tests-dashboard">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>Dashboard</h1>
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <section className="cacoin-task-dashboard-panel cacoin-tests-dashboard-filters">
        <header>
          <div>
            <h2>Filtros do relatório</h2>
          </div>
          <FileText size={20} aria-hidden="true" />
        </header>
        <div className="cacoin-tests-dashboard-filter-grid">
          <TextField select size="small" label="Curso" value={filters.courseId} onChange={changeFilter('courseId')}>
            {courses.map((course) => (
              <MenuItem key={course.id} value={String(course.id)}>{displayText(course.name)}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Categoria" value={filters.categoryId} disabled={!selectedCourse} onChange={changeFilter('categoryId')}>
            {relatedOptions.categories.map((category) => (
              <MenuItem key={category.id} value={String(category.id)}>{displayText(category.name)}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Nível" value={filters.levelId} disabled={!selectedCourse} onChange={changeFilter('levelId')}>
            {relatedOptions.levels.map((level) => (
              <MenuItem key={level.id} value={String(level.id)}>{displayText(level.name)}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Modalidade" value={filters.modalityId} disabled={!selectedCourse} onChange={changeFilter('modalityId')}>
            {relatedOptions.modalities.map((modality) => (
              <MenuItem key={modality.id} value={String(modality.id)}>{displayText(modality.name)}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Ano" value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {years.map((item) => (
              <MenuItem key={item} value={item}>{item}</MenuItem>
            ))}
          </TextField>
        </div>
      </section>
      {isReady ? (
        <div className="cacoin-task-dashboard-cards">
          {cards.map(({ label, value, icon: Icon, detail }) => (
            <article className="cacoin-task-dashboard-card" key={label}>
              <span className="cacoin-task-dashboard-card-icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="cacoin-task-dashboard-card-label">{label}</span>
              <strong>{loading ? '—' : value}</strong>
              <small>{detail}</small>
            </article>
          ))}
        </div>
      ) : (
        <section className="cacoin-task-dashboard-panel cacoin-tests-dashboard-empty">
          <FileText size={26} aria-hidden="true" />
          <strong>Selecione os filtros para consultar as estatísticas</strong>
        </section>
      )}
    </section>
  );
}
