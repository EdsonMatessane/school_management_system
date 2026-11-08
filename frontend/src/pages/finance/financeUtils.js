import { systemDate } from '../../utils/systemDate';
export const statusLabels = {
  PAID: 'Pago',
  PENDING: 'Pendente',
  ADVANCED: 'Adiantado',
  BONUSED: 'Bonificado',
  DEBT: 'Em dívida',
};

export const statusClass = (status) => (
  status === 'PENDING' || status === 'DEBT' ? 'pending' : 'paid'
);

export const kindLabels = {
  PROCESSING: 'Processamento',
  ADVANCE: 'Adiantamento',
  LIQUIDATION: 'Liquidação',
};

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const monthLabel = (isoDate) => {
  if (!isoDate) return '';
  const [year, month] = String(isoDate).slice(0, 10).split('-');
  return `${monthNames[Number(month) - 1]} ${year}`;
};

export const monthIso = (year, month) => `${year}-${String(month).padStart(2, '0')}-01`;

export const nextMonths = (count) => {
  const base = systemDate();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(base.getFullYear(), base.getMonth() + index + 1, 1);
    return monthIso(date.getFullYear(), date.getMonth() + 1);
  });
};

export const formatDateTime = (value) => {
  if (!value) return '';
  const text = String(value);
  const [date, time = ''] = text.split('T');
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year} ${time.slice(0, 5)}`.trim();
};

export const errorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';

export const parseAmount = (value) => {
  const amount = Number(String(value).replace(',', '.'));
  return Number.isFinite(amount) ? amount : NaN;
};
