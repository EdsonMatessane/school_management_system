import { useEffect, useMemo, useState } from 'react';
import StatusBadge from '../../components/StatusBadge';
import { getPortalNotifications } from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import PortalTable from './PortalTable';
import { usePortalData } from './portalUtils';

const categories = [
  { id: 'ALL', label: 'Todas' },
  { id: 'PAYMENT', label: 'Pagamentos' },
  { id: 'ENROLLMENT', label: 'Inscrição' },
  { id: 'REQUEST', label: 'Pedidos' },
  { id: 'ACADEMIC', label: 'Académico' },
  { id: 'ATTENDANCE', label: 'Presenças' },
  { id: 'SERVICE', label: 'Serviços' },
  { id: 'MESSAGE', label: 'Mensagens' },
];

const categoryLabel = (id) => categories.find((item) => item.id === id)?.label ?? id;

export default function PortalNotifications({ seen, onRead }) {
  const { data, loading, error } = usePortalData(getPortalNotifications);
  const [category, setCategory] = useState('ALL');
  const [fresh, setFresh] = useState(() => new Set());

  useEffect(() => {
    if (!data) return;
    setFresh(new Set(data.items.filter((item) => !seen.has(item.id)).map((item) => item.id)));
    onRead(data.items.map((item) => item.id));
    // a lista só é comparada com o que já foi lido no momento em que chega
  }, [data]);

  const rows = useMemo(() => (
    data ? data.items.filter((item) => category === 'ALL' || item.category === category) : []
  ), [data, category]);

  if (loading && !data) return <p className="portal-loading">A carregar…</p>;
  if (error) return <p className="portal-error">{error}</p>;

  return (
    <>
      <div className="portal-heading">
        <h1>Notificações</h1>
      </div>

      <section className="portal-card">
        <div className="portal-tabs">
          {categories
            .filter((item) => item.id === 'ALL' || data.items.some((row) => row.category === item.id))
            .map((item) => (
              <button
                key={item.id}
                type="button"
                className={`portal-tab${category === item.id ? ' active' : ''}`}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </button>
            ))}
        </div>
        <PortalTable
          columns={['Data', 'Categoria', 'Notificação', 'Detalhes', 'Estado']}
          rows={rows}
          empty="Ainda não existem notificações."
          renderRow={(row) => (
            <tr key={row.id}>
              <td>{toDisplayDate(row.date)}</td>
              <td>{categoryLabel(row.category)}</td>
              <td>{displayText(row.title)}</td>
              <td>{displayText(row.message)}</td>
              <td>{fresh.has(row.id) ? <StatusBadge label="Nova" tone={row.tone} /> : '—'}</td>
            </tr>
          )}
        />
      </section>
    </>
  );
}
