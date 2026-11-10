// NIB moçambicano: 21 dígitos = banco (4) + balcão (4) + número de conta (11) + controlo (2).
export const NIB_LENGTH = 21;

/** Só os dígitos, no máximo 21 (aceita espaços e separadores ao colar). */
export const cleanNib = (value) => String(value ?? '').replace(/\D/g, '').slice(0, NIB_LENGTH);

/** Número de conta (11 dígitos) extraído do NIB; vazio enquanto o NIB não estiver completo. */
export const nibAccount = (nib) => {
  const digits = cleanNib(nib);
  return digits.length === NIB_LENGTH ? digits.slice(8, 19) : '';
};

/** Mensagem de erro, ou vazio quando o NIB está vazio ou é válido. */
export const nibError = (nib) => {
  const digits = cleanNib(nib);
  if (!digits) return '';
  if (digits.length !== NIB_LENGTH) return 'O NIB deve ter exactamente 21 dígitos.';
  if (digits.startsWith('0000') || /^0+$/.test(digits.slice(8, 19))) {
    return 'O NIB indicado não é válido.';
  }
  return '';
};

export const MOZAMBIQUE_BANKS = [
  'Absa Bank Moçambique',
  'Access Bank Moçambique',
  'Banco Mais',
  'Banco Terra',
  'Banco Único',
  'BCI',
  'BNI',
  'Ecobank',
  'First Capital Bank',
  'FNB Moçambique',
  'Millennium bim',
  'Moza Banco',
  'Socremo',
  'Standard Bank',
];
