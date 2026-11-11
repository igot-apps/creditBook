const live = tx => tx && (!tx.status || tx.status === "active") && !tx.replaced_by_transaction_id && !tx.replacedByTransactionId;
const money = value => Number(value) || 0;

export const invoiceAccountBalance = (history, invoiceType, paymentType) =>
  history.reduce((balance, tx) => {
    if (!live(tx)) return balance;
    if (tx.type === invoiceType) return balance + money(tx.amount) - money(tx.paid);
    if (tx.type === paymentType) return balance - money(tx.paid);
    return balance;
  }, 0);

export function paymentCreditAvailable(tx, history, allocations) {
  if (!live(tx) || tx.credit_source_id || tx.payment_method === "write_off" || (tx.note || "").startsWith("[FORGIVEN]")) return 0;
  if (!["payment", "supplier_payment", "sale", "purchase"].includes(tx.type)) return 0;
  const invoiceType = ["sale", "payment"].includes(tx.type) ? "sale" : "purchase";
  const applied = allocations.reduce((sum, row) => {
    if (row.payment_id !== tx.id) return sum;
    const invoice = history.find(entry => entry.id === row.sale_id);
    return live(invoice) && invoice.type === invoiceType ? sum + money(row.amount) : sum;
  }, 0);
  const refunded = history.reduce((sum, row) => live(row) && row.credit_source_id === tx.id ? sum - money(row.paid) : sum, 0);
  return Math.max(0, money(tx.paid) - (tx.type === invoiceType ? money(tx.amount) : 0) - applied - refunded);
}
