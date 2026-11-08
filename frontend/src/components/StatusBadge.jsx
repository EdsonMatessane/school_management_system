import './status-badge.css';

export const statusTones = [
  { value: 'paid', label: 'Verde' },
  { value: 'pending', label: 'Amarelo' },
  { value: 'rejected', label: 'Vermelho' },
  { value: 'neutral', label: 'Cinzento' },
];

export default function StatusBadge({ label, tone, className = '' }) {
  return (
    <span className={`cacoin-status-badge ${tone || 'neutral'} ${className}`.trim()}>
      {label}
    </span>
  );
}
