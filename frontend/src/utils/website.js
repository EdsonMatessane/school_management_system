const WEBSITE = /^(https?:\/\/)?([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}(:\d{1,5})?(\/\S*)?$/;

export const isValidWebsite = (value) => WEBSITE.test(String(value ?? '').trim());

/** Endereço completo (com https:// se faltar), pronto para abrir. */
export const websiteHref = (value) => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
};

/** Forma curta para cabeçalhos e recibos: sem protocolo nem «/» final. */
export const websiteLabel = (value) => String(value ?? '').trim()
  .replace(/^https?:\/\//i, '')
  .replace(/\/+$/, '');
