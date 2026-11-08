import { systemDate } from '../../utils/systemDate';
import { isTeacherMode } from '../../utils/teacherMode';
import { useEffect, useState } from 'react';
import { Alert } from '@mui/material';
import {
  Banknote,
  CircleCheck,
  CircleDollarSign,
  Clock3,
  Gift,
  TrendingDown,
  Users,
  Wallet,
} from 'lucide-react';
import Money from '../../components/Money';
import { getFinanceDashboard } from '../../services/api';
import { errorMessage, monthLabel } from './financeUtils';

export default function FinanceDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getFinanceDashboard()
      .then((loaded) => {
        if (mounted) setData(loaded);
      })
      .catch((loadError) => {
        if (mounted) setError(errorMessage(loadError));
      });
    return () => {
      mounted = false;
    };
  }, []);

  const now = systemDate();
  const month = monthLabel(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const monthState = !data || !data.registered ? '—'
    : data.paid || data.bonused ? 'Pago' : data.pending ? 'Pendente' : '—';
  const teacherCards = data ? [
    { label: 'Salário mensal', value: <Money value={data.monthlyPayroll} />, icon: Banknote, detail: 'O seu salário' },
    { label: 'Estado do mês', value: monthState, icon: CircleCheck, detail: month },
    { label: 'Pago no mês', value: <Money value={data.paidThisMonth} />, icon: CircleDollarSign, detail: 'Salário pago' },
    { label: 'Bónus do mês', value: <Money value={data.bonusThisMonth} />, icon: Gift, detail: 'Bónus pago' },
    { label: 'Pago no ano', value: <Money value={data.paidThisYear} />, icon: CircleDollarSign, detail: `Total de ${now.getFullYear()}` },
    { label: 'Meses adiantados', value: data.advancedMonths, icon: Wallet, detail: 'Pagamentos antecipados' },
    { label: 'Total em dívida', value: <Money value={data.totalDebt} />, icon: TrendingDown, detail: 'Salários por liquidar' },
  ] : [];
  const adminCards = data ? [
    { label: 'Funcionários', value: data.registered, icon: Users, detail: 'Com cadastro de salário' },
    { label: 'Folha salarial', value: <Money value={data.monthlyPayroll} />, icon: Banknote, detail: 'Soma dos salários mensais' },
    { label: 'Pagos', value: data.paid, icon: CircleCheck, detail: month },
    { label: 'Bonificados', value: data.bonused, icon: Gift, detail: month },
    { label: 'Pendentes', value: data.pending, icon: Clock3, detail: month },
    { label: 'Meses adiantados', value: data.advancedMonths, icon: Wallet, detail: 'Pagamentos antecipados' },
    { label: 'Pago no mês', value: <Money value={data.paidThisMonth} />, icon: CircleDollarSign, detail: 'Salários pagos' },
    { label: 'Bónus do mês', value: <Money value={data.bonusThisMonth} />, icon: Gift, detail: 'Bónus pagos' },
    { label: 'Pago no ano', value: <Money value={data.paidThisYear} />, icon: CircleDollarSign, detail: `Total de ${now.getFullYear()}` },
    { label: 'Em dívida', value: data.employeesInDebt, icon: TrendingDown, detail: 'Funcionários com meses por pagar' },
    { label: 'Total em dívida', value: <Money value={data.totalDebt} />, icon: TrendingDown, detail: 'Salários por liquidar' },
  ] : [];
  const cards = isTeacherMode() ? teacherCards : adminCards;

  return (
    <section className="cacoin-course-page cacoin-tasks-page cacoin-task-dashboard cacoin-tests-dashboard">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Finanças</p>
          <h1>Dashboard</h1>
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <div className="cacoin-task-dashboard-cards">
        {(data ? cards : Array.from({ length: 6 }, (_, index) => ({
          label: '—', value: '—', icon: Wallet, detail: '', key: index,
        }))).map(({ label, value, icon: Icon, detail, key }) => (
          <article className="cacoin-task-dashboard-card" key={key ?? label}>
            <span className="cacoin-task-dashboard-card-icon">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="cacoin-task-dashboard-card-label">{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
