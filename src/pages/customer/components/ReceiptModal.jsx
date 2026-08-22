import { FileText, Ban, HeartHandshake, Smartphone, CreditCard, Banknote, Share2, Edit3, X, Link2 } from "lucide-react";
import { formatCurrency, formatDate } from "../../../utils/helpers";
import { openWhatsApp } from "../../../utils/communication";
import { txDate, isActive, saleLabel } from "../utils/helpers";

export const ReceiptModal = ({ tx, customer, currentStore, onClose, onFix, onCancel, currency, history, allocations }) => {
  if (!tx) return null;
  const items = Array.isArray(tx.items) ? tx.items : [];
  const totalSale = parseFloat(tx.amount) || 0;
  const discount = parseFloat(tx.discount) || 0;
  const paid = parseFloat(tx.paid) || 0;
  const receiptNo = (tx.id || "000000").slice(-6).toUpperCase();
  const isPayment = tx.type === 'payment';
  const forgiven = tx.type === 'payment' && (tx.note || '').startsWith('[FORGIVEN]');
  const forgiveReason = forgiven ? (tx.note || '').replace('[FORGIVEN] ', '') : tx.note;
  const method = tx.paymentMethod;

  const payById = (id) => (Array.isArray(history) ? history : []).find(p => p.id === id);
  const saleById = (id) => (Array.isArray(history) ? history : []).find(s => s.id === id);

  const appliedToThisSale = !isPayment ? (Array.isArray(allocations) ? allocations : []).filter(a => a.sale_id === tx.id && isActive(payById(a.payment_id) || {})) : [];
  const appliedByThisPayment = isPayment ? (Array.isArray(allocations) ? allocations : []).filter(a => a.payment_id === tx.id) : [];
  const appliedTotal = appliedToThisSale.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const trueOutstanding = Math.max(0, totalSale - paid - appliedTotal);

  const handleShare = () => {
    const L = [];
    L.push(`${currentStore?.name || "Store"}`);
    if (currentStore?.owner_name || currentStore?.ownerName) L.push(currentStore?.owner_name || currentStore?.ownerName);
    if (currentStore?.phone) L.push(`Tel: ${currentStore.phone}`);
    L.push("──────────────────────");
    L.push(`Receipt #: ${receiptNo}`);
    L.push(`Date: ${formatDate(txDate(tx))}`);
    L.push(`Customer: ${customer?.name || "Walk-in"}`);
    L.push("──────────────────────");
    if (forgiven) {
      L.push(`🤝 DEBT FORGIVEN: ${formatCurrency(paid, currency)}`);
      if (forgiveReason) L.push(`Reason: ${forgiveReason}`);
    } else if (isPayment) {
      L.push(`PAYMENT RECEIVED: ${formatCurrency(paid, currency)}`);
      if (method) L.push(`Method: ${method}`);
      if (appliedByThisPayment.length > 0) {
        appliedByThisPayment.forEach(a => { const s = saleById(a.sale_id); L.push(`  → ${s ? saleLabel(s) : "Invoice"}: ${formatCurrency(parseFloat(a.amount) || 0, currency)}`); });
      }
    } else {
      if (items.length > 0) {
        items.forEach(i => { const qty = parseFloat(i.quantity) || 0; const price = parseFloat(i.price) || 0; L.push(`${i.name}${i.brand ? ` (${i.brand})` : ""}`); L.push(`  ${qty} ${i.unitName || ""} x ${formatCurrency(price, currency)} = ${formatCurrency(qty * price, currency)}`); });
      } else { L.push("(No item breakdown recorded)"); }
      L.push("──────────────────────");
      L.push(`TOTAL: ${formatCurrency(totalSale, currency)}`);
      if (discount > 0) L.push(`Discount: ${formatCurrency(discount, currency)}`);
      L.push(`PAID UPFRONT: ${formatCurrency(paid, currency)}`);
      if (appliedTotal > 0) L.push(`PAID VIA PAYMENTS: ${formatCurrency(appliedTotal, currency)}`);
      L.push(`OUTSTANDING: ${formatCurrency(trueOutstanding, currency)}`);
    }
    if (forgiveReason && !forgiven) L.push(`Note: ${forgiveReason}`);
    if (tx.status === 'cancelled') L.push(`🚫 CANCELLED: ${tx.cancel_reason || tx.cancelReason || ""}`);
    L.push(""); L.push("Thank you for your business! 🙏");
    openWhatsApp(customer?.phone || "", L.join("\n"));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-50 dark:bg-gray-950 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={20} className={forgiven ? "text-purple-600" : isPayment ? "text-blue-600" : "text-green-600"} />
            {forgiven ? "Debt Forgiveness" : isPayment ? "Payment Receipt" : "Sale Receipt"}
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full"><X size={18} className="text-gray-600 dark:text-gray-300" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Receipt #</span><span className="font-bold text-gray-900 dark:text-white">#{receiptNo}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Date</span><span className="font-semibold text-gray-900 dark:text-white">{formatDate(txDate(tx))}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Customer</span><span className="font-semibold text-gray-900 dark:text-white">{customer?.name || "Walk-in"}</span></div>
            {method && method !== 'write_off' && (
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Method</span><span className="font-semibold text-gray-900 dark:text-white capitalize flex items-center gap-1">
                {method === 'momo' ? <Smartphone size={14} /> : method === 'bank' ? <CreditCard size={14} /> : <Banknote size={14} />} {method}
              </span></div>
            )}
          </div>
          <div className="border-t-2 border-dashed border-gray-300 dark:border-gray-700" />
          {forgiven ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-purple-200 dark:border-purple-800 p-4 space-y-3">
              <div className="flex justify-between text-lg font-bold"><span className="text-gray-700 dark:text-gray-300 flex items-center gap-2"><HeartHandshake size={18} className="text-purple-600" /> Amount Forgiven</span><span className="text-purple-600 dark:text-purple-400">{formatCurrency(paid, currency)}</span></div>
              {forgiveReason && <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-xl p-3"><p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase mb-1">Reason</p><p className="text-sm text-gray-700 dark:text-gray-300">{forgiveReason}</p></div>}
            </div>
          ) : (
            <>
              {isPayment && appliedByThisPayment.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase flex items-center gap-1"><Link2 size={11} /> Applied to</p>
                  {appliedByThisPayment.map((a, i) => { const s = saleById(a.sale_id); return (<div key={i} className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-300">{s ? saleLabel(s) : "Invoice"}</span><span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(parseFloat(a.amount) || 0, currency)}</span></div>); })}
                </div>
              )}
              {!isPayment && appliedToThisSale.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase flex items-center gap-1"><Link2 size={11} /> Payments applied to this invoice</p>
                  {appliedToThisSale.map((a, i) => { const p = payById(a.payment_id); return (<div key={i} className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-300">{p ? formatDate(txDate(p)).split(',')[0] : "Payment"}{p?.paymentMethod ? ` • ${p.paymentMethod}` : ""}</span><span className="font-semibold text-green-700 dark:text-green-400">-{formatCurrency(parseFloat(a.amount) || 0, currency)}</span></div>); })}
                </div>
              )}
              {!isPayment && (items.length > 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-dashed divide-gray-200 dark:divide-gray-800">
                  <div className="p-3 pb-2"><p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Items ({items.length})</p></div>
                  {items.map((item, i) => { const qty = parseFloat(item.quantity) || 0; const price = parseFloat(item.price) || 0; return (<div key={i} className="p-3"><div className="flex justify-between gap-3"><p className="font-semibold text-sm text-gray-900 dark:text-white flex-1">{item.name}{item.brand ? <span className="text-gray-400 dark:text-gray-500 font-normal"> ({item.brand})</span> : null}</p><p className="font-bold text-sm text-gray-900 dark:text-white">{formatCurrency(qty * price, currency)}</p></div><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{qty} {item.unitName || "unit"} × {formatCurrency(price, currency)}</p></div>); })}
                </div>
              ) : <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-1">No item breakdown recorded for this sale.</p>)}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-2">
                {isPayment ? (
                  <div className="flex justify-between text-lg font-bold"><span className="text-gray-700 dark:text-gray-300">Amount Received</span><span className="text-green-600 dark:text-green-400">{formatCurrency(paid, currency)}</span></div>
                ) : (
                  <>
                    <div className="flex justify-between text-base"><span className="text-gray-600 dark:text-gray-300">Total Sale</span><span className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalSale, currency)}</span></div>
                    {discount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Discount</span><span className="font-semibold text-purple-600 dark:text-purple-400">-{formatCurrency(discount, currency)}</span></div>}
                    {paid > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Paid Upfront</span><span className="font-semibold text-green-600 dark:text-green-400">-{formatCurrency(paid, currency)}</span></div>}
                    {appliedTotal > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Paid via Payments</span><span className="font-semibold text-green-600 dark:text-green-400">-{formatCurrency(appliedTotal, currency)}</span></div>}
                    <div className="flex justify-between text-base pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                      <span className="font-bold text-gray-700 dark:text-gray-200">Outstanding</span>
                      <span className={`font-bold ${trueOutstanding > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>{formatCurrency(trueOutstanding, currency)}</span>
                    </div>
                    {trueOutstanding === 0 && <p className="text-center text-[10px] font-bold text-green-600 dark:text-green-400 uppercase pt-1">✅ Fully Paid</p>}
                  </>
                )}
              </div>
            </>
          )}
          {forgiveReason && !forgiven && <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-xl p-3"><p className="text-[10px] font-bold text-yellow-700 dark:text-yellow-400 uppercase mb-1">Note</p><p className="text-sm text-gray-700 dark:text-gray-300">{forgiveReason}</p></div>}
          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">Thank you for your business! 🙏</p>
        </div>
        <div className="p-4 pt-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 space-y-2">
          {customer?.phone && !forgiven && <button onClick={handleShare} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"><Share2 size={18} /> Share Receipt (WhatsApp)</button>}
          {isActive(tx) && (forgiven ? (
            <button onClick={() => onCancel(tx)} className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"><Ban size={18} /> Cancel Forgiveness</button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onFix(tx)} className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"><Edit3 size={18} /> Fix</button>
              <button onClick={() => onCancel(tx)} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"><Ban size={18} /> Cancel</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};