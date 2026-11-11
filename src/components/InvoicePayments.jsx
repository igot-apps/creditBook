import { useId, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { formatCurrency, formatDate } from "../utils/helpers";

export const InvoicePayments = ({ paid, invoicePayments = [], total, currency, onChange, isPurchase = false }) => {
  const titleId = useId();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const paymentDialog = useRef(null);

  const amountPaid = Number(paid) || 0;
  const balanceRemaining = Math.max(0, total - amountPaid);
  const earlierPaid = Math.max(0, amountPaid - invoicePayments.reduce((sum, payment) => sum + payment.amount, 0));

  const addPayment = () => {
    const amount = Number(paymentAmount);
    const paymentDetail = paymentReference.trim();
    const reference = paymentMethod === "momo" ? paymentDetail.toUpperCase() : "";
    const date = paymentDate ? new Date(paymentDate) : new Date();
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Enter a positive payment amount.");
      return;
    }
    if (paymentMethod === "momo" && !reference) { setPaymentError("Enter the MoMo transaction ID."); return; }
    if (reference && invoicePayments.some(payment => payment.reference === reference)) {
      setPaymentError("This reference is already on the invoice.");
      return;
    }
    if (!Number.isFinite(date.getTime()) || date > new Date()) {
      setPaymentError("Enter a valid payment date.");
      return;
    }
    const payment = {
      id: crypto.randomUUID(),
      amount,
      method: paymentMethod,
      reference,
      paidBy: paymentMethod === "cash" ? paymentDetail : "",
      receivedAt: date.toISOString(),
    };
    onChange((amountPaid + amount).toFixed(2), [...invoicePayments, payment]);
    paymentDialog.current.close();
  };

  const resetPaymentForm = () => {
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentReference("");
    setPaymentDate("");
    setPaymentError("");
  };

  const removePayment = (payment) => {
    onChange(
      Math.max(0, amountPaid - payment.amount).toFixed(2),
      invoicePayments.filter(entry => entry.id !== payment.id),
    );
  };

  return (
    <>
      <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
        <div className="flex justify-between text-sm font-semibold">
          <span>Amount paid</span><span>{formatCurrency(amountPaid, currency)}</span>
        </div>
        {earlierPaid > 0.009 && <p className="text-xs text-gray-500">Previously recorded payment · {formatCurrency(earlierPaid, currency)}</p>}
        {invoicePayments.map(payment => (
          <div key={payment.id} className="flex items-center justify-between gap-2 text-sm">
            <div className="min-w-0 break-words">
              <strong>{formatCurrency(payment.amount, currency)}</strong>{payment.method && ` · ${payment.method === "cash" ? "Cash" : "MoMo"}`}{payment.reference && ` · ${payment.reference}`}
              {payment.paidBy && <p className="text-xs">Paid by {payment.paidBy}</p>}
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(payment.receivedAt)}</p>
            </div>
            <button type="button" aria-label={`Remove payment ${payment.reference || formatCurrency(payment.amount, currency)}`} onClick={() => removePayment(payment)} className="p-2 text-red-600"><X size={16} /></button>
          </div>
        ))}
        {total > 0 && (
          <button type="button" onClick={() => paymentDialog.current.showModal()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
            <Plus size={16} /> Add payment
          </button>
        )}
        {amountPaid > total + 0.009 && (
          <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{formatCurrency(amountPaid - total, currency)} credit once the invoice is finalized.</p>
        )}
      </div>
      <dialog ref={paymentDialog} onClose={resetPaymentForm} aria-labelledby={titleId} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white p-0 text-gray-900 shadow-xl backdrop:bg-black/50 dark:bg-gray-900 dark:text-white">
        <form onSubmit={event => { event.preventDefault(); addPayment(); }} className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-lg font-bold">Add payment</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{formatCurrency(balanceRemaining, currency)} remaining</p>
            </div>
            <button type="button" aria-label="Close payment form" onClick={() => paymentDialog.current.close()} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
          </div>
          <label className="block text-sm font-medium">{isPurchase ? "Amount paid" : "Amount received"}
            <input autoFocus required type="number" min="0.01" step="0.01" inputMode="decimal" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2.5 dark:border-gray-600 dark:bg-gray-800" />
          </label>
          {Number(paymentAmount) > balanceRemaining + 0.009 && (
            <p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
              {formatCurrency(balanceRemaining, currency)} applied here · {formatCurrency(Number(paymentAmount) - balanceRemaining, currency)} credit once finalized
            </p>
          )}
          <label className="block text-sm font-medium">Payment method
            <select value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setPaymentReference(""); setPaymentError(""); }} className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2.5 dark:border-gray-600 dark:bg-gray-800">
              <option value="cash">Cash</option>
              <option value="momo">MoMo</option>
            </select>
          </label>
          <label className="block text-sm font-medium">{paymentMethod === "momo" ? "MoMo transaction ID" : "Paid by (optional)"}
            <input required={paymentMethod === "momo"} placeholder={paymentMethod === "cash" ? "Name of the person who paid" : undefined} value={paymentReference} onChange={e => setPaymentReference(e.target.value)} className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2.5 dark:border-gray-600 dark:bg-gray-800" />
          </label>
          <label className="block text-sm font-medium">{isPurchase ? "Date paid" : "Date received"}
            <input type="datetime-local" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="mt-1 block w-full min-w-0 rounded-xl border border-gray-300 px-3 py-2.5 dark:border-gray-600 dark:bg-gray-800" />
            <span className="mt-1 block text-xs font-normal text-gray-500 dark:text-gray-400">Leave blank to use the current date and time.</span>
          </label>
          {paymentError && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{paymentError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => paymentDialog.current.close()} className="rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
            <button type="submit" className="rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800">Add payment</button>
          </div>
        </form>
      </dialog>

    </>
  );
};
