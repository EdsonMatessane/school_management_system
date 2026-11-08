export const standardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export const uniformStatusLabels = {
  PAYMENT_PENDING: 'Pagamento pendente',
  DELIVERY_PENDING: 'Entrega pendente',
  DELIVERED: 'Entregue',
};

export const sizeDistribution = (orders) => {
  const counts = new Map();
  orders.forEach((order) => counts.set(order.size, (counts.get(order.size) ?? 0) + 1));
  return [...counts]
    .sort(([a], [b]) => standardSizes.indexOf(a) - standardSizes.indexOf(b))
    .map(([size, count]) => ({ size, count, label: `${count}-${size}` }));
};

export const studentsWithoutUniform = (students, orders) => {
  const withUniform = new Set(
    orders.filter((order) => order.paid).map((order) => order.studentCode),
  );
  return students.filter((student) => student.active && !withUniform.has(student.studentCode));
};

export const observationFor = (size, stock) => {
  if (!size) return '';
  const entry = stock?.sizes?.find((item) => item.size === size);
  if (!entry) return `Falta de tamanho ${size}`;
  return entry.quantity > 0 ? '-' : 'Sem stock';
};
