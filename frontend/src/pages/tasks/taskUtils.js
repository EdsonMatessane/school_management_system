import { maskDate, parseDisplayDate, toDisplayDate } from '../../utils/date';

export const statuses = [
  { value: 'TODO', label: 'Por fazer' },
  { value: 'IN_PROGRESS', label: 'Em progresso' },
  { value: 'BLOCKED', label: 'Bloqueada' },
  { value: 'DONE', label: 'Concluída' },
];

export const priorities = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Média' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
];

export const recurrenceOptions = [
  { value: 'DAILY', label: 'Diária' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'YEARLY', label: 'Anual' },
];

export const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.'
);

export const statusLabel = (status) => statuses.find((item) => item.value === status)?.label ?? status;
export const priorityLabel = (priority) => priorities.find((item) => item.value === priority)?.label ?? priority;

export function statusColor(status) {
  if (status === 'DONE') return 'success';
  if (status === 'BLOCKED') return 'error';
  if (status === 'IN_PROGRESS') return 'info';
  return 'default';
}

export function priorityColor(priority) {
  if (priority === 'URGENT') return 'error';
  if (priority === 'HIGH') return 'warning';
  if (priority === 'LOW') return 'default';
  return 'info';
}

export function formatDateTime(value) {
  if (!value) return '—';
  const [date, time = ''] = value.split('T');
  return `${toDisplayDate(date)}${time ? ` ${time.slice(0, 5)}` : ''}`;
}

export function toDateTimeInputs(value) {
  if (!value) return { date: '', time: '' };
  const [date, time = ''] = value.split('T');
  return { date: toDisplayDate(date), time: time.slice(0, 5) };
}

export function parseDateTime(date, time, label) {
  if (!date && !time) return { value: null, error: '' };
  if (!date || !time) return { value: null, error: `Indique a data e a hora de ${label}.` };
  const parsedDate = parseDisplayDate(date);
  if (!parsedDate) return { value: null, error: `Use uma data válida em ${label} (DD/MM/AAAA).` };
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return { value: null, error: `Indique uma hora válida em ${label} (HH:mm).` };
  }
  return { value: `${parsedDate}T${time}:00`, error: '' };
}

export function maskTaskDate(value) {
  return maskDate(value);
}
