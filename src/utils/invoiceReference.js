const compactDate = (value) => {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '00000000';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

export const invoiceReference = (tx = {}) => {
  const id = String(tx.id || '0000').replace(/-/g, '').slice(-4).toUpperCase().padStart(4, '0');
  const date = tx.created_at || tx.createdAt || tx.date;
  const prefix = tx.type === 'purchase' ? 'PUR' : 'INV';
  return `${prefix}-${compactDate(date)}-${id}`;
};
