import { systemDate } from '../../utils/systemDate';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from '@mui/material';
import { CalendarDays, CircleCheck, ClipboardList, Clock3, UsersRound } from 'lucide-react';
import { getStudentRequests } from '../../services/api';
import useStatuses from '../../utils/useStatuses';
import RequestFilters from './RequestFilters';
import { applyFilters, emptyFilters, errorMessage, requestStatusCodes } from './requestUtils';

const currentMonth = () => systemDate().toISOString().slice(0, 7);

export default function StudentRequestDashboardPage() {
  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { statuses, error: statusError } = useStatuses('REQUESTS');

  useEffect(() => {
    let mounted = true;
    getStudentRequests()
      .then((loaded) => {
        if (mounted) setRequests(loaded);
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

  const filtered = useMemo(() => applyFilters(requests, filters), [requests, filters]);
  const cards = useMemo(() => {
    const month = currentMonth();
    return [
      { label: 'Pedidos', value: filtered.length, icon: ClipboardList, detail: 'Total de pedidos dos estudantes' },
      ...statuses.map((status) => ({
        label: status.label,
        value: filtered.filter((item) => item.status === status.code).length,
        icon: status.code === requestStatusCodes.pending ? Clock3 : CircleCheck,
        detail: 'Pedidos neste estado',
      })),
      {
        label: 'Pedidos neste mês',
        value: filtered.filter((item) => item.requestDate.startsWith(month)).length,
        icon: CalendarDays,
        detail: 'Pedidos feitos no mês actual',
      },
      {
        label: 'Estudantes',
        value: new Set(filtered.map((item) => item.studentId)).size,
        icon: UsersRound,
        detail: 'Com pelo menos um pedido',
      },
    ];
  }, [filtered, statuses]);

  return (
    <section className="cacoin-course-page cacoin-tasks-page cacoin-task-dashboard cacoin-tests-dashboard">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>Dashboard</h1>
        </div>
      </header>
      {(error || statusError) && <Alert severity="error" sx={{ mb: 2 }}>{error || statusError}</Alert>}
      <RequestFilters rows={requests} filters={filters} onChange={setFilters} />
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
    </section>
  );
}
