import { useEffect, useMemo, useState } from 'react';
import { isTeacherMode } from '../../utils/teacherMode';
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
import Money from '../../components/Money';
import { getStaffAttendanceExcesses, getStaffAttendanceRecords } from '../../services/api';
import { displayText } from '../../utils/displayText';
import { staffAttendanceErrorMessage as errorMessage } from './staffAttendanceUtils';

export default function StaffAttendanceDashboardPage({ type }) {
  const [records, setRecords] = useState([]);
  const [excesses, setExcesses] = useState([]);
  const [position, setPosition] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([getStaffAttendanceRecords(type), getStaffAttendanceExcesses(type)])
      .then(([loadedRecords, loadedExcesses]) => {
        if (!mounted) return;
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
  }, [type]);

  const positions = useMemo(
    () => [...new Set(records.map((item) => item.positionName).filter(Boolean))],
    [records],
  );
  const matches = (item) => !position || item.positionName === position;
  const filteredRecords = records.filter(matches);
  const filteredExcesses = excesses.filter(matches);

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
  }, { count: 0, present: 0, absent: 0, justified: 0, notJustified: 0, paymentPending: 0, paid: 0, pending: 0 });
  const rate = statistics.count
    ? `${((statistics.present / statistics.count) * 100).toFixed(1)}%`
    : '—';
  const cards = [
    { label: 'Registos', value: statistics.count, icon: ClipboardList, detail: 'Presenças e faltas registadas' },
    { label: 'Presentes', value: statistics.present, icon: UserCheck, detail: 'Presenças registadas' },
    { label: 'Ausentes', value: statistics.absent, icon: UserX, detail: 'Faltas registadas' },
    { label: 'Taxa de presença', value: rate, icon: CalendarDays, detail: 'Presentes sobre o total' },
    { label: 'Não justificadas', value: statistics.notJustified, icon: UserX, detail: 'Faltas sem justificação' },
    { label: 'Pagamento pendente', value: statistics.paymentPending, icon: Clock3, detail: 'Justificações por pagar' },
    { label: 'Justificadas', value: statistics.justified, icon: CircleCheck, detail: 'Justificações pagas' },
    { label: 'Total pago', value: <Money value={statistics.paid} />, icon: Wallet, detail: 'Taxas de justificação pagas' },
    { label: 'Saldo pendente', value: <Money value={statistics.pending} />, icon: CircleDollarSign, detail: 'Taxas por liquidar' },
    ...(isTeacherMode()
      ? [{
        label: 'Limite de faltas',
        value: filteredExcesses.length ? 'Excedido' : 'Dentro do limite',
        icon: UsersRound,
        detail: 'Estado das suas faltas',
      }]
      : [
        { label: 'Excessos', value: filteredExcesses.length, icon: UsersRound, detail: 'Funcionários acima do limite' },
        { label: 'Notificados', value: filteredExcesses.filter((item) => item.notified).length, icon: Bell, detail: 'Notificações automáticas' },
      ]),
  ];

  return (
    <section className="cacoin-course-page cacoin-tasks-page cacoin-task-dashboard cacoin-tests-dashboard">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Funcionários</p>
          <h1>Dashboard</h1>
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!isTeacherMode() && (<section className="cacoin-task-dashboard-panel cacoin-tests-dashboard-filters">
        <header>
          <div>
            <h2>Filtros do relatório</h2>
          </div>
          <CalendarDays size={20} aria-hidden="true" />
        </header>
        <div className="cacoin-tests-dashboard-filter-grid">
          <TextField
            select
            size="small"
            label="Cargo"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
          >
            <MenuItem value="">Todos os cargos</MenuItem>
            {positions.map((name) => (
              <MenuItem key={name} value={name}>{displayText(name)}</MenuItem>
            ))}
          </TextField>
        </div>
      </section>)}
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
