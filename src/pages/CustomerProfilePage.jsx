import { useState, useEffect, useMemo } from "react";
import { Phone, Edit3, Ban, Clock, AlertTriangle, FileText, X, Check, ArrowRight, ChevronDown, ChevronUp, Plus, Banknote, Smartphone, CreditCard, Share2, Trash2, HeartHandshake, Loader2 } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";
import { openWhatsApp, openDialer } from "../utils/communication";
import { CustomerService } from "../services/CustomerService";
import { TransactionService } from "../services/TransactionService";
import { AccountShareService } from "../services/AccountShareService";
import { ShareAccountModal } from "../components/ShareAccountModal";
import { AddCustomerModal } from "../components/customer/AddCustomerModal";
import { DeleteContactModal } from "../components/DeleteContactModal";
import { TopBar } from "../components/TopBar";

// ==========================================
// HELPERS — normalize Supabase snake_case -> camelCase
// ==========================================
const normalizeTx = (tx) => {
  if (!tx) return tx;
  return {
    ...tx,
    createdAt: tx.created_at || tx.createdAt,
    paymentMethod: tx.payment_method || tx.paymentMethod,
    replacedByTransactionId: tx.replaced_by_transaction_id || tx.replacedByTransactionId,
    correctsTransactionId: tx.corrects_transaction_id || tx.correctsTransactionId,
    contactId: tx.contact_id || tx.contactId,
    contactName: tx.contact_name || tx.contactName,
    contactPhone: tx.contact_phone || tx.contactPhone,
  };
};
const normalizeList = (list) => (Array.isArray(list) ? list : []).map(normalizeTx);
const txDate = (tx) => tx.createdAt || tx.created_at || tx.date;
const isActive = (tx) => tx.status === 'active' || !tx.status;

// ==========================================
// SUB-COMPONENTS
// ==========================================
const CustomerHeader = ({ customer, daysSinceLastActive, onEdit }) => (
  <div className="flex items-center gap-4">
    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0">
      {(customer.name || "?").charAt(0)}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{customer.name || "Unknown"}</h2>
        <button onClick={onEdit} className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition" title="Edit Customer">
          <Edit3 size={14} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
        <Phone size={12} /> {customer.phone || "No phone"}
      </p>
      {daysSinceLastActive && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
          <Clock size={10} /> Last active: {daysSinceLastActive}
        </p>
      )}
    </div>
  </div>
);

const BalanceCard = ({ balance, lastPayment, currency }) => (
  <div className={`p-5 rounded-2xl shadow-sm border ${
    balance > 0 ? "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800" :
    balance < 0 ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800" :
    "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
  }`}>
    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
      {balance > 0 ? "Outstanding Balance" : balance < 0 ? "Customer Credit" : "All Paid Up"}
    </p>
    <p className={`text-3xl font-bold ${
      balance > 0 ? "text-orange-600 dark:text-orange-400" :
      balance < 0 ? "text-blue-600 dark:text-blue-400" :
      "text-green-600 dark:text-green-400"
    }`}>
      {formatCurrency(Math.abs(balance), currency)}
    </p>
    {lastPayment && (
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50 flex justify-between items-center text-xs">
        <span className="text-gray-500 dark:text-gray-400">Last payment:</span>
        <span className="font-semibold text-gray-900 dark:text-white">
          {formatCurrency(parseFloat(lastPayment.paid) || 0, currency)} on {formatDate(txDate(lastPayment)).split(',')[0]}
        </span>
      </div>
    )}
  </div>
);

const QuickActions = ({ onSale, onPayment, onCall, onShare }) => (
  <div className="grid grid-cols-4 gap-2">
    <button onClick={onSale} className="bg-green-600 text-white p-3 rounded-xl flex flex-col items-center gap-1.5 active:scale-95 transition shadow-md">
      <Plus size={20} /> <span className="text-[10px] font-bold">Sale</span>
    </button>
    <button onClick={onPayment} className="bg-blue-600 text-white p-3 rounded-xl flex flex-col items-center gap-1.5 active:scale-95 transition shadow-md">
      <Banknote size={20} /> <span className="text-[10px] font-bold">Payment</span>
    </button>
    <button onClick={onCall} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-3 rounded-xl flex flex-col items-center gap-1.5 active:scale-95 transition">
      <Phone size={20} /> <span className="text-[10px] font-bold">Call</span>
    </button>
    <button onClick={onShare} className="bg-purple-600 text-white p-3 rounded-xl flex flex-col items-center gap-1.5 active:scale-95 transition shadow-md">
      <Share2 size={20} /> <span className="text-[10px] font-bold">Share</span>
    </button>
  </div>
);

