import { formatCurrency } from "./helpers";

export const generateAccountShare = ({ channel, scope, contact, transactions, store }) => {
  const currency = store?.currency || "GH₵";
  const storeName = store?.name || "Store";
  
  // 1. Filter only active transactions
  const activeTx = (Array.isArray(transactions) ? transactions : [])
    .filter(tx => tx.status === 'active' || !tx.status);

  // 2. Sort chronologically (oldest first, like a real bank statement)
  const sortedTx = [...activeTx].sort((a, b) => 
    new Date(a.created_at || a.createdAt || 0) - new Date(b.created_at || b.createdAt || 0)
  );

  // 3. Apply the selected Scope limit
  let scopedTx = sortedTx;
  if (scope === 'last5') {
    scopedTx = sortedTx.slice(-5); // Take the 5 most recent
  } else if (scope === 'last10') {
    scopedTx = sortedTx.slice(-10); // Take the 10 most recent
  } else if (scope === 'balance') {
    scopedTx = []; // No individual transactions, just the summary
  }
  // 'full' keeps all sortedTx

  // 4. Calculate totals based on ALL active transactions (so the final balance is always accurate)
  let totalSales = 0;
  let totalPaid = 0;
  activeTx.forEach(tx => {
    const amt = parseFloat(tx.amount) || 0;
    const pd = parseFloat(tx.paid) || 0;
    if (tx.type === 'sale' || tx.type === 'purchase') {
      totalSales += amt;
      totalPaid += pd;
    } else if (tx.type === 'payment' || tx.type === 'supplier_payment') {
      totalPaid += pd;
    }
  });
  const outstanding = Math.max(0, totalSales - totalPaid);

  // 5. Build the Message
  const L = [];
  
  // Header
  L.push(`🏪 *${storeName.toUpperCase()}*`);
  if (store?.owner_name || store?.ownerName) L.push(`${store.owner_name || store.ownerName}`);
  if (store?.phone) L.push(`Tel: ${store.phone}`);
  L.push("");
  L.push(`Hello *${contact?.name || "Customer"}*, here is your account statement:`);
  L.push("");

  // Itemized Transactions
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
            // Two-line format per item for clean mobile reading
            L.push(`• *${i.name}*${brand}`);
            L.push(`  ${qty} ${unit} × ${formatCurrency(price, currency)} = ${formatCurrency(qty * price, currency)}`);
          });
        } else {
          L.push(`• (No item breakdown recorded)`);
        }
        
        const amt = parseFloat(tx.amount) || 0;
        const pd = parseFloat(tx.paid) || 0;
        L.push(`Total: ${formatCurrency(amt, currency)} | Paid: ${formatCurrency(pd, currency)} | Balance: ${formatCurrency(Math.max(0, amt - pd), currency)}`);
        if (tx.note) L.push(`📝 ${tx.note}`);
        L.push("");
      } else if (tx.type === 'payment' || tx.type === 'supplier_payment') {
        const method = tx.payment_method || tx.paymentMethod || "Cash";
        L.push(`💵 *PAYMENT — ${date}*`);
        L.push(`Received: ${formatCurrency(parseFloat(tx.paid) || 0, currency)} (${method})`);
        L.push("");
      }
    });
    L.push("──────────────────");
  }

  // Summary (Always included)
  L.push(`*SUMMARY*`);
  L.push(`Total Billed: ${formatCurrency(totalSales, currency)}`);
  L.push(`Total Paid: ${formatCurrency(totalPaid, currency)}`);
  L.push(`*OUTSTANDING BALANCE: ${formatCurrency(outstanding, currency)}*`);
  L.push("");
  L.push("Thank you for your business! 🙏");

  return L.join("\n");
};