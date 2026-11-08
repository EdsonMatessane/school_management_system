import { changeCourseFilters, relatedCourseOptions } from '../../utils/courseFilters';
import { useEffect, useMemo, useState } from 'react';
import { Alert, MenuItem, TextField } from '@mui/material';
import {
  Bell,
  CalendarDays,
  CircleCheck,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  UserCheck,
  UserX,
  UsersRound,
  Wallet,
} from 'lucide-react';
import {
  getAttendanceExcesses,
  getAttendanceRecords,
  getCourses,
} from '../../services/api';
import Money from '../../components/Money';
import { displayText } from '../../utils/displayText';
import { errorMessage } from './attendanceUtils';

const emptyFilters = { courseId: '', categoryId: '', levelId: '', modalityId: '' };

export default function AttendanceDashboardPage() {
  const [courses, setCourses] = useState([]);
  const [records, setRecords] = useState([]);
  const [excesses, setExcesses] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([getCourses(), getAttendanceRecords(), getAttendanceExcesses()])
      .then(([loadedCourses, loadedRecords, loadedExcesses]) => {
        if (!mounted) return;
        setCourses(loadedCourses.filter((course) => course.active));
        setRecords(loadedRecords);
        setExcesses(loadedExcesses);
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
  }, []);

  const selectedCourse = courses.find((course) => String(course.id) === filters.courseId);
  const relatedOptions = useMemo(
    () => relatedCourseOptions(courses, selectedCourse),
    [courses, selectedCourse],
  );
  const isReady = Object.values(filters).every(Boolean);
  const matches = (item) => (
    String(item.courseId) === filters.courseId
    && String(item.categoryId) === filters.categoryId
    && String(item.levelId) === filters.levelId
    && String(item.modalityId) === filters.modalityId
  );
  const filteredRecords = isReady ? records.filter(matches) : [];
  const filteredExcesses = isReady ? excesses.filter(matches) : [];
  const statistics = filteredRecords.reduce((total, item) => {
    const absent = item.status === 'ABSENT';
    const fee = Number(item.justificationFee || 0);
    return {
      count: total.count + 1,
      present: total.present + (absent ? 0 : 1),
      absent: total.absent + (absent ? 1 : 0),
      justified: total.justified + (item.justification === 'JUSTIFIED' ? 1 : 0),
      notJustified: total.notJustified + (absent && item.justification === 'NONE' ? 1 : 0),
      paymentPending: total.paymentPending + (item.justification === 'PAYMENT_PENDING' ? 1 : 0),
      paid: total.paid + (item.justification === 'JUSTIFIED' ? fee : 0),
      pending: total.pending + (item.justification === 'PAYMENT_PENDING' ? fee : 0),
    };
  }, {
    count: 0,
    present: 0,
    absent: 0,
    justified: 0,
    notJustified: 0,
    paymentPending: 0,
    paid: 0,
    pending: 0,
  });
  const attendanceRate = statistics.count
    ? `${((statistics.present / statistics.count) * 100).toFixed(1)}%`
    : '—';
  const cards = [
    { label: 'Registos', value: statistics.count, icon: ClipboardList, detail: 'Presenças e faltas registadas' },
    { label: 'Presentes', value: statistics.present, icon: UserCheck, detail: 'Presenças registadas' },
    { label: 'Ausentes', value: statistics.absent, icon: UserX, detail: 'Faltas registadas' },
    { label: 'Taxa de presença', value: attendanceRate, icon: CalendarDays, detail: 'Presentes sobre o total' },
    { label: 'Não justificadas', value: statistics.notJustified, icon: UserX, detail: 'Faltas sem justificação' },
    { label: 'Pagamento pendente', value: statistics.paymentPending, icon: Clock3, detail: 'Justificações por pagar' },
    { label: 'Justificadas', value: statistics.justified, icon: CircleCheck, detail: 'Justificações pagas' },
    { label: 'Total pago', value: <Money value={statistics.paid} />, icon: Wallet, detail: 'Taxas de justificação pagas' },
    { label: 'Saldo pendente', value: <Money value={statistics.pending} />, icon: CircleDollarSign, detail: 'Taxas por liquidar' },
    { label: 'Excessos', value: filteredExcesses.length, icon: UsersRound, detail: 'Estudantes acima do limite' },
    { label: 'Notificados', value: filteredExcesses.filter((item) => item.notified).length, icon: Bell, detail: 'Notificações automáticas' },
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
          <CalendarDays size={20} aria-hidden="true" />
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
          <CalendarDays size={26} aria-hidden="true" />
          <strong>Selecione os filtros para consultar as estatísticas</strong>
        </section>
      )}
    </section>
  );
}
