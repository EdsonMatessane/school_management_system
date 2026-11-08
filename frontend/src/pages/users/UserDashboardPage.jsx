import { useEffect, useMemo, useState } from 'react';
import { Alert } from '@mui/material';
import { Ban, BriefcaseBusiness, CircleCheck, Lock, ShieldCheck, UserX, UsersRound } from 'lucide-react';
import { getUserAccounts } from '../../services/api';
import { errorMessage } from './userUtils';

const statusCards = [
  { code: 'ACTIVE', label: 'Activos', icon: CircleCheck },
  { code: 'INACTIVE', label: 'Inactivos', icon: Ban },
  { code: 'LOCKED', label: 'Autobloqueio', icon: Lock },
  { code: 'FINISHED', label: 'Terminados', icon: UserX },
];
const scopes = {
  all: { title: 'Dashboard', eyebrow: 'Usuários' },
  students: { title: 'Dashboard', eyebrow: 'Usuários', kind: 'STUDENT' },
  staff: { title: 'Dashboard', eyebrow: 'Usuários', kind: 'STAFF' },
};

export default function UserDashboardPage({ scope = 'all' }) {
  const config = scopes[scope] ?? scopes.all;
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const kinds = config.kind ? [config.kind] : ['ADMIN', 'STUDENT', 'STAFF'];
    Promise.all(kinds.map(getUserAccounts))
      .then((loaded) => {
        if (mounted) setAccounts(loaded.flat());
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
  }, [config.kind]);

  const cards = useMemo(() => {
    const total = [{
      label: 'Contas',
      value: accounts.length,
      icon: ShieldCheck,
      detail: 'Total de contas de acesso',
    }];
    if (!config.kind) {
      total.push(
        { label: 'Administradores', value: accounts.filter((item) => item.kind === 'ADMIN').length, icon: ShieldCheck, detail: 'Contas de administrador' },
        { label: 'Alunos', value: accounts.filter((item) => item.kind === 'STUDENT').length, icon: UsersRound, detail: 'Contas de estudantes' },
        { label: 'Funcionários', value: accounts.filter((item) => item.kind === 'STAFF').length, icon: BriefcaseBusiness, detail: 'Contas de funcionários' },
      );
    }
    return [
      ...total,
      ...statusCards.map(({ code, label, icon }) => ({
        label,
        value: accounts.filter((item) => item.status === code).length,
        icon,
        detail: 'Contas neste estado',
      })),
    ];
  }, [accounts, config.kind]);

  return (
    <section className="cacoin-course-page cacoin-tasks-page cacoin-task-dashboard cacoin-tests-dashboard">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">{config.eyebrow}</p>
          <h1>{config.title}</h1>
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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
