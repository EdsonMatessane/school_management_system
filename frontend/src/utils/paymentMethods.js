// Pagamentos antigos guardavam um código fixo em vez do nome do método configurado.
const legacyMethodLabels = {
  CASH: 'Numerário',
  BANK_TRANSFER: 'Transferência Bancária',
  POS: 'POS',
  OTHER: 'Outro',
};

export const methodLabel = (method) => legacyMethodLabels[method] ?? method;
