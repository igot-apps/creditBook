import { useId, useRef, useState } from "react";
import { AllocationService } from "../services/AllocationService";
import { formatCurrency, formatDate } from "../utils/helpers";
import { paymentCreditAvailable } from "../utils/paymentCredit";

const live = tx => tx && (!tx.status || tx.status === "active") && !tx.replaced_by_transaction_id && !tx.replacedByTransactionId;
const money = value => Number(value) || 0;
const number = tx => `#${tx.id.slice(-6).toUpperCase()}`;
const fieldClass = "mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2.5 dark:border-gray-700 dark:bg-gray-900";

export function PaymentCredit({ history, allocations, invoices, currency, isSupplier = false, readOnly, onSaved }) {
  const dialog = useRef(null);
  const titleId = useId();
  const operationId = useRef(null);
  const [source, setSource] = useState(null);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [saving, setSaving] = useState(false);
  const invoiceType = isSupplier ? "purchase" : "sale";
  const refunds = history.filter(tx => live(tx) && tx.credit_source_id);
  const sources = history
    .map(tx => ({ ...tx, available: paymentCreditAvailable(tx, history, allocations) }))
    .filter(tx => tx.available > 0.009);
  const totalCredit = sources.reduce((sum, tx) => sum + tx.available, 0);
  const isRefund = invoiceId === "refund";
  const selectedInvoice = invoices.find(invoice => invoice.id === invoiceId);
  const max = Math.min(source?.available || 0, selectedInvoice?.trueOutstanding ?? Infinity);

  function open(tx, refund) {
    setSource(tx);
    setInvoiceId(refund ? "refund" : "");
    setAmount("");
    setReference("");
    setDate("");
    setError("");
    operationId.current = crypto.randomUUID();
    dialog.current.showModal();
  }

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    const value = Number(amount);
    const received = date ? new Date(date) : new Date();
    if (!(value > 0 && value <= max + 0.00001) || (!isRefund && !selectedInvoice)) {
      setError("Enter an amount within the available credit and invoice balance.");
      return;
    }
    if (isRefund && (!reference.trim() || !Number.isFinite(received.getTime()) || received > new Date())) {
      setError("Enter the refund reference and a valid date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await AllocationService.useCredit({
        sourceId: source.id,
        invoiceId: isRefund ? null : invoiceId,
        amount: value,
        operationId: operationId.current,
        reference: isRefund ? reference.trim() : null,
        receivedAt: isRefund ? received.toISOString() : null,
      });
      dialog.current.close();
      await onSaved().catch(() => setRefreshError("Credit was saved. Reopen the profile to refresh the balance."));
    } catch (failure) {
      setError(failure.message || "Could not save credit.");
    } finally {
      setSaving(false);
    }
  }

  if (sources.length === 0 && refunds.length === 0) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-indigo-200 bg-white p-4 dark:border-indigo-900 dark:bg-gray-800">
      <div className="flex justify-between gap-3 font-bold">
        <h2>{isSupplier ? "Credit with supplier" : "Customer credit available"}</h2>
        <span>{formatCurrency(totalCredit, currency)}</span>
      </div>
      {sources.map(tx => (
        <div key={tx.id} className="space-y-2 border-t border-gray-200 pt-3 text-sm dark:border-gray-700">
          <div className="flex justify-between gap-3">
            <span>{tx.type === invoiceType ? "Invoice" : "Payment"} {number(tx)}</span>
            <strong>{formatCurrency(tx.available, currency)}</strong>
          </div>
          <p className="break-words text-xs text-gray-500 dark:text-gray-400">
            {[formatDate(tx.received_at || tx.created_at), tx.reference].filter(Boolean).join(" · ")}
          </p>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              {invoices.some(invoice => invoice.id !== tx.id) && <button type="button" onClick={() => open(tx, false)} className="rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white">Apply credit</button>}
              <button type="button" onClick={() => open(tx, true)} className="rounded-lg border border-gray-300 px-3 py-2 font-semibold dark:border-gray-600">Record refund</button>
            </div>
          )}
        </div>
      ))}
      {refunds.length > 0 && (
        <div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
          <h3 className="text-sm font-semibold">{isSupplier ? "Refunds received" : "Refunds returned"}</h3>
          {refunds.map(tx => (
            <div key={tx.id} className="text-xs text-gray-600 dark:text-gray-300">
              {formatCurrency(-money(tx.paid), currency)} · {formatDate(tx.received_at || tx.created_at)} · {tx.reference} · From {number({ id: tx.credit_source_id })}
            </div>
          ))}
        </div>
      )}
      {refreshError && <p role="alert" className="text-sm text-red-600">{refreshError}</p>}
      <dialog ref={dialog} aria-labelledby={titleId} onCancel={event => { if (saving) event.preventDefault(); }} className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl bg-white p-5 text-gray-900 shadow-xl backdrop:bg-black/50 dark:bg-gray-800 dark:text-white">
        <form onSubmit={save} className="space-y-4">
          <h2 id={titleId} className="text-lg font-bold">{isRefund ? "Record refund" : "Apply credit"}</h2>
          <p className="text-sm">{formatCurrency(source?.available, currency)} available from {source && number(source)}</p>
          {!isRefund && (
            <label className="block text-sm">Invoice
              <select className={fieldClass} required value={invoiceId} onChange={event => setInvoiceId(event.target.value)}>
                <option value="">Choose an invoice</option>
                {invoices.filter(tx => tx.id !== source?.id).map(tx => (
                  <option key={tx.id} value={tx.id}>{number(tx)} · {formatDate(tx.created_at)} · {formatCurrency(tx.trueOutstanding, currency)} due</option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">Amount
            <input className={fieldClass} type="number" inputMode="decimal" min="0.01" max={max.toFixed(2)} step="0.01" required value={amount} onChange={event => setAmount(event.target.value)} />
          </label>
          {selectedInvoice && <p className="text-sm">Invoice balance after credit {formatCurrency(Math.max(0, selectedInvoice.trueOutstanding - money(amount)), currency)}</p>}
          {isRefund && (
            <>
              <label className="block text-sm">Refund reference<input className={fieldClass} required value={reference} onChange={event => setReference(event.target.value)} /></label>
              <label className="block text-sm">{isSupplier ? "Date received" : "Date returned"}<input className={fieldClass} type="datetime-local" value={date} onChange={event => setDate(event.target.value)} /></label>
            </>
          )}
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" disabled={saving} onClick={() => dialog.current.close()} className="rounded-lg px-4 py-2">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : isRefund ? "Save refund" : "Apply credit"}</button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
