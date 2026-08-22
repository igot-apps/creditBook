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
export const purchaseLabel = (tx) => `Purchase #${(tx.id || "").slice(-6).toUpperCase()}`;

// ==========================================
// LOCAL ALLOCATION HELPERS (supplier side)
// ==========================================
export const activePaymentIds = (history) =>
  new Set((Array.isArray(history) ? history : []).filter(t => t.type === 'supplier_payment' && isActive(t)).map(t => t.id));

export const buildAllocMap = (allocs, history) => {
  const ids = activePaymentIds(history);
  const map = {};
  (Array.isArray(allocs) ? allocs : []).forEach(a => {
    if (ids.has(a.payment_id) && a.sale_id) map[a.sale_id] = (map[a.sale_id] || 0) + (parseFloat(a.amount) || 0);
  });
  return map;
};

export const retroRows = (history, allocs) => {
  const map = buildAllocMap(allocs, history);
  const open = (Array.isArray(history) ? history : [])
    .filter(tx => tx.type === 'purchase' && isActive(tx) && !tx.replacedByTransactionId)
    .map(tx => ({
      id: tx.id,
      remaining: Math.max(0, (parseFloat(tx.amount) || 0) - (parseFloat(tx.paid) || 0) - (map[tx.id] || 0)),
      date: tx.created_at || tx.createdAt,
    }))
    .filter(x => x.remaining > 0.009)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const ids = activePaymentIds(history);
  const per = {};
  (Array.isArray(allocs) ? allocs : []).forEach(a => {
    if (ids.has(a.payment_id)) per[a.payment_id] = (per[a.payment_id] || 0) + (parseFloat(a.amount) || 0);
  });

  let idx = 0;
  const rows = [];
  (Array.isArray(history) ? history : [])
    .filter(t => t.type === 'supplier_payment' && isActive(t))
    .sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt))
    .forEach(p => {
      let avail = (parseFloat(p.paid) || 0) - (per[p.id] || 0);
      if (avail <= 0.009) return;
      while (avail > 0.009 && idx < open.length) {
        const inv = open[idx];
        const apply = Math.min(inv.remaining, avail);
        rows.push({ payment_id: p.id, sale_id: inv.id, contact_id: p.contactId || p.contact_id || null, amount: apply });
        inv.remaining -= apply;
        avail -= apply;
        if (inv.remaining <= 0.009) idx++;
      }
    });
  return rows;
};