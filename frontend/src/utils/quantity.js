/** Quantidade com unidade, por exemplo «2 - caixa(s)»; «N/A» quando não foi indicada. */
export const formatQuantity = (quantity, unit) => {
  if (quantity == null || quantity === '') return 'N/A';
  return unit ? `${quantity} - ${unit}` : String(quantity);
};

export const quantityUnits = [
  'unidade(s)', 'caixa(s)', 'embalagem(ns)', 'pacote(s)', 'saco(s)', 'dúzia(s)',
  'par(es)', 'kg', 'g', 'litro(s)', 'metro(s)',
];
