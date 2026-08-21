// ==========================================
// PAYMENT ALLOCATION HELPERS (payment_allocations table)
//
// The single source of truth:
//   invoice remaining = amount − paid-upfront − Σ(active allocations)
//
// `allocations` = rows from AllocationService.getByContact(contactId)
// `history`     = normalized transactions for the same contact
// ==========================================

const isActiveTx = (tx) => tx.status === 'active' || !tx.status;

const saleLabel = (tx) => `Sale #${(tx.id || "").slice(-6).toUpperCase()}`;

// Set of payment ids that are currently active (not cancelled / corrected)
const activePaymentIds = (history) => {
  const s = new Set();
  (Array.isArray(history) ? history : []).forEach(t => {
    if (t.type === 'payment' && isActiveTx(t)) s.add(t.id);
  });
  return s;
};

// ------------------------------------------
// saleId -> total allocated (ACTIVE payments only)
// ------------------------------------------
export const buildAllocationMap = (allocations, history) => {
  const ids = activePaymentIds(history);
  const map = {};
  (Array.isArray(allocations) ? allocations : []).forEach(a => {
    if (!ids.has(a.payment_id)) return; // cancelled payments don't count
    if (a.sale_id) map[a.sale_id] = (map[a.sale_id] || 0) + (parseFloat(a.amount) || 0);
  });
  return map;
};

// ------------------------------------------
// True remaining of ONE invoice
// ------------------------------------------
export const saleRemaining = (sale, allocationMap) => {
  const amount = parseFloat(sale.amount) || 0;
  const upfront = parseFloat(sale.paid) || 0;
  const allocated = (allocationMap && allocationMap[sale.id]) || 0;
  return Math.max(0, amount - upfront - allocated);
};

// ------------------------------------------
// Open (still-owing) invoices, OLDEST FIRST (FIFO order)
// ------------------------------------------
export const computeOpenInvoices = (history, allocationMap) =>
  (Array.isArray(history) ? history : [])
    .filter(tx => tx.type === 'sale' && isActiveTx(tx) && !tx.replacedByTransactionId)
    .map(tx => ({
      saleId: tx.id,
      name: saleLabel(tx),
      remaining: saleRemaining(tx, allocationMap),
      date: tx.created_at || tx.createdAt,
    }))
    .filter(x => x.remaining > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

// ------------------------------------------
// FIFO preview: how a NEW payment amount would be applied
// Returns { allocations: [{ sale_id, name, amount }], leftover }
// ------------------------------------------
export const fifoPreview = (openInvoices, amount) => {
  let left = parseFloat(amount) || 0;
  const allocations = [];
  for (const inv of openInvoices || []) {
    if (left <= 0) break;
    const apply = Math.min(inv.remaining, left);
    allocations.push({ sale_id: inv.saleId, name: inv.name, amount: apply });
    left -= apply;
  }
  return { allocations, leftover: left };
};

// ------------------------------------------
// Total already allocated to ONE payment (from its allocation rows)
// ------------------------------------------
export const paymentAllocatedTotal = (allocRows) =>
  (Array.isArray(allocRows) ? allocRows : []).reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);

// ------------------------------------------
// RETRO-FIFO: allocate OLD unallocated payments to invoices
// Returns rows ready to INSERT into payment_allocations:
//   [{ payment_id, sale_id, contact_id, amount }, ...]
// ------------------------------------------
export const computeRetroAllocations = (history, allocations) => {
  const map = buildAllocationMap(allocations, history);
  const open = computeOpenInvoices(history, map);

  // How much of each payment is already allocated (active payments only)
  const ids = activePaymentIds(history);
  const perPayment = {};
  (Array.isArray(allocations) ? allocations : []).forEach(a => {
    if (ids.has(a.payment_id)) {
      perPayment[a.payment_id] = (perPayment[a.payment_id] || 0) + (parseFloat(a.amount) || 0);
    }
  });

  let openIdx = 0;
  const rows = [];

  const payments = (Array.isArray(history) ? history : [])
    .filter(tx =>
      tx.type === 'payment' &&
      isActiveTx(tx) &&
      !(tx.note || '').startsWith('[FORGIVEN]') // forgiven money is not re-allocated
    )
    .sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt));

  payments.forEach(p => {
    let avail = (parseFloat(p.paid) || 0) - (perPayment[p.id] || 0);
    if (avail <= 0.009) return; // nothing left to allocate

    while (avail > 0.009 && openIdx < open.length) {
      const inv = open[openIdx];
      const apply = Math.min(inv.remaining, avail);
      rows.push({
        payment_id: p.id,
        sale_id: inv.saleId,
        contact_id: p.contactId || p.contact_id || null,
        amount: apply,
      });
      inv.remaining -= apply;
      avail -= apply;
      if (inv.remaining <= 0.009) openIdx++;
    }
  });

  return rows;
};