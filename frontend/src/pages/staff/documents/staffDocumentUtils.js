export const errorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';

export const documentLabel = (document) => (
  document.description
    ? `${document.typeName} — ${document.description}`
    : document.typeName
);

export const dayLabel = (days) => (
  `${Math.abs(days)} ${Math.abs(days) === 1 ? 'dia' : 'dias'}`
);
