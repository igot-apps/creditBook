// ==========================================
// PAYMENT ALLOCATION HELPERS (payment_allocations table)
//
// Single source of truth for invoice-level math:
//   invoice remaining = amount − paid-upfront − Σ(valid allocations)
//
// VALID ALLOCATION RULE (orphan-proof):
//   An allocation counts ONLY when:
//     1. its payment exists in history and is active, AND
//     2. its invoice (sale/purchase) exists, is active and NOT replaced, AND
//     3. its amount > 0
//   Allocations pointing at dead / cancelled / replaced invoices are ORPHANS:
//   they are ignored everywhere, and their money is freed so the retro-FIFO
//   healer can re-apply it to live open invoices.
//
// `allocations` = rows from AllocationService.getByContact(contactId)
// `history`     = normalized transactions for the same contact
// ==========================================

const isActiveTx = (tx) => tx.status === 'active' || !tx.status;
const TOL = 0.009; // money tolerance — never compare money with === 0

const defaultOpts = (opts) => ({
  paymentType: (opts && opts.paymentType) || 'payment',
  invoiceType: (opts && opts.invoiceType) || 'sale',
});

const invoiceLabel = (tx, invoiceType) =>
  `${invoiceType === 'purchase' ? 'Purchase' : 'Sale'} #${(tx.id || "").slice(-6).toUpperCase()}`;

// Index history once for fast, safe lookups
const indexHistory = (history) => {
  const payById = {};
  const invoiceById = {};
  (Array.isArray(history) ? history : []).forEach(t => {
    if (t.type === 'payment' || t.type === 'supplier_payment') payById[t.id] = t;
    else if (t.type === 'sale' || t.type === 'purchase') invoiceById[t.id] = t;
  });
  return { payById, invoiceById };
};

// Orphan-proof validity check
const isValidAlloc = (a, payById, invoiceById) => {
  const amt = parseFloat(a.amount) || 0;
  if (amt <= 0) return false;
  const p = payById[a.payment_id];
  if (!p || !isActiveTx(p)) return false;               // cancelled payment → ignore
  const inv = invoiceById[a.sale_id];
  if (!inv || !isActiveTx(inv)) return false;           // cancelled invoice → orphan
  if (inv.replacedByTransactionId) return false;        // replaced invoice → orphan
  return true;
};

// ------------------------------------------
// invoiceId -> total allocated (VALID allocations only)
// ------------------------------------------
export const buildAllocationMap = (allocations, history, opts) => {
  const { payById, invoiceById } = indexHistory(history);
  const map = {};
  (Array.isArray(allocations) ? allocations : []).forEach(a => {
    if (!isValidAlloc(a, payById, invoiceById)) return;
    map[a.sale_id] = (map[a.sale_id] || 0) + (parseFloat(a.amount) || 0);
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
export const computeOpenInvoices = (history, allocationMap, opts) => {
  const o = defaultOpts(opts);
  return (Array.isArray(history) ? history : [])
    .filter(tx => tx.type === o.invoiceType && isActiveTx(tx) && !tx.replacedByTransactionId)
    .map(tx => ({
      saleId: tx.id,
      name: invoiceLabel(tx, o.invoiceType),
      remaining: saleRemaining(tx, allocationMap),
      date: tx.created_at || tx.createdAt,
    }))
    .filter(x => x.remaining > TOL)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

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
// Total already allocated to ONE payment (from its allocation rows)
// ------------------------------------------
export const paymentAllocatedTotal = (allocRows) =>
  (Array.isArray(allocRows) ? allocRows : []).reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);

// ------------------------------------------
// RETRO-FIFO: re-allocate ANY payment money that is unallocated
// OR stuck on dead/replaced invoices → onto live open invoices.
// Returns rows ready to INSERT into payment_allocations:
//   [{ payment_id, sale_id, contact_id, amount }, ...]
// ------------------------------------------
export const computeRetroAllocations = (history, allocations, opts) => {
  const o = defaultOpts(opts);
  const { payById, invoiceById } = indexHistory(history);

  // Valid allocations per invoice and per payment (orphans ignored → money freed)
  const map = {};
  const perPayment = {};
  (Array.isArray(allocations) ? allocations : []).forEach(a => {
    if (!isValidAlloc(a, payById, invoiceById)) return;
    const amt = parseFloat(a.amount) || 0;
    map[a.sale_id] = (map[a.sale_id] || 0) + amt;
    perPayment[a.payment_id] = (perPayment[a.payment_id] || 0) + amt;
  });

  const open = (Array.isArray(history) ? history : [])
    .filter(tx => tx.type === o.invoiceType && isActiveTx(tx) && !tx.replacedByTransactionId)
    .map(tx => ({
      saleId: tx.id,
      remaining: Math.max(0, (parseFloat(tx.amount) || 0) - (parseFloat(tx.paid) || 0) - (map[tx.id] || 0)),
      date: tx.created_at || tx.createdAt,
    }))
    .filter(x => x.remaining > TOL)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let openIdx = 0;
  const rows = [];
  (Array.isArray(history) ? history : [])
    .filter(tx =>
      tx.type === o.paymentType &&
      isActiveTx(tx) &&
      !(tx.note || '').startsWith('[FORGIVEN]') // forgiven money is never re-allocated
    )
    .sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt))
    .forEach(p => {
      let avail = (parseFloat(p.paid) || 0) - (perPayment[p.id] || 0);
      if (avail <= TOL) return; // fully allocated to live invoices already
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