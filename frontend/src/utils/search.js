export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-MZ');
}

export function filterBySearch(items, query, getSearchableValues) {
  const normalizedQuery = normalizeSearchText(query.trim());
  if (!normalizedQuery) return items;

  return items.filter((item) =>
    getSearchableValues(item).some((value) =>
      normalizeSearchText(value).includes(normalizedQuery)));
}
