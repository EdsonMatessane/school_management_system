import { changeCourseFilters, relatedCourseOptions } from '../../utils/courseFilters';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  CircleCheck,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Wallet,
  UsersRound,
} from 'lucide-react';
import { getCourses, getTestRegistrations } from '../../services/api';
import Money from '../../components/Money';
import { displayText } from '../../utils/displayText';

const emptyFilters = { courseId: '', categoryId: '', levelId: '', modalityId: '' };
const testTypes = [
  { id: 'NORMAL', label: 'Teste normal' },
  { id: 'RECOVERY', label: 'Teste de recuperação' },
  { id: 'SPECIAL', label: 'Teste especial' },
];
const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível carregar o Dashboard.';

export default function TestDashboardPage() {
  const [courses, setCourses] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([getCourses(), getTestRegistrations()])
      .then(([loadedCourses, loadedRegistrations]) => {
        if (!mounted) return;
        setCourses(loadedCourses.filter((course) => course.active));
        setRegistrations(loadedRegistrations);
      })
      .catch((loadError) => {
        if (mounted) setError(getErrorMessage(loadError));
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
  const filteredRegistrations = useMemo(() => {
    if (!isReady) return [];
    return registrations.filter((registration) => (
      String(registration.courseId) === filters.courseId
      && String(registration.categoryId) === filters.categoryId
      && String(registration.levelId) === filters.levelId
      && String(registration.modalityId) === filters.modalityId
    ));
  }, [filters, isReady, registrations]);
  const statistics = useMemo(() => filteredRegistrations.reduce((total, registration) => ({
    count: total.count + 1,
    amount: total.amount + Number(registration.amount),
    paid: total.paid + Number(registration.paidAmount),
    balance: total.balance + Number(registration.balance),
    paidCount: total.paidCount + (registration.status === 'PAID' ? 1 : 0),
    pendingCount: total.pendingCount + (registration.status === 'PENDING' ? 1 : 0),
  }), {
    count: 0,
    amount: 0,
    paid: 0,
    balance: 0,
    paidCount: 0,
    pendingCount: 0,
  }), [filteredRegistrations]);
  const typeBreakdown = useMemo(() => testTypes.map((type) => {
    const typeRegistrations = filteredRegistrations
      .filter((registration) => registration.testType === type.id);
    return typeRegistrations.reduce((total, registration) => ({
      ...total,
      count: total.count + 1,
      amount: total.amount + Number(registration.amount),
      paid: total.paid + Number(registration.paidAmount),
      balance: total.balance + Number(registration.balance),
    }), { ...type, count: 0, amount: 0, paid: 0, balance: 0 });
  }), [filteredRegistrations]);

  const changeFilter = (key) => (event) => {
    const value = event.target.value;
    setFilters((current) => changeCourseFilters(courses, current, key, value));
  };
  const cards = [
    { label: 'Inscrições', value: statistics.count, icon: ClipboardList, detail: 'Todos os tipos' },
    { label: 'Pagas', value: statistics.paidCount, icon: CircleCheck, detail: 'Inscrições liquidadas' },
    { label: 'Pendentes', value: statistics.pendingCount, icon: Clock3, detail: 'Aguardam pagamento' },
    { label: 'Valor total', value: <Money value={statistics.amount} />, icon: CircleDollarSign, detail: 'Total inscrito' },
    { label: 'Total pago', value: <Money value={statistics.paid} />, icon: Wallet, detail: 'Pagamentos registados' },
    { label: 'Saldo pendente', value: <Money value={statistics.balance} />, icon: UsersRound, detail: 'Por liquidar' },
  ];

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
            <p>Escolha o curso e confirme a categoria, o nível e a modalidade.</p>
          </div>
          <ClipboardList size={20} aria-hidden="true" />
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
          <section className="cacoin-task-dashboard-panel cacoin-tests-dashboard-summary">
            <header>
              <div>
                <h2>Resumo por tipo de teste</h2>
                <p>Inscrições e valores associados ao curso selecionado.</p>
              </div>
              <CircleDollarSign size={20} aria-hidden="true" />
            </header>
            <div className="cacoin-tests-dashboard-types">
              {typeBreakdown.map((item) => (
                <article key={item.id} className="cacoin-tests-dashboard-type">
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.count} inscrito(s)</small>
                  </div>
                  <dl>
                    <div><dt>Valor total</dt><dd><Money value={item.amount} /></dd></div>
                    <div><dt>Total pago</dt><dd><Money value={item.paid} /></dd></div>
                    <div><dt>Saldo pendente</dt><dd><Money value={item.balance} /></dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="cacoin-task-dashboard-panel cacoin-tests-dashboard-empty">
          <ClipboardList size={26} aria-hidden="true" />
          <strong>Selecione os filtros para consultar as estatísticas</strong>
          <p>O Dashboard apresenta inscrições, pagamentos e saldos para a combinação selecionada.</p>
        </section>
      )}
    </section>
  );
}
