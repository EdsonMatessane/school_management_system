import { useState } from 'react';
import { GraduationCap, Wallet } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { getPortalOverview } from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatMoney } from '../../utils/money';
import { BarChart, DonutChart } from './PortalCharts';
import PortalTable from './PortalTable';
import { attendanceLabel, usePortalData } from './portalUtils';

const financial = ['balance', 'paidYear'];

const formatKpi = (kpi) => {
  const number = Number(kpi.value);
  if (kpi.format === 'money') return formatMoney(number);
  if (kpi.format === 'percent') return `${number.toLocaleString('pt-MZ', { maximumFractionDigits: 1 })}%`;
  return number.toLocaleString('pt-MZ');
};

function KpiGroup({ icon: Icon, title, items }) {
  return (
    <section className="portal-kpi-group">
      <div className="portal-kpi-title">
        <Icon size={16} aria-hidden="true" />
        <span>{title}</span>
        <hr />
      </div>
      <div className="portal-stats">
        {items.map((kpi) => (
          <div className="portal-stat" key={kpi.key}>
            <div>
              <strong>{formatKpi(kpi)}</strong>
              <span>{kpi.label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function PortalDashboard({ onNavigate }) {
  const { data, loading, error } = usePortalData(getPortalOverview);
  const [tab, setTab] = useState('payments');

  if (loading) return <p className="portal-loading">A carregar…</p>;
  if (error) return <p className="portal-error">{error}</p>;

  const percentPaid = Number(data.billed) > 0
    ? Math.min(100, (Number(data.paid) * 100) / Number(data.billed)) : 0;
  const [paymentsChart, attendanceChart, gradesChart] = data.charts;
  const attendanceValues = attendanceChart.series[0].values.map(Number);
  const gradeValues = gradesChart.series[0].values.map(Number);
  const paymentValues = paymentsChart.series[0].values.map(Number);

  return (
    <>
      <div className="portal-heading">
        <h1>Dashboard</h1>
      </div>

      <div className="portal-section-title">Olá, {displayText(data.profile.name).split(' ')[0]}</div>

      <div className="portal-kpi-groups">
        <KpiGroup icon={Wallet} title="Financeiro" items={data.kpis.filter((kpi) => financial.includes(kpi.key))} />
        <KpiGroup icon={GraduationCap} title="Académico" items={data.kpis.filter((kpi) => !financial.includes(kpi.key))} />
      </div>

      <div className="portal-two">
        <section className="portal-card">
          <h2>{attendanceChart.title}</h2>
          <DonutChart
            segments={[
              { label: 'Presenças', value: attendanceValues[0] ?? 0, color: 'var(--portal-chart-1)' },
              { label: 'Faltas', value: attendanceValues[1] ?? 0, color: 'var(--portal-chart-2)' },
            ]}
          />
        </section>
        <section className="portal-card">
          <h2>{gradesChart.title}</h2>
          <BarChart labels={gradesChart.labels} values={gradeValues} format={(value) => `${Math.round(value)}`} />
        </section>
      </div>

      <div className="portal-two">
        <section className="portal-card">
          <h2>{paymentsChart.title}</h2>
          <BarChart labels={paymentsChart.labels} values={paymentValues} palette={['var(--portal-chart-2)']} />
        </section>
        <section className="portal-card portal-balance">
          <h2 style={{ margin: 0 }}>Saldo em dívida</h2>
          <span className="portal-pill">MZN</span>
          <div className="portal-balance-amount">{formatMoney(data.balance)}</div>
          <div className="portal-bar" aria-hidden="true"><span style={{ width: `${percentPaid}%` }} /></div>
          <div className="portal-balance-line">
            Pago {formatMoney(data.paid)} de {formatMoney(data.billed)}
          </div>
          {data.nextDueDate && (
            <div className="portal-balance-line">
              Próximo vencimento: <strong>{toDisplayDate(data.nextDueDate)}</strong> · {formatMoney(data.nextDueAmount)}
            </div>
          )}
          <button type="button" className="portal-button" onClick={() => onNavigate('payments')}>
            Ver pagamentos <span aria-hidden="true">→</span>
          </button>
        </section>
      </div>

      <section className="portal-card">
        <h2>Actividade recente</h2>
        <div className="portal-tabs">
          <button type="button" className={`portal-tab${tab === 'payments' ? ' active' : ''}`} onClick={() => setTab('payments')}>
            Pagamentos
          </button>
          <button type="button" className={`portal-tab${tab === 'attendance' ? ' active' : ''}`} onClick={() => setTab('attendance')}>
            Presenças
          </button>
        </div>
        {tab === 'payments' ? (
          <PortalTable
            columns={['Data', 'Descrição', 'Método', 'Valor']}
            rows={data.recentPayments}
            empty="Ainda não existem pagamentos."
            renderRow={(row, index) => (
              <tr key={`${row.reference}-${index}`}>
                <td>{toDisplayDate(row.date)}</td>
                <td>{displayText(row.description)}</td>
                <td>{displayText(row.method)}</td>
                <td>{formatMoney(row.amount)}</td>
              </tr>
            )}
          />
        ) : (
          <PortalTable
            columns={['Data', 'Professor', 'Estado']}
            rows={data.recentAttendance}
            empty="Ainda não existem presenças registadas."
            renderRow={(row) => {
              const state = attendanceLabel(row);
              return (
                <tr key={row.id}>
                  <td>{toDisplayDate(row.date)}</td>
                  <td>{displayText(row.teacherName)}</td>
                  <td><StatusBadge label={state.label} tone={state.tone} /></td>
                </tr>
              );
            }}
          />
        )}
      </section>
    </>
  );
}
