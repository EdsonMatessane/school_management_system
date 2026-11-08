export const formatNib = (nib) => String(nib ?? '')
  .replace(/^(\d{4})(\d{4})(\d{11})(\d{2})$/, '$1 $2 $3 $4');
