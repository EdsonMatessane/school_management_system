import { systemDate } from '../../utils/systemDate';
export const staffAttendanceLabels = {
  hr: 'Recursos Humanos',
  teachers: 'Professores',
  other: 'Outros Funcionários',
};

export const staffAttendanceErrorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.'
);

export const justificationLabels = {
  NONE: 'Não justificada',
  PAYMENT_PENDING: 'Pagamento pendente',
  JUSTIFIED: 'Justificada',
};

export const todayIso = () => {
  const date = systemDate();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const joinCourses = (courses, key) => (
  courses?.length ? courses.map((course) => course[key]).join(' | ') : '—'
);
