export { errorMessage, formatGrade } from '../assessments/assessmentUtils';

export const resultLabels = { APPROVED: 'Aprovado', REJECTED: 'Reprovado' };

export const resultClass = (result) => (result === 'APPROVED' ? 'paid' : 'pending');

export const frequencyLabel = (value) => (value == null ? '' : String(value));
