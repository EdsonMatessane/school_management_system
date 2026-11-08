export { formatCourseDuration as formatDuration } from '../../components/CourseStudentPicker';

export const attendanceStatusLabels = {
  PRESENT: 'Presente',
  ABSENT: 'Ausente',
};

export const justificationLabels = {
  NONE: 'Não justificada',
  PAYMENT_PENDING: 'Pagamento pendente',
  JUSTIFIED: 'Justificada',
};

export const attendanceStatusOptions = [
  { value: 'PRESENT', label: 'Presente' },
  { value: 'ABSENT', label: 'Ausente' },
];

export const attendanceBadgeClass = (status) => (status === 'PRESENT' ? 'paid' : 'pending');

export const errorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';
