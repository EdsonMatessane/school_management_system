import { changeCourseFilters, relatedCourseOptions } from '../../utils/courseFilters';
import { useEffect, useMemo, useState } from 'react';
import { Alert, MenuItem, Tab, Tabs, TextField } from '@mui/material';
import {
  CalendarClock,
  CircleCheck,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  GraduationCap,
  UserCheck,
  UsersRound,
  Wallet,
} from 'lucide-react';
import {
  getCourses,
  getGraduates,
  getGraduationRegistrations,
  getGraduationSettings,
} from '../../services/api';
import Money from '../../components/Money';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { errorMessage } from './graduationUtils';

const emptyFilters = { courseId: '', categoryId: '', levelId: '', modalityId: '' };

export default function GraduationDashboardPage() {
  const [courses, setCourses] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [graduates, setGraduates] = useState([]);
  const [settings, setSettings] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getCourses(),
      getGraduationRegistrations(),
      getGraduates(),
      getGraduationSettings(),
    ])
      .then(([loadedCourses, loadedRegistrations, loadedGraduates, loadedSettings]) => {
        if (!mounted) return;
        setCourses(loadedCourses.filter((course) => course.active));
        setRegistrations(loadedRegistrations);
        setGraduates(loadedGraduates);
        setSettings(loadedSettings);
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
  const matchesFilters = (item) => (
    String(item.courseId) === filters.courseId
    && String(item.categoryId) === filters.categoryId
    && String(item.levelId) === filters.levelId
    && String(item.modalityId) === filters.modalityId
  );
  const filteredRegistrations = isReady ? registrations.filter(matchesFilters) : [];
  const filteredGraduates = isReady ? graduates.filter(matchesFilters) : [];
  const statistics = useMemo(() => filteredRegistrations.reduce((total, item) => ({
    count: total.count + 1,
    amount: total.amount + Number(item.amount),
    paid: total.paid + (item.paid ? Number(item.amount) : 0),
    requirements: total.requirements + Number(item.requirementsAmount),
    guests: total.guests + item.guests,
    paymentPending: total.paymentPending + (item.paid ? 0 : 1),
    paidCount: total.paidCount + (item.paid ? 1 : 0),
    enrolled: total.enrolled + (item.paid && !item.graduated ? 1 : 0),
    graduated: total.graduated + (item.graduated ? 1 : 0),
  }), {
    count: 0,
    amount: 0,
    paid: 0,
    requirements: 0,
    guests: 0,
    paymentPending: 0,
    paidCount: 0,
    enrolled: 0,
    graduated: 0,
  }), [filteredRegistrations]);
  const ceremonyDay = settings?.ceremonyDate
    ? toDisplayDate(settings.ceremonyDate)
    : '—';
  const ceremonyTime = settings?.ceremonyStartTime && settings?.ceremonyEndTime
    ? `${String(settings.ceremonyStartTime).slice(0, 5)} – ${String(settings.ceremonyEndTime).slice(0, 5)}`
    : 'Dia ainda não definido';
  const withCeremony = filteredGraduates.filter((item) => item.status === 'GRADUATED').length;

  const graduationCards = [
    { label: 'Inscritos', value: statistics.count, icon: ClipboardList, detail: 'Inscrições na graduação' },
    { label: 'Pagamento pendente', value: statistics.paymentPending, icon: Clock3, detail: 'Aguardam pagamento' },
    { label: 'Pagos', value: statistics.paidCount, icon: CircleCheck, detail: 'Inscrições pagas' },
    { label: 'Inscritos por graduar', value: statistics.enrolled, icon: UserCheck, detail: 'Pagos e ainda não graduados' },
    { label: 'Graduados', value: statistics.graduated, icon: GraduationCap, detail: 'Participaram na cerimónia' },
    { label: 'Convidados', value: statistics.guests, icon: UsersRound, detail: 'Total de convidados' },
    { label: 'Valor total', value: <Money value={statistics.amount} />, icon: CircleDollarSign, detail: 'Total das inscrições' },
    { label: 'Total pago', value: <Money value={statistics.paid} />, icon: Wallet, detail: 'Pagamentos registados' },
    { label: 'Saldo pendente', value: <Money value={statistics.amount - statistics.paid} />, icon: ClipboardList, detail: 'Por liquidar' },
    { label: 'Requisitos', value: <Money value={statistics.requirements} />, icon: CircleDollarSign, detail: 'Incluídos nas inscrições' },
    { label: 'Dia da graduação', value: ceremonyDay, icon: CalendarClock, detail: ceremonyTime },
  ];
  const graduatesCards = [
    { label: 'Formados', value: filteredGraduates.length, icon: GraduationCap, detail: 'Todos os estudantes formados' },
    { label: 'Graduados', value: withCeremony, icon: UserCheck, detail: 'Participaram na cerimónia' },
    { label: 'Sem cerimónia', value: filteredGraduates.length - withCeremony, icon: CircleCheck, detail: 'Formados fora da graduação' },
    { label: 'Inscritos por graduar', value: statistics.enrolled, icon: ClipboardList, detail: 'Pagos e ainda não graduados' },
  ];
  const cards = tab === 0 ? graduationCards : graduatesCards;

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
          <GraduationCap size={20} aria-hidden="true" />
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
              <MenuItem key={course.id} value={String(course.id)}>{displayText(course.name)}</MenuItem>
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
              <MenuItem key={category.id} value={String(category.id)}>{displayText(category.name)}</MenuItem>
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
              <MenuItem key={level.id} value={String(level.id)}>{displayText(level.name)}</MenuItem>
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
              <MenuItem key={modality.id} value={String(modality.id)}>{displayText(modality.name)}</MenuItem>
            ))}
          </TextField>
        </div>
      </section>
      {isReady ? (
        <>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            sx={{ mb: 2 }}
            aria-label="Vistas do Dashboard"
          >
            <Tab label="Graduação" />
            <Tab label="Formados" />
          </Tabs>
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
        </>
      ) : (
        <section className="cacoin-task-dashboard-panel cacoin-tests-dashboard-empty">
          <GraduationCap size={26} aria-hidden="true" />
          <strong>Selecione os filtros para consultar as estatísticas</strong>
        </section>
      )}
    </section>
  );
}
