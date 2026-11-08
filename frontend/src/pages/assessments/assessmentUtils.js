import { formatGrade } from '../../utils/grade';
export const assessmentComponents = [
  { code: 'T1', label: 'T1' },
  { code: 'T2', label: 'T2' },
  { code: 'T3', label: 'T3' },
  { code: 'T4', label: 'T4' },
  { code: 'T5', label: 'T5' },
  { code: 'T6', label: 'T6' },
  { code: 'E1', label: 'Exame1' },
  { code: 'E2', label: 'Exame2' },
  { code: 'TR', label: 'Trabalho' },
];

export { formatGrade };

export const displayCell = (cell) => {
  if (!cell) return '';
  return cell.absent ? '-' : formatGrade(cell.value);
};

export const sanitizeGrade = (value) => (
  value.startsWith('-') ? '-' : value.replace(/[^\d.,]/g, '').slice(0, 5)
);

export const getGradeError = (value) => {
  const raw = value.trim();
  if (!raw || raw === '-') return '';
  const normalized = raw.replace(',', '.');
  if (!/^\d{1,2}([.]\d{1,2})?$/.test(normalized)) return 'Nota inválida';
  if (Number(normalized) > 20) return 'Máximo 20';
  return '';
};

export const errorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';

export const teachersLabel = (teachers) => (
  teachers?.length ? teachers.map((teacher) => teacher.name).join(', ') : '—'
);

export const sheetNumbers = (sheets) => {
  const counters = {};
  const result = {};
  [...sheets].sort((a, b) => a.id - b.id).forEach((sheet) => {
    const key = `${sheet.courseId}-${sheet.academicYear}`;
    counters[key] = (counters[key] ?? 0) + 1;
    result[sheet.id] = counters[key];
  });
  return result;
};

export const sheetLabel = (number, year) => `Registo No.${number} - ${year}`;
