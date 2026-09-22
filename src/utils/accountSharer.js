import { formatCurrency } from "./helpers";
import { buildAllocationMap, buildAllocationBreakdown, saleRemaining } from "./allocation";

// ==========================================
// ACCOUNT STATEMENT GENERATOR (WhatsApp / SMS)
// Single source of truth: uses the SAME allocation math as the
// profile page and receipts, so statements always agree with them.
// ==========================================
export const generateAccountShare = ({ channel, scope, contact, transactions, store, allocations = [] }) => {
  const currency = store?.currency || "GH₵";
  const storeName = store?.name || "Store";

  // 1. Active, non-replaced transactions only
  const activeTx = (Array.isArray(transactions) ? transactions : [])
    .filter(tx => (tx.status === 'active' || !tx.status) && !tx.replacedByTransactionId);

  // 2. Chronological order (oldest first, like a real bank statement)
  const sortedTx = [...activeTx].sort((a, b) =>
    new Date(a.created_at || a.createdAt || 0) - new Date(b.created_at || b.createdAt || 0)
  );

  // 3. Apply the selected scope limit
  let scopedTx = sortedTx;
  if (scope === 'last5') scopedTx = sortedTx.slice(-5);
  else if (scope === 'last10') scopedTx = sortedTx.slice(-10);
  else if (scope === 'balance') scopedTx = [];
  // 'full' keeps all sortedTx

  // 4. Allocation-aware per-invoice math (same utils as profile & receipts)
  const allocationMap = buildAllocationMap(allocations, activeTx);
  const breakdown = buildAllocationBreakdown(allocations, activeTx);

  // 5. Aggregate totals (same rule as the balance card)
  let totalSales = 0;
  let totalPaid = 0;
  let totalForgiven = 0;
  activeTx.forEach(tx => {
    const amt = parseFloat(tx.amount) || 0;
    const pd = parseFloat(tx.paid) || 0;
    if (tx.type === 'sale' || tx.type === 'purchase') {
      totalSales += amt;
      totalPaid += pd;
    } else if (tx.type === 'payment' || tx.type === 'supplier_payment') {
      if ((tx.note || '').startsWith('[FORGIVEN]')) totalForgiven += pd;
      else totalPaid += pd;
    }
  });
  const outstanding = Math.max(0, totalSales - totalPaid - totalForgiven);

  // 6. Build the message
  const L = [];
  L.push(`🏪 *${storeName.toUpperCase()}*`);
  if (store?.owner_name || store?.ownerName) L.push(`${store.owner_name || store.ownerName}`);
  if (store?.phone) L.push(`Tel: ${store.phone}`);
  L.push("");
  L.push(`Hello *${contact?.name || "Customer"}*, here is your account statement:`);
  L.push("");

  // Itemized transactions
  if (scope !== 'balance') {
    scopedTx.forEach(tx => {
      const date = new Date(tx.created_at || tx.createdAt || Date.now()).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
      if (tx.type === 'sale' || tx.type === 'purchase') {
        L.push(`🛒 *${tx.type === 'sale' ? 'SALE' : 'PURCHASE'} — ${date}*`);
        const items = Array.isArray(tx.items) ? tx.items : [];
        if (items.length > 0) {
          items.forEach(i => {
            const qty = parseFloat(i.quantity) || 0;
            const price = parseFloat(i.price) || 0;
            const unit = i.unitName || "unit";
            const brand = i.brand ? ` (${i.brand})` : "";
            L.push(`• *${i.name}*${brand}`);
            L.push(`  ${qty} ${unit} × ${formatCurrency(price, currency)} = ${formatCurrency(qty * price, currency)}`);
          });
        } else {
          L.push(`• (No item breakdown recorded)`);
        }
        const amt = parseFloat(tx.amount) || 0;
        const upfront = parseFloat(tx.paid) || 0;
        const paidLater = (breakdown.paid && breakdown.paid[tx.id]) || 0;
        const forgivenOn = (breakdown.forgiven && breakdown.forgiven[tx.id]) || 0;
        const remaining = saleRemaining(tx, allocationMap);
        L.push(`Total: ${formatCurrency(amt, currency)} | Paid: ${formatCurrency(upfront + paidLater, currency)} | Balance: ${formatCurrency(remaining, currency)}`);
        if (forgivenOn > 0.009) L.push(`🤝 Forgiven: ${formatCurrency(forgivenOn, currency)}`);
        if (tx.note && !(tx.note || '').startsWith('[FORGIVEN]')) L.push(`📝 ${tx.note}`);
        L.push("");
      } else if (tx.type === 'payment' || tx.type === 'supplier_payment') {
        const isWriteOff = (tx.note || '').startsWith('[FORGIVEN]');
        if (isWriteOff) {
          const reason = (tx.note || '').replace('[FORGIVEN] ', '').trim();
          L.push(`🤝 *FORGIVEN — ${date}*`);
          L.push(`Amount: ${formatCurrency(parseFloat(tx.paid) || 0, currency)}${reason ? ` (${reason})` : ""}`);
        } else {
          const method = tx.payment_method || tx.paymentMethod || "Cash";
          L.push(`💵 *PAYMENT — ${date}*`);
          L.push(`Received: ${formatCurrency(parseFloat(tx.paid) || 0, currency)} (${method})`);
        }
        L.push("");
      }
    });
    L.push("──────────────────");
  }

  // Summary (always included)
  L.push(`*SUMMARY*`);
  L.push(`Total Billed: ${formatCurrency(totalSales, currency)}`);
  L.push(`Total Paid: ${formatCurrency(totalPaid, currency)}`);
  if (totalForgiven > 0.009) L.push(`🤝 Total Forgiven: ${formatCurrency(totalForgiven, currency)}`);
  L.push(`*OUTSTANDING BALANCE: ${formatCurrency(outstanding, currency)}*`);
  L.push("");
  L.push("Thank you for your business! 🙏");
  return L.join("\n");
};