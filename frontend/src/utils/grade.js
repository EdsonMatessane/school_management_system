const MAX_GRADE = 20;

/** Formato das notas em Moçambique: duas casas decimais (0.00, 1.05, 10.00), excepto o 20. */
export const formatGrade = (value) => {
  if (value == null || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return number === MAX_GRADE ? '20' : number.toFixed(2);
};

/** Igual a formatGrade, mas mostra um traço quando não há nota. */
export const displayGrade = (value) => formatGrade(value) || '—';
