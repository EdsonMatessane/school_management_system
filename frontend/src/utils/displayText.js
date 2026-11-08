export const displayText = (value) => {
  if (value == null || value === '') return '—';
  if (typeof value !== 'string' || value !== value.toLocaleUpperCase('pt-MZ')) return value;
  return value.toLocaleLowerCase('pt-MZ').replace(
    /(^|[.!?]\s+)(\p{L})/gu,
    (match, prefix, letter) => `${prefix}${letter.toLocaleUpperCase('pt-MZ')}`,
  );
};
