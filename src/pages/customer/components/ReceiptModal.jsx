import { CorrectionHistory } from "../../../components/CorrectionHistory";
import { FileText, Ban, HeartHandshake, Smartphone, CreditCard, Banknote, Share2, Edit3, X, Link2, WalletCards } from "lucide-react";
import { formatCurrency, formatDate } from "../../../utils/helpers";
import { openWhatsApp } from "../../../utils/communication";
import { txDate, isActive, saleLabel, isWriteOffTx } from "../utils/helpers";
import { paymentCreditAvailable } from "../../../utils/paymentCredit";
import { invoiceReference } from "../../../utils/invoiceReference";

export const ReceiptModal = ({ tx, customer, currentStore, onClose, onFix, onCancel, currency, history, allocations, readOnly, onCorrectionUndone, balance, onReceivePayment }) => {
  if (!tx) return null;
  const items = Array.isArray(tx.items) ? tx.items : [];
  const totalSale = parseFloat(tx.amount) || 0;
  const discount = parseFloat(tx.discount) || 0;
  const paid = parseFloat(tx.paid) || 0;
  const isPayment = tx.type === 'payment';
  const documentNumber = isPayment ? `PAY-${(tx.id || "000000").slice(-6).toUpperCase()}` : invoiceReference(tx);
  const documentLabel = isPayment ? "Receipt" : "Invoice";
  const isRefund = Boolean(tx.credit_source_id);
  const creditAvailable = paymentCreditAvailable(tx, history || [], allocations || []);
  const hasRefunds = (history || []).some(row => row.credit_source_id === tx.id && isActive(row));
  const forgiven = isWriteOffTx(tx);
  const forgiveReason = forgiven ? (tx.note || '').replace('[FORGIVEN] ', '') : tx.note;
  const method = tx.paymentMethod;
  const receivedDate = isPayment && tx.received_at ? tx.received_at : txDate(tx);
  const paymentReference = isPayment ? tx.reference : null;
  const referenceLabel = method === 'momo' ? "MoMo transaction ID" : "Payment reference";
  const invoicePayments = tx.invoice_payments || [];
  const invoicePaymentDetails = (payment) => [
    formatDate(payment.receivedAt),
    { cash: "Cash", momo: "MoMo" }[payment.method],
    payment.reference,
    payment.paidBy && `Paid by ${payment.paidBy}`,
  ].filter(Boolean).join(" · ");
  const showPaymentBalance = isPayment && !forgiven && isActive(tx) && Number.isFinite(balance);
  const balanceLabel = balance < 0 ? "Current customer credit" : "Current balance due";

  const payById = (id) => (Array.isArray(history) ? history : []).find(p => p.id === id);
  const saleById = (id) => (Array.isArray(history) ? history : []).find(s => s.id === id);

  // 👇 NEW: correction lineage — which old receipt this one fixes (and why)
  const correctedOldTx = tx.correctsTransactionId
    ? (Array.isArray(history) ? history : []).find(t => t.id === tx.correctsTransactionId)
    : null;
  const correctionReason = correctedOldTx ? (correctedOldTx.cancel_reason || correctedOldTx.cancelReason || "") : "";
  const correctedOldLabel = correctedOldTx
    ? `${correctedOldTx.type === 'sale' ? 'Sale' : 'Payment'} #${(correctedOldTx.id || "").slice(-6).toUpperCase()}`
    : "";

  // 👇 Allocation truth from the payment_allocations table
  const appliedToThisSale = !isPayment
    ? (Array.isArray(allocations) ? allocations : []).filter(a => a.sale_id === tx.id && isActive(payById(a.payment_id) || {}))
    : [];
  const appliedByThisPayment = isPayment
    ? (Array.isArray(allocations) ? allocations : []).filter(a => a.payment_id === tx.id)
    : [];

  // Split: real money vs forgiven money (historically distinguishable)
  const paidAllocs = appliedToThisSale.filter(a => !isWriteOffTx(payById(a.payment_id)));
  const creditAllocs = paidAllocs.filter(a => Array.isArray(a.credit_operation_ids) && a.credit_operation_ids.length > 0);
  const regularPaidAllocs = paidAllocs.filter(a => !Array.isArray(a.credit_operation_ids) || a.credit_operation_ids.length === 0);
  const forgivenAllocs = appliedToThisSale.filter(a => isWriteOffTx(payById(a.payment_id)));
  const paidViaPayments = paidAllocs.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const forgivenTotal = forgivenAllocs.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const appliedTotal = paidViaPayments + forgivenTotal;
  const trueOutstanding = Math.max(0, totalSale - paid - appliedTotal);

  const handleShare = () => {
    const L = [];
    L.push(`${currentStore?.name || "Store"}`);
    if (currentStore?.owner_name || currentStore?.ownerName) L.push(currentStore?.owner_name || currentStore?.ownerName);
    if (currentStore?.phone) L.push(`Tel: ${currentStore.phone}`);
    L.push("──────────────────────");
    L.push(`${documentLabel}: ${documentNumber}`);
    L.push(`${isPayment && !forgiven ? "Date received" : "Date"}: ${formatDate(receivedDate)}`);
    if (paymentReference) L.push(`${referenceLabel}: ${paymentReference}`);
    L.push(`Customer: ${customer?.name || "Walk-in"}`);
    if (tx.correctsTransactionId) L.push(`🔁 CORRECTS: ${correctedOldLabel}${correctionReason ? ` — ${correctionReason}` : ""}`);
    if (tx.replacedByTransactionId) L.push(`🔁 REPLACED BY: ${documentLabel} #${(tx.replacedByTransactionId || "").slice(-6).toUpperCase()} (this version cancelled)`);
    L.push("──────────────────────");
    if (forgiven) {
      L.push(`🤝 DEBT FORGIVEN: ${formatCurrency(paid, currency)}`);
      if (forgiveReason) L.push(`Reason: ${forgiveReason}`);
      if (appliedByThisPayment.length > 0) {
        appliedByThisPayment.forEach(a => { const s = saleById(a.sale_id); L.push(`  → ${s ? saleLabel(s) : "Invoice"}: ${formatCurrency(parseFloat(a.amount) || 0, currency)}`); });
      }
    } else if (isPayment) {
      L.push(`${isRefund ? "REFUND RETURNED" : "PAYMENT RECEIVED"}: ${formatCurrency(Math.abs(paid), currency)}`);
      if (isRefund) L.push(`Original payment or invoice #${tx.credit_source_id.slice(-6).toUpperCase()}`);
      if (method) L.push(`Method: ${method}`);
      if (appliedByThisPayment.length > 0) {
        appliedByThisPayment.forEach(a => { const s = saleById(a.sale_id); L.push(`  → ${s ? saleLabel(s) : "Invoice"}: ${formatCurrency(parseFloat(a.amount) || 0, currency)}`); });
      }
    } else {
      if (items.length > 0) {
        items.forEach(i => { const qty = parseFloat(i.quantity) || 0; const price = parseFloat(i.price) || 0; L.push(`${i.name}${i.brand ? ` (${i.brand})` : ""}`); L.push(i.isQuickInvoice ? `  Quick invoice total: ${formatCurrency(qty * price, currency)}` : `  ${qty} ${i.unitName || ""} x ${formatCurrency(price, currency)} = ${formatCurrency(qty * price, currency)}`); if (i.note) L.push(`  Note: ${i.note}`); });
      } else { L.push("(No item breakdown recorded)"); }
      L.push("──────────────────────");
      L.push(`TOTAL: ${formatCurrency(totalSale, currency)}`);
      if (discount > 0) L.push(`Discount: ${formatCurrency(discount, currency)}`);
      L.push(`PAID UPFRONT: ${formatCurrency(paid, currency)}`);
      if (paid > totalSale + 0.009) L.push(`Applied to this invoice upfront: ${formatCurrency(totalSale, currency)}`);
      invoicePayments.forEach(p => L.push(`  ${invoicePaymentDetails(p)} · ${formatCurrency(p.amount, currency)}`));
      paidAllocs.forEach(a => {
        const payment = payById(a.payment_id);
        if (payment) L.push(`  ${formatDate(payment.received_at || txDate(payment))} · ${payment.reference || "Receipt #" + payment.id.slice(-6).toUpperCase()} · ${formatCurrency(a.amount, currency)}`);
      });
      if (paidViaPayments > 0) L.push(`PAID VIA PAYMENTS: ${formatCurrency(paidViaPayments, currency)}`);
      if (forgivenTotal > 0) L.push(`🤝 FORGIVEN: ${formatCurrency(forgivenTotal, currency)}`);
      L.push(`OUTSTANDING: ${formatCurrency(trueOutstanding, currency)}`);
    }
    if (forgiveReason && !forgiven) L.push(`Note: ${forgiveReason}`);
    if (creditAvailable > 0.009) L.push(`Credit available from this ${documentLabel.toLowerCase()}: ${formatCurrency(creditAvailable, currency)}`);
    if (showPaymentBalance) L.push(`${balanceLabel}: ${formatCurrency(Math.abs(balance), currency)}`);
    if (tx.status === 'cancelled') L.push(`🚫 CANCELLED: ${tx.cancel_reason || tx.cancelReason || ""}`);
    L.push(""); L.push("Thank you for your business! 🙏");
    openWhatsApp(customer?.phone || "", L.join("\n"));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-50 dark:bg-gray-950 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl app-sheet flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={20} className={forgiven ? "text-purple-600" : isPayment ? "text-blue-600" : "text-green-600"} />
            {isRefund ? "Refund Receipt" : forgiven ? "Debt Forgiveness" : isPayment ? "Payment Receipt" : "Sales Invoice"}
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
          {/* 👇 NEW: this receipt is a corrected version */}
          {tx.correctsTransactionId && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              <p className="font-bold text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2"><Edit3 size={14} /> Corrected {documentLabel}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                🔁 This {documentLabel.toLowerCase()} corrects {correctedOldLabel || `a previous ${documentLabel.toLowerCase()}`}{correctionReason ? ` — ${correctionReason}` : ""}
              </p>
            </div>
          )}
          {/* 👇 NEW: this receipt is a dead version — point to the live one */}
          {tx.replacedByTransactionId && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Edit3 size={14} /> 🔁 Replaced by {documentLabel} #{(tx.replacedByTransactionId || "").slice(-6).toUpperCase()} — this version is cancelled
              </p>
            </div>
          )}
          <div className="text-center">
            <p className="font-bold text-lg text-gray-900 dark:text-white">{currentStore?.name || "My Store"}</p>
            {(currentStore?.owner_name || currentStore?.ownerName) && <p className="text-xs text-gray-500 dark:text-gray-400">{currentStore?.owner_name || currentStore?.ownerName}</p>}
            {currentStore?.phone && <p className="text-xs text-gray-500 dark:text-gray-400">Tel: {currentStore.phone}</p>}
          </div>
          <div className="border-t-2 border-dashed border-gray-300 dark:border-gray-700" />
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-3"><span className="text-gray-500 dark:text-gray-400">{documentLabel}</span><span className="font-bold text-right text-gray-900 dark:text-white">{documentNumber}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{isPayment && !forgiven ? "Date received" : "Date"}</span><span className="font-semibold text-gray-900 dark:text-white">{formatDate(receivedDate)}</span></div>
            {isPayment && tx.received_at && (
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Date recorded</span><span className="font-semibold text-gray-900 dark:text-white">{formatDate(txDate(tx))}</span></div>
            )}
            {paymentReference && (
              <div className="flex justify-between gap-4"><span className="text-gray-500 dark:text-gray-400">{referenceLabel}</span><span className="font-mono font-semibold text-right break-all text-gray-900 dark:text-white">{paymentReference}</span></div>
            )}
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Customer</span><span className="font-semibold text-gray-900 dark:text-white">{customer?.name || "Walk-in"}</span></div>
            {method && method !== 'write_off' && (
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Method</span><span className="font-semibold text-gray-900 dark:text-white capitalize flex items-center gap-1">
                {method === 'momo' ? <Smartphone size={14} /> : method === 'bank' ? <CreditCard size={14} /> : <Banknote size={14} />} {method}
              </span></div>
            )}
          </div>
          <div className="border-t-2 border-dashed border-gray-300 dark:border-gray-700" />
          {forgiven ? (
            <div className="space-y-3">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-purple-200 dark:border-purple-800 p-4 space-y-3">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2"><HeartHandshake size={18} className="text-purple-600" /> Amount Forgiven</span>
                  <span className="text-purple-600 dark:text-purple-400">{formatCurrency(paid, currency)}</span>
                </div>
                {forgiveReason && (
                  <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase mb-1">Reason</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{forgiveReason}</p>
                  </div>
                )}
              </div>
              {appliedByThisPayment.length > 0 && (
                <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase flex items-center gap-1"><Link2 size={11} /> Applied to</p>
                  {appliedByThisPayment.map((a, i) => {
                    const s = saleById(a.sale_id);
                    return (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-300">{s ? saleLabel(s) : "Invoice"}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(parseFloat(a.amount) || 0, currency)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {isPayment && appliedByThisPayment.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase flex items-center gap-1"><Link2 size={11} /> Applied to</p>
                  {appliedByThisPayment.map((a, i) => {
                    const s = saleById(a.sale_id);
                    return (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-300">{s ? saleLabel(s) : "Invoice"}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(parseFloat(a.amount) || 0, currency)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {!isPayment && (invoicePayments.length > 0 || regularPaidAllocs.length > 0) && (
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase flex items-center gap-1"><Link2 size={11} /> Payments applied to this invoice</p>
                  {invoicePayments.map(payment => (
                    <div key={payment.id} className="flex justify-between gap-2 text-xs">
                      <span className="min-w-0 break-words">{invoicePaymentDetails(payment)}</span>
                      <strong>{formatCurrency(payment.amount, currency)}</strong>
                    </div>
                  ))}
                  {regularPaidAllocs.map((a, i) => {
                    const p = payById(a.payment_id);
                    return (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-300 break-words min-w-0">{p ? formatDate(p.received_at || txDate(p)) : "Payment"}{p?.reference ? ` · ${p.reference}` : ""}</span>
                        <span className="font-semibold text-green-700 dark:text-green-400">-{formatCurrency(parseFloat(a.amount) || 0, currency)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {!isPayment && creditAllocs.length > 0 && (
                <div className="space-y-1.5 rounded-xl border border-indigo-100 bg-indigo-50 p-3 dark:border-indigo-900 dark:bg-indigo-950/20">
                  <p className="flex items-center gap-1 text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300"><WalletCards size={11}/> Credit applied</p>
                  {creditAllocs.map((allocation, index) => {
                    const payment = payById(allocation.payment_id);
                    const sourceReference = payment?.reference || (payment ? `${payment.type === 'sale' ? saleLabel(payment) : `PAY-${payment.id.slice(-6).toUpperCase()}`}` : "Customer credit");
                    return <div key={index} className="flex justify-between gap-3 text-xs"><span className="min-w-0 break-words text-gray-600 dark:text-gray-300">{payment ? formatDate(payment.received_at || txDate(payment)) : "Credit source"} · {sourceReference}</span><strong className="text-indigo-700 dark:text-indigo-300">-{formatCurrency(parseFloat(allocation.amount) || 0, currency)}</strong></div>;
                  })}
                </div>
              )}
              {!isPayment && forgivenAllocs.length > 0 && (
                <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase flex items-center gap-1"><HeartHandshake size={11} /> Forgiven on this invoice</p>
                  {forgivenAllocs.map((a, i) => {
                    const p = payById(a.payment_id);
                    return (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-300">{p ? formatDate(txDate(p)).split(',')[0] : "Forgiveness"}</span>
                        <span className="font-semibold text-purple-700 dark:text-purple-400">🤝 -{formatCurrency(parseFloat(a.amount) || 0, currency)}</span>
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
                          <p className="font-semibold text-sm text-gray-900 dark:text-white flex-1">{item.name}{item.brand ? <span className="text-gray-400 dark:text-gray-500 font-normal"> ({item.brand})</span> : null}</p>
                          <p className="font-bold text-sm text-gray-900 dark:text-white">{formatCurrency(qty * price, currency)}</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.isQuickInvoice ? "Quick invoice — individual items not listed" : `${qty} ${item.unitName || "unit"} × ${formatCurrency(price, currency)}`}</p>
                        {item.note && <p className="mt-1 text-xs italic text-amber-700 dark:text-amber-300">Note: {item.note}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-1">No item breakdown recorded for this sale.</p>)}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-2">
                {isPayment ? (
                  <>
                    <div className="flex justify-between text-lg font-bold"><span className="text-gray-700 dark:text-gray-300">{isRefund ? "Amount returned" : "Amount received"}</span><span className="text-green-600 dark:text-green-400">{formatCurrency(Math.abs(paid), currency)}</span></div>
                    {showPaymentBalance && (
                      <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-300">{balanceLabel}</span><span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(Math.abs(balance), currency)}</span></div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-base"><span className="text-gray-600 dark:text-gray-300">Total Sale</span><span className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalSale, currency)}</span></div>
                    {discount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Discount</span><span className="font-semibold text-purple-600 dark:text-purple-400">-{formatCurrency(discount, currency)}</span></div>}
                    {paid > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Paid Upfront</span><span className="font-semibold text-green-600 dark:text-green-400">-{formatCurrency(paid, currency)}</span></div>}
                    {paid > totalSale + 0.009 && <div className="flex justify-between text-sm"><span>Applied to this invoice upfront</span><strong>{formatCurrency(totalSale, currency)}</strong></div>}
                    {paidViaPayments > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Payments and credit applied</span><span className="font-semibold text-green-600 dark:text-green-400">-{formatCurrency(paidViaPayments, currency)}</span></div>}
                    {forgivenTotal > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">🤝 Forgiven</span><span className="font-semibold text-purple-600 dark:text-purple-400">-{formatCurrency(forgivenTotal, currency)}</span></div>}
                    <div className="flex justify-between text-base pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                      <span className="font-bold text-gray-700 dark:text-gray-200">Outstanding</span>
                      <span className={`font-bold ${trueOutstanding > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>{formatCurrency(trueOutstanding, currency)}</span>
                    </div>
                    {trueOutstanding === 0 && (
                      <p className={`text-center text-[10px] font-bold uppercase pt-1 ${forgivenTotal > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-green-600 dark:text-green-400'}`}>
                        {forgivenTotal > 0 ? `🤝 Fully Settled (Forgiven ${formatCurrency(forgivenTotal, currency)})` : '✅ Fully Paid'}
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          )}
          <CorrectionHistory key={tx.id} transaction={tx} history={history} currency={currency} readOnly={readOnly} onUndone={onCorrectionUndone} />
          {creditAvailable > 0.009 && <p className="rounded-xl bg-indigo-50 p-3 text-sm font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">Credit available from this {documentLabel.toLowerCase()} · {formatCurrency(creditAvailable, currency)}</p>}
          {isRefund && <p className="text-sm">Original payment or invoice #{tx.credit_source_id.slice(-6).toUpperCase()}</p>}
          {forgiveReason && !forgiven && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-xl p-3">
              <p className="text-[10px] font-bold text-yellow-700 dark:text-yellow-400 uppercase mb-1">Note</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{forgiveReason}</p>
            </div>
          )}
          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">Thank you for your business! 🙏</p>
        </div>
        <div className="app-safe-footer shrink-0 space-y-2 border-t border-gray-200 px-4 pt-3 dark:border-gray-800">
          {tx.type === 'sale' && isActive(tx) && trueOutstanding > 0.009 && onReceivePayment && (
            <button onClick={() => onReceivePayment(tx.id)} className="w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white">Add payment to this invoice</button>
          )}
          {customer?.phone && !forgiven && (
            <button onClick={handleShare} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition">
              <Share2 size={18} /> Share {documentLabel} (WhatsApp)
            </button>
          )}
          {(isActive(tx) || tx.status === "being_corrected") && !isRefund && !hasRefunds && (forgiven ? (
            <button onClick={() => onCancel(tx)} className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition">
              <Ban size={18} /> Cancel Forgiveness
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onFix(tx)} className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition">
                <Edit3 size={18} /> Correct entry
              </button>
              <button onClick={() => onCancel(tx)} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition">
                <Ban size={18} /> Cancel
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
