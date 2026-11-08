import { formatDate, formatDateTime } from '../utils/date';

/** Mostra uma data no formato do sistema: DD/MM/AAAA (ou DD/MM/AAAA HH:MM com time). */
export default function DateText({ value, time = false, empty, className, style }) {
  return (
    <span className={className} style={{ whiteSpace: 'nowrap', ...style }}>
      {time ? formatDateTime(value, empty) : formatDate(value, empty)}
    </span>
  );
}
