import { displayText } from '../../utils/displayText';

/** Dados do funcionário: para o professor vão uma vez no cabeçalho, não em cada linha. */
export const personalKeys = [
  'staffCode', 'staffName', 'phone', 'biNumber', 'nuit', 'positionName', 'salaryTypeName',
];

export const withoutPersonal = (columns) => columns.filter(({ key }) => !personalKeys.includes(key));

export const ownDetails = (first) => (first ? [
  { label: 'Código', value: String(first.staffCode ?? '').toUpperCase() },
  { label: 'Nome', value: displayText(first.staffName) },
  { label: 'Cargo', value: displayText(first.positionName) },
  { label: 'Tipo de Salário', value: displayText(first.salaryTypeName) },
] : []);
