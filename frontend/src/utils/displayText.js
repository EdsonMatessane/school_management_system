// BI, NUIT, NIB, códigos e emails são identificadores: nunca se mudam as maiúsculas/minúsculas.
const isIdentifier = (value) => value.includes('@') || (/\d/.test(value) && !/\s/.test(value));

export const displayText = (value) => {
  if (value == null || value === '') return '—';
  if (typeof value !== 'string' || isIdentifier(value)
    || value !== value.toLocaleUpperCase('pt-MZ')) return value;
  return value.toLocaleLowerCase('pt-MZ').replace(
    /(^|[.!?]\s+)(\p{L})/gu,
    (match, prefix, letter) => `${prefix}${letter.toLocaleUpperCase('pt-MZ')}`,
  );
};
