export { formatCourseDuration as formatDuration } from '../../components/CourseStudentPicker';

export const suspensionStatusLabels = {
  PAYMENT_PENDING: 'Pagamento pendente',
  PAID: 'Pago',
  SUSPENDED: 'Trancado',
};

export const errorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';
