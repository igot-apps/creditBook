// ==========================================
// PAYMENT ALLOCATION HELPERS (payment_allocations table)
//
// Single source of truth:
//   invoice remaining = amount − paid-upfront − Σ(valid allocations)
//   valid allocations include REAL payments AND forgiveness write-offs,
//   but are always kept distinguishable (paid vs forgiven).
//
// VALID ALLOCATION RULE (orphan-proof):
//   counts only when:
//     1. payment exists in history and is active, AND
//     2. invoice exists, is active and NOT replaced, AND
//     3. amount > 0
//
// `allocations` = rows from AllocationService.getByContact(contactId)
// `history`     = normalized transactions for the same contact
// ==========================================

const TOL = 0.009; // money tolerance — never compare money with === 0

const isActiveTx = (tx) => tx.status === 'active' || !tx.status;
const isWriteOffTx = (tx) => tx.type === 'payment' && (tx.note || '').startsWith('[FORGIVEN]');
const saleLabel = (tx) => `Sale #${(tx.id || "").slice(-6).toUpperCase()}`;

// id -> transaction, for fast validity lookups
const indexHistory = (history) => {
  const byId = {};
  (Array.isArray(history) ? history : []).forEach(t => { byId[t.id] = t; });
  return byId;
};

// Orphan-proof validity check
const isValidAlloc = (a, byId) => {
  const amt = parseFloat(a.amount) || 0;
  if (amt <= 0) return false;
  const p = byId[a.payment_id];
  if (!p || !isActiveTx(p)) return false;              // cancelled payment → ignore
  const s = byId[a.sale_id];
  if (!s || !isActiveTx(s)) return false;              // cancelled invoice → orphan
  if (s.replacedByTransactionId) return false;         // replaced invoice → orphan
  return true;
};

// ------------------------------------------
// invoiceId -> TOTAL allocated (real payments + forgiveness)
// ------------------------------------------
export const buildAllocationMap = (allocations, history) => {
  const byId = indexHistory(history);
  const map = {};
  (Array.isArray(allocations) ? allocations : []).forEach(a => {
    if (!isValidAlloc(a, byId)) return;
    map[a.sale_id] = (map[a.sale_id] || 0) + (parseFloat(a.amount) || 0);
  });
  return map;
};

// ------------------------------------------
// invoiceId -> { paid, forgiven } split (historically distinguishable)
// ------------------------------------------
export const buildAllocationBreakdown = (allocations, history) => {
  const byId = indexHistory(history);
  const paid = {};
  const forgiven = {};
  (Array.isArray(allocations) ? allocations : []).forEach(a => {
    if (!isValidAlloc(a, byId)) return;
    const amt = parseFloat(a.amount) || 0;
    if (isWriteOffTx(byId[a.payment_id])) {
      forgiven[a.sale_id] = (forgiven[a.sale_id] || 0) + amt;
    } else {
      paid[a.sale_id] = (paid[a.sale_id] || 0) + amt;
    }
  });
  return { paid, forgiven };
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
    .filter(x => x.remaining > TOL)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

// ------------------------------------------
// FIFO preview: how a NEW payment amount would be applied
// Returns { allocations: [{ sale_id, name, amount }], leftover }
// ------------------------------------------
export const fifoPreview = (openInvoices, amount) => {
  let left = parseFloat(amount) || 0;
  const allocations = [];
  for (const inv of openInvoices || []) {
    if (left <= TOL) break;
    const apply = Math.min(inv.remaining, left);
    if (apply > TOL) allocations.push({ sale_id: inv.saleId, name: inv.name, amount: apply });
    left -= apply;
  }
  return { allocations, leftover: left };
};

// ------------------------------------------
// FIFO allocation for a FORGIVENESS write-off.
// Caps at each invoice's remaining; excess stays unallocated
// (balance-level write-off only — never manufactures invoices).
// Returns rows ready to INSERT into payment_allocations.
// ------------------------------------------
export const computeForgiveAllocations = (history, allocations, amount, writeOffId, contactId) => {
  const map = buildAllocationMap(allocations, history);
  const open = computeOpenInvoices(history, map);
  let left = parseFloat(amount) || 0;
  const rows = [];
  for (const inv of open) {
    if (left <= TOL) break;
    const apply = Math.min(inv.remaining, left);
    if (apply > TOL) {
      rows.push({
        payment_id: writeOffId,
        sale_id: inv.saleId,
        contact_id: contactId || null,
        amount: apply,
      });
    }
    left -= apply;
  }
  return rows;
};

// ------------------------------------------
// Total already allocated to ONE payment (from its allocation rows)
// ------------------------------------------
export const paymentAllocatedTotal = (allocRows) =>
  (Array.isArray(allocRows) ? allocRows : []).reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);

// ------------------------------------------
// RETRO-FIFO: allocate OLD unallocated REAL payments to invoices.
// Forgiveness money is NEVER a source here (it is allocated explicitly
// at forgive-time), so no double counting is possible.
// Returns rows ready to INSERT into payment_allocations.
// ------------------------------------------
export const computeRetroAllocations = (history, allocations) => {
  const byId = indexHistory(history);
  const map = buildAllocationMap(allocations, history);
  const open = computeOpenInvoices(history, map);

  const perPayment = {};
  (Array.isArray(allocations) ? allocations : []).forEach(a => {
    if (!isValidAlloc(a, byId)) return;
    perPayment[a.payment_id] = (perPayment[a.payment_id] || 0) + (parseFloat(a.amount) || 0);
  });

  let openIdx = 0;
  const rows = [];
  const payments = (Array.isArray(history) ? history : [])
    .filter(tx =>
      tx.type === 'payment' &&
      isActiveTx(tx) &&
      !isWriteOffTx(tx) // forgiven money is not re-allocated by the healer
    )
    .sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt));

  payments.forEach(p => {
    let avail = (parseFloat(p.paid) || 0) - (perPayment[p.id] || 0);
    if (avail <= TOL) return;
    while (avail > TOL && openIdx < open.length) {
      const inv = open[openIdx];
      const apply = Math.min(inv.remaining, avail);
      if (apply > TOL) {
        rows.push({
          payment_id: p.id,
          sale_id: inv.saleId,
          contact_id: p.contactId || p.contact_id || null,
          amount: apply,
        });
      }
      inv.remaining -= apply;
      avail -= apply;
      if (inv.remaining <= TOL) openIdx++;
    }
  });
  return rows;
};