import { systemDate } from '../../utils/systemDate';
import { isTeacherMode } from '../../utils/teacherMode';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from '@mui/material';
import { CalendarDays, ClipboardList, Clock3, LogOut, UsersRound } from 'lucide-react';
import { getLeaveRequests } from '../../services/api';
import useStatuses from '../../utils/useStatuses';

const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.'
);
const currentMonth = () => systemDate().toISOString().slice(0, 7);

export default function LeaveDashboardPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { statuses, error: statusError } = useStatuses('LEAVES');

  useEffect(() => {
    let mounted = true;
    getLeaveRequests()
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

  const cards = useMemo(() => {
    const month = currentMonth();
    const approvedDays = requests
      .filter((item) => item.status === 'APPROVED')
      .reduce((total, item) => total + item.daysCalculated, 0);
    return [
      { label: 'Pedidos', value: requests.length, icon: ClipboardList, detail: 'Total de pedidos de saída' },
      ...statuses.map((status) => ({
        label: status.label,
        value: requests.filter((item) => item.status === status.code).length,
        icon: status.code === 'PENDING_APPROVAL' ? Clock3 : LogOut,
        detail: 'Pedidos neste estado',
      })),
      {
        label: 'Pedidos neste mês',
        value: requests.filter((item) => item.requestDate.startsWith(month)).length,
        icon: CalendarDays,
        detail: 'Pedidos feitos no mês actual',
      },
      { label: 'Dias aprovados', value: approvedDays, icon: CalendarDays, detail: 'Soma dos dias aprovados' },
      ...(isTeacherMode() ? [] : [{
        label: 'Funcionários',
        value: new Set(requests.map((item) => item.staffId)).size,
        icon: UsersRound,
        detail: 'Com pelo menos um pedido',
      }]),
    ];
  }, [requests, statuses]);

  return (
    <section className="cacoin-course-page cacoin-tasks-page cacoin-task-dashboard cacoin-tests-dashboard">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Funcionários</p>
          <h1>Dashboard</h1>
        </div>
      </header>
      {(error || statusError) && <Alert severity="error" sx={{ mb: 2 }}>{error || statusError}</Alert>}
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
