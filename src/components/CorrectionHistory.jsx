import { useState } from "react";
import { TransactionService } from "../services/TransactionService";
import { formatCurrency, formatDate } from "../utils/helpers";

const money = value => Number(value) || 0;
const live = tx => Boolean(tx) && (!tx.status || tx.status === "active") && !tx.replaced_by_transaction_id && !tx.replacedByTransactionId;

// Effect of a correction at the time it was saved, from the allocation snapshot the
// database stores with it. Returns null when there is no snapshot (nothing is guessed).
function correctionEffect(transaction, original, history, allocations) {
  const snapshot = transaction.correction_allocations;
  if (!original || !Array.isArray(snapshot) || !Array.isArray(allocations)) return null;
  const isInvoice = transaction.type === "sale" || transaction.type === "purchase";
  const key = isInvoice ? "sale_id" : "payment_id";
  const otherKey = isInvoice ? "payment_id" : "sale_id";
  const carriedRows = snapshot.filter(row => row[key] === transaction.id);
  const carriedIds = new Set(carriedRows.map(row => row[otherKey]));
  const carried = carriedRows.reduce((sum, row) => sum + money(row.amount), 0);
  const beforeRows = allocations.filter(row => row[key] === original.id
    && (carriedIds.has(row[otherKey]) || live(history.find(tx => tx.id === row[otherKey]))));
  const beforeApplied = beforeRows.reduce((sum, row) => sum + money(row.amount), 0);
  if (!isInvoice) return { isInvoice, before: beforeApplied, after: carried };
  return {
    isInvoice,
    before: Math.max(0, money(original.amount) - money(original.paid) - beforeApplied),
    after: Math.max(0, money(transaction.amount) - money(transaction.paid) - carried),
    carried,
    released: Math.max(0, beforeApplied - carried),
  };
}

export function CorrectionHistory({ transaction, history, allocations, currency, readOnly, onUndone }) {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const originalId = transaction.correctsTransactionId || transaction.corrects_transaction_id;
  if (!originalId) return null;
  const original = history?.find(entry => entry.id === originalId);
  const undone = transaction.correction_undone_at;
  const canUndo = onUndone && !readOnly && transaction.corrected_at && !undone
    && (!transaction.status || transaction.status === "active") && !transaction.replacedByTransactionId;
  const originalNumber = originalId.slice(-6).toUpperCase();
  const effect = correctionEffect(transaction, original, history || [], allocations);

  const undo = async () => {
    setSaving(true);
    setError("");
    try {
      await TransactionService.undoCorrection(transaction.id);
      await onUndone();
    } catch (failure) {
      setError(failure.message || "Could not undo the correction. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
      <summary className="cursor-pointer font-semibold">Correction history</summary>
      <div className="mt-2 space-y-2">
        <p>Original entry #{originalNumber}</p>
        <p>Corrected {formatDate(transaction.corrected_at || transaction.created_at)}</p>
        {(transaction.correction_reason || original?.cancel_reason) && <p>Reason: {transaction.correction_reason || original.cancel_reason}</p>}
        {original && Number(original.amount) !== Number(transaction.amount) && <p>Invoice total {formatCurrency(original.amount, currency)} → {formatCurrency(transaction.amount, currency)}</p>}
        {original && Number(original.paid) !== Number(transaction.paid) && <p>Amount paid {formatCurrency(original.paid, currency)} → {formatCurrency(transaction.paid, currency)}</p>}
        {effect && effect.isInvoice && (
          <>
            <p>Balance due {formatCurrency(effect.before, currency)} → {formatCurrency(effect.after, currency)}</p>
            {effect.carried > 0.009 && <p>Payments and credit moved to the corrected invoice: {formatCurrency(effect.carried, currency)}</p>}
            {effect.released > 0.009 && <p>{formatCurrency(effect.released, currency)} of earlier payments was no longer needed and became credit again.</p>}
          </>
        )}
        {effect && !effect.isInvoice && (
          <>
            <p>Used on invoices {formatCurrency(effect.before, currency)} → {formatCurrency(effect.after, currency)}</p>
            {effect.before - effect.after > 0.009 && <p>{formatCurrency(effect.before - effect.after, currency)} is owed again on the invoices this payment had covered.</p>}
          </>
        )}
        {undone && <p>Correction undone {formatDate(undone)}</p>}
        {canUndo && !confirming && <button type="button" onClick={() => setConfirming(true)} className="min-h-11 font-semibold text-indigo-700 dark:text-indigo-300">Undo correction</button>}
        {canUndo && confirming && (
          <div className="space-y-2">
            <p>This restores entry #{originalNumber} and voids this version.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={saving} onClick={() => setConfirming(false)} className="min-h-11 rounded-lg border px-3">Keep correction</button>
              <button type="button" disabled={saving} onClick={undo} className="min-h-11 rounded-lg bg-indigo-700 px-3 font-semibold text-white disabled:opacity-60">{saving ? "Undoing…" : "Confirm undo"}</button>
            </div>
          </div>
        )}
        {error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
      </div>
    </details>
  );
}