// ==========================================
// UNPAID INVOICES WITH "SEE MORE" PAGINATION (5 per page)
// ==========================================
const OutstandingInvoices = ({ invoices, onView, currency, title = "Unpaid Invoices" }) => {
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    setVisibleCount(5);
  }, [invoices]);

  if (invoices.length === 0) return null;

  const visibleInvoices = invoices.slice(0, visibleCount);
  const hasMore = invoices.length > visibleCount;

  return (
    <div>
      <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1 flex items-center justify-between gap-1">
        <span className="flex items-center gap-1">
          <AlertTriangle size={12} className="text-orange-500" /> {title} ({invoices.length})
        </span>
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
          {Math.min(visibleCount, invoices.length)} of {invoices.length}
        </span>
      </h3>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
        {visibleInvoices.map(tx => (
          <button key={tx.id} onClick={() => onView(tx)} className="w-full flex items-center justify-between p-3 active:bg-gray-50 dark:active:bg-gray-700/50 transition text-left">
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{formatCurrency(tx.trueOutstanding, currency)} unpaid</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{formatDate(txDate(tx)).split(',')[0]}</p>
            </div>
            <ArrowRight size={16} className="text-gray-400" />
          </button>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setVisibleCount(c => c + 5)}
          className="w-full mt-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800/50 active:scale-[0.98] transition flex items-center justify-center gap-1.5"
        >
          <ChevronDown size={14} /> See More ({visibleInvoices.length} of {invoices.length})
        </button>
      )}
    </div>
  );
};

