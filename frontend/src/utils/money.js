// Formato único de dinheiro em todo o sistema: 3,000.00 MZN
// (separador de milhares "," e separador decimal ".", sempre com duas casas decimais).
// É fixo e não depende do idioma do navegador, para que ecrã, pesquisa e exportações
// (PDF, Excel, CSV, XML e recibos) mostrem exactamente o mesmo texto.
export const DEFAULT_CURRENCY = 'MZN';

const amountFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true,
});

const toNumber = (value) => {
  if (value == null || value === '') return null;
  const number = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(number) ? number : null;
};

/** Apenas o número formatado, por exemplo "3,000.00" (ou `empty` quando não há valor). */
export function formatAmount(value, empty = '') {
  const number = toNumber(value);
  return number === null ? empty : amountFormatter.format(number);
}

/** Valor com moeda, por exemplo "3,000.00 MZN" (ou `empty` quando não há valor). */
export function formatMoney(value, { currency = DEFAULT_CURRENCY, empty = '—' } = {}) {
  const number = toNumber(value);
  return number === null ? empty : `${amountFormatter.format(number)} ${currency}`;
}
