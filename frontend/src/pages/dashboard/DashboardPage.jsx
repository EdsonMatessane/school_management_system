import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Tab, Tabs } from '@mui/material';
import {
  BookOpen,
  BriefcaseBusiness,
  LayoutDashboard,
  RefreshCw,
  Settings2,
  ShieldCheck,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { getDashboard } from '../../services/api';
import { Chart } from './DashboardCharts';
import { formatDateTime } from '../../utils/date';

const tabIcons = {
  overview: LayoutDashboard,
  students: UsersRound,
  finance: Wallet,
  academic: BookOpen,
  staff: BriefcaseBusiness,
  operations: Settings2,
  system: ShieldCheck,
};

const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível carregar o Dashboard.'
);

const formatValue = (kpi, currency) => {
  const number = Number(kpi.value);
  if (kpi.format === 'money') {
    return `${number.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  }
  if (kpi.format === 'percent') return `${number.toLocaleString('pt-MZ', { maximumFractionDigits: 1 })}%`;
  return number.toLocaleString('pt-MZ');
};

const formatGenerated = (value) => formatDateTime(value, '');

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getDashboard());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = useMemo(() => data?.tabs[tab] ?? null, [data, tab]);

  return (
    <section className="cacoin-course-page cacoin-tasks-page cacoin-task-dashboard">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Resumo geral do sistema</p>
          <h1>Dashboard</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          {data && <span style={{ fontSize: 13, opacity: 0.7 }}>Actualizado em {formatGenerated(data.generatedAt)}</span>}
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={load} disabled={loading}>
            Actualizar
          </Button>
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && !data && <p>A carregar o Dashboard…</p>}
      {data && (
        <>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2 }}
          >
            {data.tabs.map((item) => {
              const Icon = tabIcons[item.key] ?? LayoutDashboard;
              return (
                <Tab key={item.key} icon={<Icon size={17} />} iconPosition="start" label={item.title} />
              );
            })}
          </Tabs>
          {current && (
            <>
              <div className="cacoin-dashboard-kpis">
                {current.kpis.map((kpi) => (
                  <article className="cacoin-dashboard-kpi" key={kpi.key}>
                    <span>{kpi.label}</span>
                    <strong style={{ fontSize: kpi.format === 'money' ? 21 : undefined }}>
                      {formatValue(kpi, data.currency)}
                    </strong>
                    {kpi.detail && <small>{kpi.detail}</small>}
                  </article>
                ))}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                  gap: 16,
                }}
              >
                {current.charts.map((chart) => (
                  <section
                    className="cacoin-task-dashboard-panel"
                    key={chart.key}
                    style={chart.type === 'line' ? { gridColumn: '1 / -1' } : undefined}
                  >
                    <header>
                      <div>
                        <h2>{chart.title}</h2>
                      </div>
                    </header>
                    <Chart chart={chart} />
                  </section>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
