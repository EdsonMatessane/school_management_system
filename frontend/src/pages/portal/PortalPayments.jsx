import { useState } from 'react';
import StatusBadge from '../../components/StatusBadge';
import { getPortalPayments } from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatMoney } from '../../utils/money';
import PortalTable from './PortalTable';
import { chargeTone, usePortalData } from './portalUtils';

const tabs = [
  { id: 'pending', label: 'Por pagar' },
  { id: 'charges', label: 'Cobranças' },
  { id: 'history', label: 'Histórico' },
  { id: 'mobile', label: 'Mobile Money' },
];

export default function PortalPayments() {
  const { data, loading, error } = usePortalData(getPortalPayments);
  const [tab, setTab] = useState('pending');

  if (loading) return <p className="portal-loading">A carregar…</p>;
  if (error) return <p className="portal-error">{error}</p>;

  const groups = data.pending.filter((group) => group.items.length);

  return (
    <>
      <div className="portal-heading">
        <h1>Pagamentos</h1>
      </div>
      <section className="portal-card">
        <div className="portal-stats">
          {[
            ['Facturado', data.billed],
            ['Pago', data.paid],
            ['Em dívida', data.balance],
            ['Em atraso', data.overdue],
          ].map(([label, value]) => (
            <div className="portal-stat" key={label}>
              <div>
                <strong>{formatMoney(value)}</strong>
                <span>{label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="portal-card">
        <div className="portal-tabs">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`portal-tab${tab === item.id ? ' active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'pending' && (groups.length ? groups.map((group) => (
          <div key={group.kind} style={{ marginBottom: 18 }}>
            <h2>{group.label} · {formatMoney(group.total)}</h2>
            <PortalTable
              columns={['Descrição', 'Detalhe', 'Data', 'Valor']}
              rows={group.items}
              renderRow={(row) => (
                <tr key={row.itemId}>
                  <td>{displayText(row.description)}</td>
                  <td>{displayText(row.detail)}</td>
                  <td>{toDisplayDate(row.date)}</td>
                  <td>{formatMoney(row.amount)}</td>
                </tr>
              )}
            />
          </div>
        )) : <p className="portal-empty">Não tem pagamentos por fazer.</p>)}

        {tab === 'charges' && (
          <PortalTable
            columns={['Descrição', 'Período', 'Tipo', 'Vencimento', 'Valor', 'Pago', 'Saldo', 'Estado']}
            rows={data.charges}
            empty="Ainda não existem cobranças."
            renderRow={(row) => {
              const state = chargeTone(row);
              return (
                <tr key={row.id}>
                  <td>{displayText(row.description)}</td>
                  <td>{displayText(row.periodLabel)}</td>
                  <td>{row.feeType}</td>
                  <td>{toDisplayDate(row.dueDate)}</td>
                  <td>{formatMoney(row.amount)}</td>
                  <td>{formatMoney(row.paidAmount)}</td>
                  <td>{formatMoney(row.balance)}</td>
                  <td><StatusBadge label={state.label} tone={state.tone} /></td>
                </tr>
              );
            }}
          />
        )}

        {tab === 'history' && (
          <PortalTable
            columns={['Data', 'Descrição', 'Método', 'Referência', 'Valor']}
            rows={data.history}
            empty="Ainda não existem pagamentos."
            renderRow={(row, index) => (
              <tr key={`${row.reference}-${index}`}>
                <td>{toDisplayDate(row.date)}</td>
                <td>{displayText(row.description)}</td>
                <td>{displayText(row.method)}</td>
                <td>{displayText(row.reference)}</td>
                <td>{formatMoney(row.amount)}</td>
              </tr>
            )}
          />
        )}

        {tab === 'mobile' && (
          <PortalTable
            columns={['Referência', 'Descrição', 'Carteira', 'Valor', 'Estado']}
            rows={data.mobileMoney}
            empty="Ainda não existem pagamentos Mobile Money."
            renderRow={(row) => (
              <tr key={row.id}>
                <td>{row.reference}</td>
                <td>{displayText(row.description)}</td>
                <td>{row.walletLabel}</td>
                <td>{formatMoney(row.amount)}</td>
                <td><StatusBadge label={row.statusLabel} tone={row.statusTone} /></td>
              </tr>
            )}
          />
        )}
      </section>
    </>
  );
}
