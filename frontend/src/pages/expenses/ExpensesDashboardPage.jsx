import { useEffect, useMemo, useState } from 'react';
import { Alert } from '@mui/material';
import { CircleDollarSign, ClipboardList, Clock3, PackageCheck, ShoppingCart } from 'lucide-react';
import Money from '../../components/Money';
import { getExpenseRecords } from '../../services/api';

const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.'
);
const sum = (rows, predicate = () => true) => rows
  .filter(predicate)
  .reduce((total, row) => total + Number(row.totalPrice ?? row.requestedAmount ?? 0), 0);
const count = (rows, status) => rows.filter((row) => row.status === status).length;

export default function ExpensesDashboardPage() {
  const [data, setData] = useState({ expenses: [], purchases: [], returns: [], sales: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all(['expenses', 'purchases', 'returns', 'sales'].map(getExpenseRecords))
      .then(([expenses, purchases, returns, sales]) => {
        if (mounted) setData({ expenses, purchases, returns, sales });
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
    const { expenses, purchases, returns, sales } = data;
    const notCancelled = (row) => row.status !== 'CANCELLED';
    return [
      { label: 'Despesas', value: expenses.length, icon: ClipboardList, detail: 'Despesas registadas' },
      { label: 'Despesas pendentes', value: count(expenses, 'PENDING'), icon: Clock3, detail: 'Aguardam decisão' },
      {
        label: 'Valor solicitado',
        value: <Money value={sum(expenses, (row) => row.status !== 'REJECTED')} />,
        icon: CircleDollarSign,
        detail: 'Despesas não rejeitadas',
      },
      { label: 'Compras', value: purchases.length, icon: ShoppingCart, detail: 'Compras registadas' },
      { label: 'Compras adquiridas', value: count(purchases, 'PURCHASED'), icon: PackageCheck, detail: 'Artigos adquiridos' },
      {
        label: 'Valor das compras',
        value: <Money value={sum(purchases, notCancelled)} />,
        icon: CircleDollarSign,
        detail: 'Compras não canceladas',
      },
      { label: 'Devoluções', value: returns.length, icon: ClipboardList, detail: 'Devoluções registadas' },
      {
        label: 'Valor das devoluções',
        value: <Money value={sum(returns, notCancelled)} />,
        icon: CircleDollarSign,
        detail: 'Devoluções não canceladas',
      },
      { label: 'Vendas', value: sales.length, icon: ShoppingCart, detail: 'Vendas registadas' },
      { label: 'Vendas pendentes', value: count(sales, 'PENDING'), icon: Clock3, detail: 'Aguardam conclusão' },
      {
        label: 'Valor vendido',
        value: <Money value={sum(sales, (row) => row.status === 'SOLD')} />,
        icon: CircleDollarSign,
        detail: 'Vendas concluídas',
      },
    ];
  }, [data]);

  return (
    <section className="cacoin-course-page cacoin-tasks-page cacoin-task-dashboard cacoin-tests-dashboard">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Despesas</p>
          <h1>Dashboard</h1>
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
