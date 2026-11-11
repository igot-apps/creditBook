import { useState } from "react";
import { TransactionService } from "../services/TransactionService";
import { formatCurrency, formatDate } from "../utils/helpers";

export function CorrectionHistory({ transaction, history, currency, readOnly, onUndone }) {
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
