// Read-only helpers that explain where money came from and went, using the
// existing transactions + payment_allocations data. Nothing here changes balances.
import { paymentCreditAvailable } from "./paymentCredit";
import { invoiceReference } from "./invoiceReference";

const money = value => Number(value) || 0;
export const isLive = tx => Boolean(tx) && (!tx.status || tx.status === "active") && !tx.replaced_by_transaction_id && !tx.replacedByTransactionId;
const correctsId = tx => tx?.corrects_transaction_id || tx?.correctsTransactionId || null;
const replacedById = tx => tx?.replaced_by_transaction_id || tx?.replacedByTransactionId || null;
const createdAt = tx => tx?.created_at || tx?.createdAt;
const isInvoice = tx => tx && (tx.type === "sale" || tx.type === "purchase");
export const isWriteOff = tx => tx && (tx.payment_method === "write_off" || tx.paymentMethod === "write_off" || (tx.note || "").startsWith("[FORGIVEN]"));

export const txReference = tx => {
  if (!tx) return "Entry";
  if (isInvoice(tx)) return invoiceReference(tx);
  return tx.reference || `PAY-${String(tx.id || "").slice(-6).toUpperCase()}`;
};
export const txWhen = tx => tx?.received_at || tx?.receivedAt || createdAt(tx);
export const cancelledAt = tx => tx?.cancelled_at || null;
export const cancelReason = tx => tx?.cancel_reason || tx?.cancelReason || "";

const byId = (history, id) => history.find(tx => tx.id === id);

/**
 * How the money on one allocation row reached the invoice.
 * - "payment": money from a payment, matched when that payment was recorded.
 * - "credit":  credit (an earlier payment's or invoice's leftover) used later.
 * - "mixed":   older rows where both happened on the same payment/invoice pair
 *              and the database kept a single combined amount. We cannot split
 *              it reliably, so we say so instead of guessing.
 */
export function allocationKind(row, history, allocations, depth = 0) {
  const ops = Array.isArray(row.credit_operation_ids) ? row.credit_operation_ids : [];
  const source = byId(history, row.payment_id);
  if (ops.length > 0) {
    if (source && !isInvoice(source)) {
      // Direct matches are written together with the payment; credit is used later.
      const rowTime = new Date(row.created_at).getTime();
      const sourceTime = new Date(createdAt(source)).getTime();
      if (Number.isFinite(rowTime) && Number.isFinite(sourceTime) && rowTime - sourceTime < 120000) return "mixed";
    }
    return "credit";
  }
  // Corrections copy rows onto the corrected entry without the credit marker:
  // inherit the kind from the row on the entry that was corrected.
  if (depth < 10) {
    const invoice = byId(history, row.sale_id);
    const prevInvoice = correctsId(invoice);
    const prevPayment = correctsId(source);
    const previous = allocations.find(a =>
      (prevInvoice && a.sale_id === prevInvoice && a.payment_id === row.payment_id) ||
      (prevPayment && a.payment_id === prevPayment && a.sale_id === row.sale_id));
    if (previous) return allocationKind(previous, history, allocations, depth + 1);
  }
  return "payment";
}

/** Breakdown of how one invoice has been paid, plus payments whose cancellation reopened it. */
export function invoiceFunding(invoice, history, allocations) {
  const rows = allocations.filter(a => a.sale_id === invoice.id);
  const applied = [];
  const reopened = [];
  rows.forEach(row => {
    const source = byId(history, row.payment_id);
    if (!source) return;
    if (isLive(source)) {
      applied.push({ row, source, amount: money(row.amount), kind: isWriteOff(source) ? "write_off" : allocationKind(row, history, allocations) });
      return;
    }
    if (source.status !== "cancelled") return;
    // A corrected payment that still covers this invoice is a move, not a reopening.
    const replacement = byId(history, replacedById(source));
    const moved = replacement && allocations.some(a => a.payment_id === replacement.id && a.sale_id === invoice.id);
    if (moved) return;
    reopened.push({ row, source, amount: money(row.amount), replacement, at: cancelledAt(source), reason: cancelReason(source) });
  });
  const sum = kind => applied.filter(entry => entry.kind === kind).reduce((total, entry) => total + entry.amount, 0);
  const paidOnInvoice = Math.min(money(invoice.paid), money(invoice.amount));
  const fromPayments = sum("payment");
  const fromCredit = sum("credit");
  const fromMixed = sum("mixed");
  const forgiven = sum("write_off");
  const due = Math.max(0, money(invoice.amount) - money(invoice.paid) - fromPayments - fromCredit - fromMixed - forgiven);
  return { applied, reopened, paidOnInvoice, fromPayments, fromCredit, fromMixed, forgiven, due };
}

/** Chronological trail for money paid in (a payment, or an overpaid invoice). */
export function moneyTrail(source, history, allocations) {
  const start = isInvoice(source) ? Math.max(0, money(source.paid) - money(source.amount)) : money(source.paid);
  const steps = [];
  allocations.filter(a => a.payment_id === source.id).forEach(row => {
    const invoice = byId(history, row.sale_id);
    if (!invoice) return;
    if (isLive(invoice)) {
      steps.push({ type: "used", at: row.created_at, amount: money(row.amount), target: invoice, kind: allocationKind(row, history, allocations) });
    } else if (invoice.status === "cancelled" && !replacedById(invoice)) {
      steps.push({ type: "returned", at: cancelledAt(invoice), amount: money(row.amount), target: invoice, reason: cancelReason(invoice) });
    }
  });
  history.filter(tx => tx.credit_source_id === source.id && isLive(tx)).forEach(refund => {
    steps.push({ type: "refund", at: txWhen(refund), amount: Math.abs(money(refund.paid)), target: refund });
  });
  steps.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));
  const left = paymentCreditAvailable(source, history, allocations);
  return { start, steps, left };
}

/** One-line summary for a row in the history list. */
export function historySummary(tx, history, allocations) {
  if (!isLive(tx) || tx.credit_source_id || isWriteOff(tx)) return [];
  if (isInvoice(tx)) {
    const f = invoiceFunding(tx, history, allocations);
    const parts = [];
    if (f.paidOnInvoice > 0.009) parts.push({ label: "Paid on invoice", amount: f.paidOnInvoice });
    if (f.fromPayments + f.fromMixed > 0.009) parts.push({ label: "Later payments", amount: f.fromPayments + f.fromMixed });
    if (f.fromCredit > 0.009) parts.push({ label: "Credit used", amount: f.fromCredit });
    if (f.forgiven > 0.009) parts.push({ label: "Forgiven", amount: f.forgiven });
    parts.push(f.due > 0.009 ? { label: "Due", amount: f.due, tone: "due" } : { label: "Fully paid", tone: "paid" });
    if (f.reopened.length) parts.push({ label: "Owed again after cancelled payment", amount: f.reopened.reduce((s, r) => s + r.amount, 0), tone: "due" });
    return parts;
  }
  const trail = moneyTrail(tx, history, allocations);
  const used = trail.steps.filter(step => step.type === "used").reduce((s, step) => s + step.amount, 0);
  const parts = [];
  if (used > 0.009) parts.push({ label: "Used on invoices", amount: used });
  if (trail.left > 0.009) parts.push({ label: "Credit left", amount: trail.left, tone: "credit" });
  return parts;
}
