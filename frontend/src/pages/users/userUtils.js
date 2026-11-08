import { formatDate, formatDateTime } from '../../utils/date';

export { formatDate, formatDateTime };

export const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.'
);

export const accessWindow = (account) => (
  account.accessStart && account.accessEnd ? `${account.accessStart} – ${account.accessEnd}` : '24H'
);

export const userStatusCodes = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  locked: 'LOCKED',
  finished: 'FINISHED',
};
