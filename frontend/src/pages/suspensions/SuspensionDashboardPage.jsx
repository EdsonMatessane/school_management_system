import { changeCourseFilters, relatedCourseOptions } from '../../utils/courseFilters';
import { useEffect, useMemo, useState } from 'react';
import { Alert, MenuItem, TextField } from '@mui/material';
import {
  Ban,
  CircleCheck,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Wallet,
} from 'lucide-react';
import { getCourses, getSuspensionRegistrations } from '../../services/api';
import Money from '../../components/Money';
import { displayText } from '../../utils/displayText';
import { errorMessage } from './suspensionUtils';

const emptyFilters = { courseId: '', categoryId: '', levelId: '', modalityId: '' };

export default function SuspensionDashboardPage() {
  const [courses, setCourses] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([getCourses(), getSuspensionRegistrations()])
      .then(([loadedCourses, loadedRegistrations]) => {
        if (!mounted) return;
        setCourses(loadedCourses.filter((course) => course.active));
        setRegistrations(loadedRegistrations);
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
  const filtered = isReady
    ? registrations.filter((item) => (
      String(item.courseId) === filters.courseId
      && String(item.categoryId) === filters.categoryId
      && String(item.levelId) === filters.levelId
      && String(item.modalityId) === filters.modalityId
    ))
    : [];
  const statistics = filtered.reduce((total, item) => ({
    count: total.count + 1,
    amount: total.amount + Number(item.amount),
    paid: total.paid + (item.paid ? Number(item.amount) : 0),
    paymentPending: total.paymentPending + (item.paid ? 0 : 1),
    paidCount: total.paidCount + (item.paid && !item.suspended ? 1 : 0),
    suspended: total.suspended + (item.suspended ? 1 : 0),
  }), { count: 0, amount: 0, paid: 0, paymentPending: 0, paidCount: 0, suspended: 0 });
  const cards = [
    { label: 'Registados', value: statistics.count, icon: ClipboardList, detail: 'Trancamentos registados' },
    { label: 'Pagamento pendente', value: statistics.paymentPending, icon: Clock3, detail: 'Aguardam pagamento' },
    { label: 'Pagos', value: statistics.paidCount, icon: CircleCheck, detail: 'Pagos por trancar' },
    { label: 'Trancados', value: statistics.suspended, icon: Ban, detail: 'Trancamentos concluídos' },
    { label: 'Valor total', value: <Money value={statistics.amount} />, icon: CircleDollarSign, detail: 'Total dos trancamentos' },
    { label: 'Total pago', value: <Money value={statistics.paid} />, icon: Wallet, detail: 'Pagamentos registados' },
    { label: 'Saldo pendente', value: <Money value={statistics.amount - statistics.paid} />, icon: ClipboardList, detail: 'Por liquidar' },
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
          <Ban size={20} aria-hidden="true" />
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
          <Ban size={26} aria-hidden="true" />
          <strong>Selecione os filtros para consultar as estatísticas</strong>
        </section>
      )}
    </section>
  );
}
