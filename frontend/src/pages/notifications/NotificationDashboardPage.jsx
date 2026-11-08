import { useEffect, useMemo, useState } from 'react';
import { Alert } from '@mui/material';
import { ClipboardList, MessageCircle, MessageSquareText } from 'lucide-react';
import { getNotificationMessages } from '../../services/api';
import useStatuses from '../../utils/useStatuses';

const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.'
);
const channels = [
  { channel: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle },
  { channel: 'SMS', label: 'SMS', icon: MessageSquareText },
];

export default function NotificationDashboardPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { statuses, error: statusError } = useStatuses('NOTIFICATIONS');

  useEffect(() => {
    let mounted = true;
    getNotificationMessages()
      .then((loaded) => {
        if (mounted) setMessages(loaded);
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

  const cards = useMemo(() => [
    { label: 'Mensagens', value: messages.length, icon: ClipboardList, detail: 'Total de mensagens' },
    ...channels.flatMap(({ channel, label, icon }) => {
      const rows = messages.filter((item) => item.channel === channel);
      return [
        { label, value: rows.length, icon, detail: `Mensagens por ${label}` },
        ...statuses.map((status) => ({
          label: `${label}: ${status.label}`,
          value: rows.filter((item) => item.status === status.code).length,
          icon,
          detail: 'Mensagens neste estado',
        })),
      ];
    }),
  ], [messages, statuses]);

  return (
    <section className="cacoin-course-page cacoin-tasks-page cacoin-task-dashboard cacoin-tests-dashboard">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Notificações</p>
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
