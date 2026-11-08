export const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.'
);

export const emptyFilters = { courseId: '', categoryId: '', levelId: '', modalityId: '' };

export const applyFilters = (rows, filters) => rows.filter((item) => (
  (!filters.courseId || String(item.courseId) === filters.courseId)
  && (!filters.categoryId || String(item.categoryId) === filters.categoryId)
  && (!filters.levelId || String(item.levelId) === filters.levelId)
  && (!filters.modalityId || String(item.modalityId) === filters.modalityId)
));

export const requestStatusCodes = {
  pending: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  completed: 'COMPLETED',
};
