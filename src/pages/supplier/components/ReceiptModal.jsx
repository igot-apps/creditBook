import { CorrectionHistory } from "../../../components/CorrectionHistory";
import { FileText, Ban, Smartphone, CreditCard, Banknote, Share2, Edit3, X, Link2 } from "lucide-react";
import { formatCurrency, formatDate } from "../../../utils/helpers";
import { openWhatsApp } from "../../../utils/communication";
import { txDate, isActive, purchaseLabel } from "../utils/helpers";
import { paymentCreditAvailable } from "../../../utils/paymentCredit";

export const ReceiptModal = ({ tx, supplier, currentStore, onClose, onFix, onCancel, onPayment, currency, history, allocations, readOnly, onCorrectionUndone }) => {
  if (!tx) return null;
  const items = Array.isArray(tx.items) ? tx.items : [];
  const totalPurchase = parseFloat(tx.amount) || 0;
  const discount = parseFloat(tx.discount) || 0;
  const paid = parseFloat(tx.paid) || 0;
  const receiptNo = (tx.id || "000000").slice(-6).toUpperCase();
  const isPayment = tx.type === 'supplier_payment';
  const documentLabel = isPayment ? "Receipt" : "Invoice";
  const isRefund = Boolean(tx.credit_source_id);
  const creditAvailable = paymentCreditAvailable(tx, history || [], allocations || []);
  const hasRefunds = (history || []).some(row => row.credit_source_id === tx.id && isActive(row));
  const method = tx.paymentMethod;
  const invoicePayments = tx.invoice_payments || [];
  const invoicePaymentDetails = payment => [
    formatDate(payment.receivedAt),
    { cash: "Cash", momo: "MoMo" }[payment.method],
    payment.reference,
    payment.paidBy && `Paid by ${payment.paidBy}`,
  ].filter(Boolean).join(" · ");

  const payById = (id) => (Array.isArray(history) ? history : []).find(p => p.id === id);
  const purchaseById = (id) => (Array.isArray(history) ? history : []).find(s => s.id === id);

  const appliedToThisPurchase = !isPayment
    ? (Array.isArray(allocations) ? allocations : []).filter(a => {
        const payment = payById(a.payment_id);
        return a.sale_id === tx.id && payment && ['supplier_payment', 'purchase'].includes(payment.type) && isActive(payment) && !payment.replacedByTransactionId;
      })
    : [];
  const appliedByThisPayment = isPayment
    ? (Array.isArray(allocations) ? allocations : []).filter(a => a.payment_id === tx.id)
    : [];
  const appliedTotal = appliedToThisPurchase.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const trueOutstanding = Math.max(0, totalPurchase - paid - appliedTotal);

  const handleShare = () => {
    const L = [];
    L.push(`${currentStore?.name || "Store"}`);
    if (currentStore?.owner_name || currentStore?.ownerName) L.push(currentStore?.owner_name || currentStore?.ownerName);
    if (currentStore?.phone) L.push(`Tel: ${currentStore.phone}`);
    L.push("──────────────────────");
    L.push(`${documentLabel} #: ${receiptNo}`);
    L.push(`Date: ${formatDate(tx.received_at || txDate(tx))}`);
    L.push(`Supplier: ${supplier?.name || "—"}`);
    L.push("──────────────────────");
    if (isPayment) {
      L.push(`${isRefund ? "REFUND RECEIVED" : "PAYMENT MADE"}: ${formatCurrency(Math.abs(paid), currency)}`);
      if (isRefund) L.push(`Original payment or invoice #${tx.credit_source_id.slice(-6).toUpperCase()}`);
      if (method) L.push(`Method: ${method}`);
      if (tx.reference) L.push(`Payment reference: ${tx.reference}`);
      if (appliedByThisPayment.length > 0) {
        appliedByThisPayment.forEach(a => {
          const s = purchaseById(a.sale_id);
          L.push(`  → ${s ? purchaseLabel(s) : "Invoice"}: ${formatCurrency(parseFloat(a.amount) || 0, currency)}`);
        });
      }
    } else {
      if (items.length > 0) {
        items.forEach(i => {
          const qty = parseFloat(i.quantity) || 0;
          const price = parseFloat(i.price) || 0;
          L.push(`${i.name}${i.brand ? ` (${i.brand})` : ""}`);
          L.push(i.isQuickInvoice ? `  Quick invoice total: ${formatCurrency(qty * price, currency)}` : `  ${qty} ${i.unitName || ""} x ${formatCurrency(price, currency)} = ${formatCurrency(qty * price, currency)}`);
          if (i.note) L.push(`  Note: ${i.note}`);
        });
      } else {
        L.push("(No item breakdown recorded)");
      }
      L.push("──────────────────────");
      L.push(`TOTAL: ${formatCurrency(totalPurchase, currency)}`);
      if (discount > 0) L.push(`Discount: ${formatCurrency(discount, currency)}`);
      L.push(`PAID UPFRONT: ${formatCurrency(paid, currency)}`);
      if (paid > totalPurchase + 0.009) L.push(`Applied to this invoice upfront: ${formatCurrency(totalPurchase, currency)}`);
      invoicePayments.forEach(payment => {
        L.push(`  ${invoicePaymentDetails(payment)} · ${formatCurrency(payment.amount, currency)}`);
      });
      if (appliedTotal > 0) L.push(`PAID VIA PAYMENTS: ${formatCurrency(appliedTotal, currency)}`);
      appliedToThisPurchase.forEach(a => {
        const payment = payById(a.payment_id);
        L.push(`  ${[formatDate(txDate(payment)), payment.reference, formatCurrency(a.amount, currency)].filter(Boolean).join(" · ")}`);
      });
      L.push(`OUTSTANDING: ${formatCurrency(trueOutstanding, currency)}`);
    }
    if (creditAvailable > 0.009) L.push(`Credit available from this ${documentLabel.toLowerCase()}: ${formatCurrency(creditAvailable, currency)}`);
    if (tx.note) L.push(`Note: ${tx.note}`);
    if (tx.status === 'cancelled') L.push(`🚫 CANCELLED: ${tx.cancel_reason || tx.cancelReason || ""}`);
    L.push("");
    L.push("Thank you for your business! 🙏");
    openWhatsApp(supplier?.phone || "", L.join("\n"));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-50 dark:bg-gray-950 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl app-sheet flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={20} className={isPayment ? "text-blue-600" : "text-indigo-600"} />
            {isRefund ? "Refund Receipt" : isPayment ? "Payment Receipt" : "Purchase Invoice"}
          </h3>
          <button aria-label={`Close ${documentLabel.toLowerCase()}`} onClick={onClose} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full"><X size={18} className="text-gray-600 dark:text-gray-300" /></button>
        </div>
        <div className="app-scroll-region min-h-0 flex-1 overflow-y-auto p-5 space-y-4">
          {tx.status === 'cancelled' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
              <p className="font-bold text-red-600 dark:text-red-400 text-sm flex items-center justify-center gap-2"><Ban size={14} /> CANCELLED</p>
              {(tx.cancel_reason || tx.cancelReason) && <p className="text-xs text-red-500 mt-1">{tx.cancel_reason || tx.cancelReason}</p>}
            </div>
          )}
          <div className="text-center">
            <p className="font-bold text-lg text-gray-900 dark:text-white">{currentStore?.name || "My Store"}</p>
            {(currentStore?.owner_name || currentStore?.ownerName) && <p className="text-xs text-gray-500 dark:text-gray-400">{currentStore?.owner_name || currentStore?.ownerName}</p>}
            {currentStore?.phone && <p className="text-xs text-gray-500 dark:text-gray-400">Tel: {currentStore.phone}</p>}
          </div>
          <div className="border-t-2 border-dashed border-gray-300 dark:border-gray-700" />
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{documentLabel} #</span><span className="font-bold text-gray-900 dark:text-white">#{receiptNo}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Date</span><span className="font-semibold text-gray-900 dark:text-white">{formatDate(tx.received_at || txDate(tx))}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Supplier</span><span className="font-semibold text-gray-900 dark:text-white">{supplier?.name || "—"}</span></div>
            {isPayment && tx.reference && (
              <div className="flex justify-between gap-3"><span>Payment reference</span><strong className="break-all">{tx.reference}</strong></div>
            )}
            {method && (
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Method</span><span className="font-semibold text-gray-900 dark:text-white capitalize flex items-center gap-1">
                {method === 'momo' ? <Smartphone size={14} /> : method === 'bank' ? <CreditCard size={14} /> : <Banknote size={14} />}
                {method}
              </span></div>
            )}
          </div>
          <div className="border-t-2 border-dashed border-gray-300 dark:border-gray-700" />
          {isPayment && appliedByThisPayment.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 space-y-1.5">
              <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase flex items-center gap-1"><Link2 size={11} /> Applied to</p>
              {appliedByThisPayment.map((a, i) => {
                const s = purchaseById(a.sale_id);
                return (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-300">{s ? purchaseLabel(s) : "Invoice"}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(parseFloat(a.amount) || 0, currency)}</span>
                  </div>
                );
              })}
            </div>
          )}
          {!isPayment && (invoicePayments.length > 0 || appliedToThisPurchase.length > 0) && (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl p-3 space-y-1.5">
              <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase flex items-center gap-1"><Link2 size={11} /> Payments applied to this purchase</p>
              {invoicePayments.map(payment => (
                <div key={payment.id} className="flex justify-between gap-2 text-xs">
                  <span className="min-w-0 break-words">{invoicePaymentDetails(payment)}</span>
                  <strong>{formatCurrency(payment.amount, currency)}</strong>
                </div>
              ))}
              {appliedToThisPurchase.map((a, i) => {
                const p = payById(a.payment_id);
                return (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="min-w-0 break-words text-gray-600 dark:text-gray-300">{[formatDate(txDate(p)), p.paymentMethod, p.reference].filter(Boolean).join(" · ")}</span>
                    <span className="font-semibold text-green-700 dark:text-green-400">-{formatCurrency(parseFloat(a.amount) || 0, currency)}</span>
                  </div>
                );
              })}
            </div>
          )}
          {!isPayment && (items.length > 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-dashed divide-gray-200 dark:divide-gray-800">
              <div className="p-3 pb-2"><p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Items ({items.length})</p></div>
              {items.map((item, i) => {
                const qty = parseFloat(item.quantity) || 0;
                const price = parseFloat(item.price) || 0;
                return (
                  <div key={i} className="p-3">
                    <div className="flex justify-between gap-3">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white flex-1">
                        {item.name}
                        {item.brand ? <span className="text-gray-400 dark:text-gray-500 font-normal"> ({item.brand})</span> : null}
                      </p>
                      <p className="font-bold text-sm text-gray-900 dark:text-white">{formatCurrency(qty * price, currency)}</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.isQuickInvoice ? "Quick invoice — individual items not listed" : `${qty} ${item.unitName || "unit"} × ${formatCurrency(price, currency)}`}</p>
                    {item.note && <p className="mt-1 text-xs italic text-amber-700 dark:text-amber-300">Note: {item.note}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-1">No item breakdown recorded for this purchase.</p>
          ))}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-2">
            {isPayment ? (
              <div className="flex justify-between text-lg font-bold"><span className="text-gray-700 dark:text-gray-300">{isRefund ? "Refund received" : "Amount paid"}</span><span className="text-green-600 dark:text-green-400">{formatCurrency(Math.abs(paid), currency)}</span></div>
            ) : (
              <>
                <div className="flex justify-between text-base"><span className="text-gray-600 dark:text-gray-300">Total Purchase</span><span className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalPurchase, currency)}</span></div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Discount</span><span className="font-semibold text-purple-600 dark:text-purple-400">-{formatCurrency(discount, currency)}</span></div>
                )}
                {paid > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Paid Upfront</span><span className="font-semibold text-green-600 dark:text-green-400">-{formatCurrency(paid, currency)}</span></div>
                )}
                {paid > totalPurchase + 0.009 && <div className="flex justify-between text-sm"><span>Applied to this invoice upfront</span><strong>{formatCurrency(totalPurchase, currency)}</strong></div>}
                {appliedTotal > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Paid via Payments</span><span className="font-semibold text-green-600 dark:text-green-400">-{formatCurrency(appliedTotal, currency)}</span></div>
                )}
                <div className="flex justify-between text-base pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                  <span className="font-bold text-gray-700 dark:text-gray-200">Outstanding</span>
                  <span className={`font-bold ${trueOutstanding > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>{formatCurrency(trueOutstanding, currency)}</span>
                </div>
                {trueOutstanding === 0 && (
                  <p className="text-center text-[10px] font-bold text-green-600 dark:text-green-400 uppercase pt-1">✅ Fully Paid</p>
                )}
              </>
            )}
          </div>
          <CorrectionHistory key={tx.id} transaction={tx} history={history} currency={currency} readOnly={readOnly} onUndone={onCorrectionUndone} />
          {creditAvailable > 0.009 && <p className="rounded-xl bg-indigo-50 p-3 text-sm font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">Credit available from this {documentLabel.toLowerCase()} · {formatCurrency(creditAvailable, currency)}</p>}
          {isRefund && <p className="text-sm">Original payment or invoice #{tx.credit_source_id.slice(-6).toUpperCase()}</p>}
          {tx.note && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-xl p-3">
              <p className="text-[10px] font-bold text-yellow-700 dark:text-yellow-400 uppercase mb-1">Note</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{tx.note}</p>
            </div>
          )}
          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">Thank you for your business! 🙏</p>
        </div>
        <div className="app-safe-footer shrink-0 space-y-2 border-t border-gray-200 px-4 pt-3 dark:border-gray-800">
          {tx.type === 'purchase' && isActive(tx) && !tx.replacedByTransactionId && trueOutstanding > 0.009 && (
            <button onClick={() => onPayment(tx.id)} className="w-full rounded-xl bg-indigo-600 py-3.5 font-bold text-white">Add payment to this invoice</button>
          )}
          {supplier?.phone && (
            <button onClick={handleShare} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition">
              <Share2 size={18} /> Share {documentLabel} (WhatsApp)
            </button>
          )}
          {(isActive(tx) || tx.status === "being_corrected") && !isRefund && !hasRefunds && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onFix(tx)} className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition">
                <Edit3 size={18} /> Correct entry
              </button>
              <button onClick={() => onCancel(tx)} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition">
                <Ban size={18} /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
