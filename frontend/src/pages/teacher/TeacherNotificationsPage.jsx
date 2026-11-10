import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, TableCell, TableRow } from '@mui/material';
import { Bell } from 'lucide-react';
import StandardTable from '../../components/StandardTable';
import StatusBadge from '../../components/StatusBadge';
import { getTeacherNotifications } from '../../services/api';
import { readTeacherSeen, saveTeacherSeen } from './TeacherNotificationDialog';
import { formatDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';

const categoryLabels = {
  TASK: 'Tarefas',
  LEAVE: 'Pedidos de saída',
  DOCUMENT: 'Documentos',
  SALARY: 'Salários',
};

const columns = [
  { key: 'date', label: 'Data' },
  { key: 'category', label: 'Categoria' },
  { key: 'title', label: 'Notificação' },
  { key: 'message', label: 'Detalhes' },
  { key: 'status', label: 'Estado' },
];

export default function TeacherNotificationsPage() {
  const [items, setItems] = useState([]);
  const [fresh, setFresh] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getTeacherNotifications();
      const seen = readTeacherSeen();
      setItems(result.items);
      setFresh(new Set(result.items.filter((item) => !seen.has(item.id)).map((item) => item.id)));
      saveTeacherSeen(new Set([...seen, ...result.items.map((item) => item.id)]));
    } catch (loadError) {
      setError(loadError.response?.data?.message || loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => items, [items]);

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <h1><Bell size={23} aria-hidden="true" /> Notificações</h1>
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <StandardTable
        ariaLabel="Notificações"
        columns={columns}
        emptyMessage={error ? 'Não foi possível carregar as notificações.' : 'Ainda não existem notificações.'}
        loading={loading}
        rows={rows}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{formatDate(row.date)}</TableCell>
            <TableCell>{categoryLabels[row.category] ?? row.category}</TableCell>
            <TableCell>{displayText(row.title)}</TableCell>
            <TableCell>{displayText(row.message)}</TableCell>
            <TableCell>
              {fresh.has(row.id) ? <StatusBadge label="Nova" tone={row.tone} /> : '—'}
            </TableCell>
          </TableRow>
        )}
      />
    </section>
  );
}