// ==========================================
// HISTORY WITH "LOAD MORE" PAGINATION (10 per page)
// ==========================================
const TransactionHistory = ({ history, onView, onToggleOld, expandedOldTx, setViewingTransaction, currency, hasMore, onLoadMore, shownCount, totalCount }) => {
  const getTimelineIcon = (tx) => {
    if (tx.status === 'being_corrected') return <Edit3 size={16} className="text-yellow-600" />;
    if (tx.status === 'cancelled') return <Ban size={16} className="text-red-500" />;
    if (tx.type === 'payment' && tx.note?.startsWith('[FORGIVEN]')) return <HeartHandshake size={16} className="text-purple-600" />;
    if (tx.type === 'payment') return <Check size={16} className="text-green-500" />;
    if ((parseFloat(tx.amount) || 0) > 0 && (parseFloat(tx.paid) || 0) === 0) return <FileText size={16} className="text-orange-500" />;
    return <FileText size={16} className="text-green-500" />;
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2"><Clock size={18} /> Recent Activity</span>
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{shownCount} of {totalCount}</span>
      </div>
      <div className="p-4 space-y-3">
        {history.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">No transaction history yet</p>
        ) : (
          history.map((tx) => {
            const isBeingCorrected = tx.status === 'being_corrected';
            const isCancelled = tx.status === 'cancelled';
            const isInvalid = isBeingCorrected || isCancelled;
            const isWriteOff = tx.type === 'payment' && tx.note?.startsWith('[FORGIVEN]');
            return (
              <div key={tx.id} className="space-y-2">
                <div role="button" tabIndex={0} onClick={() => onView(tx)} className={`w-full text-left p-3 rounded-xl border transition-all active:scale-[0.98] cursor-pointer ${
                  isCancelled ? 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20' :
                  isBeingCorrected ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20' :
                  isWriteOff ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20' :
                  'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-full ${isInvalid ? (isCancelled ? 'bg-red-100 dark:bg-red-900/40' : 'bg-yellow-100 dark:bg-yellow-900/40') : isWriteOff ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                        {getTimelineIcon(tx)}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${isInvalid ? 'text-gray-500 line-through' : isWriteOff ? 'text-purple-700 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
                          {isWriteOff ? 'Debt Forgiven' : tx.type === 'payment' ? 'Payment' : tx.type === 'purchase' ? 'Purchase' : 'Sale'}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{formatDate(txDate(tx)).split(',')[0]}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isInvalid ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(tx.amount || tx.paid, currency)}</p>
                      {tx.type === 'sale' && (parseFloat(tx.paid) || 0) > 0 && !isInvalid && <p className="text-[10px] text-green-600 dark:text-green-400">Paid: {formatCurrency(tx.paid, currency)}</p>}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                    {tx.correctsTransactionId && (
                      <button onClick={(e) => { e.stopPropagation(); onToggleOld(tx); }} className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                        {expandedOldTx && expandedOldTx.id === tx.correctsTransactionId ? <>Hide Previous <ChevronUp size={10} /></> : <>View Previous <ChevronDown size={10} /></>}
                      </button>
                    )}
                    {tx.replacedByTransactionId && (
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 ml-auto">
                        Updated Receipt <ArrowRight size={10} />
                      </p>
                    )}
                  </div>
                </div>
                {tx.correctsTransactionId && expandedOldTx && expandedOldTx.id === tx.correctsTransactionId && (
                  <div className="ml-6 pl-3 border-l-2 border-gray-300 dark:border-gray-700">
                    <button onClick={() => setViewingTransaction(expandedOldTx)} className="w-full text-left p-2 rounded-lg bg-red-50/30 dark:bg-red-950/10 text-xs text-red-600 dark:text-red-400">
                      Previous Version (Cancelled) - {formatCurrency(expandedOldTx.amount, currency)}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {hasMore && (
          <button
            onClick={onLoadMore}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800/50 active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            <ChevronDown size={16} /> Load More Transactions
          </button>
        )}
      </div>
    </div>
  );
};

const MoreInformation = ({ totalSales, totalPayments, historyLength, createdAt, currency }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <button onClick={() => setShow(!show)} className="w-full p-4 flex justify-between items-center text-sm font-bold text-gray-700 dark:text-gray-300">
        More Information <ChevronDown size={16} className={`transition-transform ${show ? 'rotate-180' : ''}`} />
      </button>
      {show && (
        <div className="p-4 pt-0 grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase font-bold">Total Sales</p><p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalSales, currency)}</p></div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase font-bold">Total Paid</p><p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPayments, currency)}</p></div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase font-bold">Transactions</p><p className="text-lg font-bold text-gray-900 dark:text-white">{historyLength}</p></div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase font-bold">Customer Since</p><p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{createdAt ? formatDate(createdAt).split(',')[0] : 'N/A'}</p></div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// DETAILED RECEIPT MODAL (itemized products + forgiveness view)
// ==========================================
const ReceiptModal = ({ tx, customer, currentStore, onClose, onFix, onCancel, currency }) => {
  if (!tx) return null;

  const items = Array.isArray(tx.items) ? tx.items : [];
  const totalSale = parseFloat(tx.amount) || 0;
  const discount = parseFloat(tx.discount) || 0;
  const paid = parseFloat(tx.paid) || 0;
  const outstanding = Math.max(0, totalSale - paid);
  const receiptNo = (tx.id || "000000").slice(-6).toUpperCase();
  const isPayment = tx.type === 'payment';
  const isWriteOff = tx.type === 'payment' && tx.note?.startsWith('[FORGIVEN]');
  const forgiveReason = isWriteOff ? tx.note.replace('[FORGIVEN] ', '') : tx.note;
  const method = tx.paymentMethod;

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
    if (isWriteOff) {
      L.push(`🤝 DEBT FORGIVEN: ${formatCurrency(paid, currency)}`);
      if (forgiveReason) L.push(`Reason: ${forgiveReason}`);
    } else if (isPayment) {
      L.push(`PAYMENT RECEIVED: ${formatCurrency(paid, currency)}`);
      if (method) L.push(`Method: ${method}`);
    } else {
      if (items.length > 0) {
        items.forEach(i => {
          const qty = parseFloat(i.quantity) || 0;
          const price = parseFloat(i.price) || 0;
          L.push(`${i.name}${i.brand ? ` (${i.brand})` : ""}`);
          L.push(`  ${qty} ${i.unitName || ""} x ${formatCurrency(price, currency)} = ${formatCurrency(qty * price, currency)}`);
        });
      } else {
        L.push("(No item breakdown recorded)");
      }
      L.push("──────────────────────");
      L.push(`TOTAL: ${formatCurrency(totalSale, currency)}`);
      if (discount > 0) L.push(`Discount: ${formatCurrency(discount, currency)}`);
      L.push(`PAID: ${formatCurrency(paid, currency)}`);
      L.push(`OUTSTANDING: ${formatCurrency(outstanding, currency)}`);
    }
    if (forgiveReason && !isWriteOff) L.push(`Note: ${forgiveReason}`);
    if (tx.status === 'cancelled') L.push(`🚫 CANCELLED: ${tx.cancel_reason || tx.cancelReason || ""}`);
    L.push("");
    L.push("Thank you for your business! 🙏");
    openWhatsApp(customer?.phone || "", L.join("\n"));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-50 dark:bg-gray-950 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={20} className={isWriteOff ? "text-purple-600" : isPayment ? "text-blue-600" : "text-green-600"} />
            {isWriteOff ? "Debt Forgiveness" : isPayment ? "Payment Receipt" : "Sale Receipt"}
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
                {method === 'momo' ? <Smartphone size={14} /> : method === 'bank' ? <CreditCard size={14} /> : <Banknote size={14} />}
                {method}
              </span></div>
            )}
          </div>

          <div className="border-t-2 border-dashed border-gray-300 dark:border-gray-700" />

          {isWriteOff ? (
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
          ) : (
            <>
              {!isPayment && (
                items.length > 0 ? (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-dashed divide-gray-200 dark:divide-gray-800">
                    <div className="p-3 pb-2">
                      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Items ({items.length})</p>
                    </div>
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
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {qty} {item.unitName || "unit"} × {formatCurrency(price, currency)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-1">No item breakdown recorded for this sale.</p>
                )
              )}

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-2">
                {isPayment ? (
                  <div className="flex justify-between text-lg font-bold"><span className="text-gray-700 dark:text-gray-300">Amount Received</span><span className="text-green-600 dark:text-green-400">{formatCurrency(paid, currency)}</span></div>
                ) : (
                  <>
                    <div className="flex justify-between text-base"><span className="text-gray-600 dark:text-gray-300">Total Sale</span><span className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalSale, currency)}</span></div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Discount</span><span className="font-semibold text-purple-600 dark:text-purple-400">-{formatCurrency(discount, currency)}</span></div>
                    )}
                    <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Paid Upfront</span><span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(paid, currency)}</span></div>
                    <div className="flex justify-between text-base pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                      <span className="font-bold text-gray-700 dark:text-gray-200">Outstanding</span>
                      <span className={`font-bold ${outstanding > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>{formatCurrency(outstanding, currency)}</span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {forgiveReason && !isWriteOff && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-xl p-3">
              <p className="text-[10px] font-bold text-yellow-700 dark:text-yellow-400 uppercase mb-1">Note</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{forgiveReason}</p>
            </div>
          )}

          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">Thank you for your business! 🙏</p>
        </div>

        <div className="p-4 pt-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 space-y-2">
          {customer?.phone && !isWriteOff && (
            <button onClick={handleShare} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition">
              <Share2 size={18} /> Share Receipt (WhatsApp)
            </button>
          )}
          {isActive(tx) && (
            isWriteOff ? (
              <button onClick={() => onCancel(tx)} className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition">
                <Ban size={18} /> Cancel Forgiveness
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onFix(tx)} className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition">
                  <Edit3 size={18} /> Fix
                </button>
                <button onClick={() => onCancel(tx)} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition">
                  <Ban size={18} /> Cancel
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// FORGIVE DEBT MODAL (reason required)
// ==========================================
const ForgiveDebtModal = ({ isOpen, onClose, onConfirm, balance, currency, customerName }) => {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(balance > 0 ? String(balance) : "");
      setReason("");
      setIsSaving(false);
    }
  }, [isOpen, balance]);

  if (!isOpen) return null;

  const amt = parseFloat(amount) || 0;
  const valid = amt > 0 && amt <= balance && reason.trim().length > 0;

  const handleConfirm = async () => {
    if (!valid) return;
    setIsSaving(true);
    try {
      await onConfirm(amt, reason.trim());
    } catch (e) {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full"><HeartHandshake size={20} className="text-purple-600 dark:text-purple-400" /></div>
          <div>
            <h3 className="font-bold text-xl text-gray-900 dark:text-white">Forgive Debt</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{customerName}</p>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-xl p-3 mb-4 flex justify-between items-center">
          <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase">Current Outstanding</span>
          <span className="font-bold text-purple-700 dark:text-purple-400">{formatCurrency(balance, currency)}</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Amount to Forgive</label>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white font-bold text-sm"
            />
            {amt > balance && <p className="mt-1 text-[10px] font-semibold text-red-600 dark:text-red-400">Cannot forgive more than the outstanding balance.</p>}
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Reason (required)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer is unable to pay due to hardship..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm"
              rows="3"
            />
          </div>

          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            This permanently reduces the customer's debt and is recorded in history with your reason. You can cancel it later if done by mistake.
          </p>

          <div className="flex gap-3">
            <button onClick={onClose} disabled={isSaving} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl disabled:opacity-60">Go Back</button>
            <button
              onClick={handleConfirm}
              disabled={!valid || isSaving}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? <><Loader2 className="animate-spin" size={16} /> Forgiving...</> : <><HeartHandshake size={16} /> Forgive</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// REASON MODALS (Android-safe)
// ==========================================
const FixReasonModal = ({ isOpen, onClose, onConfirm, fixReason, setFixReason }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full"><Edit3 size={20} className="text-blue-600 dark:text-blue-400" /></div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Reason for Fix</h3>
        </div>
        <textarea
          value={fixReason}
          onChange={(e) => setFixReason(e.target.value)}
          placeholder="e.g., Recorded wrong amount..."
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 caret-blue-600 dark:caret-blue-400 mb-4 text-sm"
          rows="3"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl active:scale-95 transition">Continue</button>
        </div>
      </div>
    </div>
  );
};

const CancelModal = ({ isOpen, onClose, onConfirm, cancelReason, setCancelReason, type }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full"><AlertTriangle size={20} className="text-red-600 dark:text-red-400" /></div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Cancel {type === 'payment' ? 'Payment' : 'Transaction'}?</h3>
        </div>
        <textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Type the reason here..."
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 caret-red-600 dark:caret-red-400 mb-4 text-sm"
          rows="3"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">Go Back</button>
          <button onClick={onConfirm} disabled={!cancelReason.trim()} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 active:scale-95 transition">Yes, Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export const CustomerProfilePage = () => {
  const { currentStore, selectedCustomer, setSelectedCustomer, setView, setPrefillTransaction, setFixTransaction, showToast } = useStore();
  const currency = currentStore?.currency || "GH₵";

  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [customerData, setCustomerData] = useState(selectedCustomer);
  const [history, setHistory] = useState([]);
  const [expandedOldTx, setExpandedOldTx] = useState(null);
  const [showFixModal, setShowFixModal] = useState(false);
  const [fixReason, setFixReason] = useState("");
  const [txToFix, setTxToFix] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showForgiveModal, setShowForgiveModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    if (selectedCustomer?.id) {
      CustomerService.getById(selectedCustomer.id).then(setCustomerData);
      TransactionService.getHistory(selectedCustomer.id).then(res => setHistory(normalizeList(res)));
    }
  }, [selectedCustomer?.id]);

  useEffect(() => {
    setVisibleCount(10);
  }, [selectedCustomer?.id]);

  if (!customerData) return null;

  // ==========================================
  // CALCULATIONS (write_off reduces the balance)
  // ==========================================
  const getTrueOutstanding = (sale) => Math.max(0, (parseFloat(sale.amount) || 0) - (parseFloat(sale.paid) || 0));
  const lastPayment = useMemo(() => history.find(tx => (parseFloat(tx.paid) || 0) > 0 && (tx.type === 'payment' || tx.type === 'sale') && isActive(tx)), [history]);
  const outstandingInvoices = useMemo(() =>
    history
      .filter(tx => tx.type === 'sale' && isActive(tx) && getTrueOutstanding(tx) > 0)
      .map(tx => ({ ...tx, trueOutstanding: getTrueOutstanding(tx) })),
    [history]);
  const trueBalance = useMemo(() => {
    let bal = 0;
    history.forEach(t => {
      if (!isActive(t)) return;
      const amt = parseFloat(t.amount) || 0;
      const pd = parseFloat(t.paid) || 0;
      if (t.type === 'sale') bal += amt - pd;
      else if (t.type === 'payment') bal -= pd;
    });
    return bal;
  }, [history]);
  const totalSales = history.reduce((sum, t) => sum + ((parseFloat(t.amount) || 0) > 0 && t.type === 'sale' && isActive(t) ? (parseFloat(t.amount) || 0) : 0), 0);
  const totalPayments = history.reduce((sum, t) => sum + ((parseFloat(t.paid) || 0) > 0 && t.type !== 'payment' || !tx.note?.startsWith('[FORGIVEN]') && isActive(t) ? (parseFloat(t.paid) || 0) : 0), 0);

  const visibleHistory = useMemo(() => history.filter(tx => !tx.replacedByTransactionId), [history]);
  const pagedHistory = useMemo(() => visibleHistory.slice(0, visibleCount), [visibleHistory, visibleCount]);

  const daysSinceLastActive = useMemo(() => {
    const last = customerData.lastActivity || customerData.last_activity;
    if (!last) return null;
    const days = Math.floor((new Date() - new Date(last)) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  }, [customerData]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleRecordSale = () => {
    setPrefillTransaction({ customerId: customerData.id, name: customerData.name, phone: customerData.phone, amount: "", paid: "0" });
    setView("record");
  };

  const handleReceivePayment = () => setView("recordPayment");

  const handleShareAccount = async (shareData) => {
    try {
      const reference = AccountShareService.generateShareReference();
      await AccountShareService.logShare({
        storeId: currentStore.id,
        contactId: customerData.id,
        channel: shareData.channel,
        scope: shareData.scope,
        reference
      });
      showToast("✅ Account shared successfully");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to log share event");
    }
  };

  const handleFixTransaction = (tx) => {
    setTxToFix(tx);
    setFixReason("");
    setShowFixModal(true);
  };

  const confirmFix = () => {
    setFixTransaction({ ...txToFix, fixReason: fixReason });
    setShowFixModal(false);
    setViewingTransaction(null);
    setView(txToFix.type === 'payment' ? 'recordPayment' : 'record');
  };

  const handleCancelTransaction = (tx) => {
    setCancelReason("");
    setShowCancelModal(true);
  };

  const executeCancelTransaction = async () => {
    if (!cancelReason.trim()) { showToast("⚠️ Please provide a reason."); return; }
    setShowCancelModal(false);
    try {
      await TransactionService.cancelTransaction(viewingTransaction.id, cancelReason);

      const updatedHistory = await TransactionService.getHistory(customerData.id);
      let bal = 0;
      (Array.isArray(updatedHistory) ? updatedHistory : []).forEach(t => {
        if (!isActive(t)) return;
        const amt = parseFloat(t.amount) || 0;
        const pd = parseFloat(t.paid) || 0;
        if (t.type === 'sale') bal += amt - pd;
        else if (t.type === 'payment') bal -= pd;
      });
      await CustomerService.updateBalance(customerData.id, bal);

      const updated = await CustomerService.getById(customerData.id);
      setCustomerData(updated);
      setHistory(normalizeList(updatedHistory));
      setViewingTransaction(null);
      showToast("✅ Transaction cancelled!");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to cancel.");
    }
    setCancelReason("");
  };

  const executeForgiveDebt = async (amount, reason) => {
    try {
      await TransactionService.recordWriteOff(currentStore.id, customerData.id, amount, reason);

      const updatedHistory = await TransactionService.getHistory(customerData.id);
      let bal = 0;
      (Array.isArray(updatedHistory) ? updatedHistory : []).forEach(t => {
        if (!isActive(t)) return;
        const amt = parseFloat(t.amount) || 0;
        const pd = parseFloat(t.paid) || 0;
        if (t.type === 'sale') bal += amt - pd;
        else if (t.type === 'payment') bal -= pd;
      });
      await CustomerService.updateBalance(customerData.id, bal);

      const updated = await CustomerService.getById(customerData.id);
      setCustomerData(updated);
      setHistory(normalizeList(updatedHistory));
      setShowForgiveModal(false);
      showToast(`🤝 ${formatCurrency(amount, currency)} of debt forgiven`);
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to forgive debt");
      throw error;
    }
  };

  const toggleOldReceipt = async (tx) => {
    if (expandedOldTx && expandedOldTx.id === tx.correctsTransactionId) {
      setExpandedOldTx(null);
    } else {
      const oldTx = await TransactionService.getById(tx.correctsTransactionId);
      setExpandedOldTx(normalizeTx(oldTx));
    }
  };

  const handleDeleteCustomer = async () => {
    try {
      await CustomerService.delete(customerData.id);
      showToast(`🗑️ ${customerData.name} deleted`);
      setSelectedCustomer(null);
      setView("customers");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to delete customer");
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Customer Profile" showBack={true} onBack={() => { setView("customers"); setSelectedCustomer(null); }} />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-5">
        <CustomerHeader customer={customerData} daysSinceLastActive={daysSinceLastActive} onEdit={() => setIsEditModalOpen(true)} />
        <BalanceCard balance={trueBalance} lastPayment={lastPayment} currency={currency} />

        {trueBalance > 0 && (
          <button
            onClick={() => setShowForgiveModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-purple-200 dark:border-purple-900/40 text-purple-600 dark:text-purple-400 text-sm font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/10 active:scale-95 transition"
          >
            <HeartHandshake size={16} /> Forgive Debt (Write Off)
          </button>
        )}

        <QuickActions
          onSale={handleRecordSale}
          onPayment={handleReceivePayment}
          onCall={() => openDialer(customerData.phone)}
          onShare={() => setShowShareModal(true)}
        />
        <OutstandingInvoices invoices={outstandingInvoices} onView={setViewingTransaction} currency={currency} />
        <TransactionHistory
          history={pagedHistory}
          onView={setViewingTransaction}
          onToggleOld={toggleOldReceipt}
          expandedOldTx={expandedOldTx}
          setViewingTransaction={setViewingTransaction}
          currency={currency}
          hasMore={visibleHistory.length > visibleCount}
          onLoadMore={() => setVisibleCount(c => c + 10)}
          shownCount={pagedHistory.length}
          totalCount={visibleHistory.length}
        />
        <MoreInformation totalSales={totalSales} totalPayments={totalPayments} historyLength={visibleHistory.length} createdAt={customerData.created_at || customerData.createdAt} currency={currency} />

        <div className="pt-2">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/10 active:scale-95 transition"
          >
            <Trash2 size={16} /> Delete this customer
          </button>
        </div>
      </div>

      {!showFixModal && !showCancelModal && (
        <ReceiptModal
          tx={viewingTransaction}
          customer={customerData}
          currentStore={currentStore}
          onClose={() => setViewingTransaction(null)}
          onFix={handleFixTransaction}
          onCancel={handleCancelTransaction}
          currency={currency}
        />
      )}
      <FixReasonModal isOpen={showFixModal} onClose={() => setShowFixModal(false)} onConfirm={confirmFix} fixReason={fixReason} setFixReason={setFixReason} />
      <CancelModal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} onConfirm={executeCancelTransaction} cancelReason={cancelReason} setCancelReason={setCancelReason} type={viewingTransaction?.type} />
      <ShareAccountModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        contact={customerData}
        transactions={history}
        store={currentStore}
        onShared={handleShareAccount}
      />
      <AddCustomerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customer={customerData}
        onSaved={() => {
          CustomerService.getById(customerData.id).then(setCustomerData);
        }}
      />
      <DeleteContactModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteCustomer}
        contact={customerData}
        type="customer"
        transactions={history}
        currency={currency}
      />
      <ForgiveDebtModal
        isOpen={showForgiveModal}
        onClose={() => setShowForgiveModal(false)}
        onConfirm={executeForgiveDebt}
        balance={trueBalance}
        currency={currency}
        customerName={customerData.name}
      />
    </div>
  );
};