export const normalizeTx = (tx) => {
  if (!tx) return tx;
  return {
    ...tx,
    createdAt: tx.created_at || tx.createdAt,
    paymentMethod: tx.payment_method || tx.paymentMethod,
    replacedByTransactionId: tx.replaced_by_transaction_id || tx.replacedByTransactionId,
    correctsTransactionId: tx.corrects_transaction_id || tx.correctsTransactionId,
    contactId: tx.contact_id || tx.contactId,
    contactName: tx.contact_name || tx.contactName,
    contactPhone: tx.contact_phone || tx.contactPhone,
  };
};

export const normalizeList = (list) => (Array.isArray(list) ? list : []).map(normalizeTx);
export const txDate = (tx) => tx.createdAt || tx.created_at || tx.date;
export const isActive = (tx) => tx.status === 'active' || !tx.status;
export const isWriteOffTx = (tx) => tx.type === 'payment' && (tx.note || '').startsWith('[FORGIVEN]');
export const saleLabel = (tx) => `Sale #${(tx.id || "").slice(-6).toUpperCase()}`;
export const getTrueOutstanding = (sale) => Math.max(0, (parseFloat(sale.amount) || 0) - (parseFloat(sale.paid) || 0));