import { X, FileText, Edit3, Ban, Share2 } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { openWhatsApp } from "../utils/communication";
import { TransactionService } from "../services/TransactionService";
import { CustomerService } from "../services/CustomerService";
import { SupplierService } from "../services/SupplierService";

export const ReceiptModal = ({ transaction, onClose, onUpdated }) => {
  const { currentStore, setView, setFixTransaction, showToast } = useStore();

  if (!transaction) return null;

  const currency = currentStore?.currency || "GH₵";
  const isSupplierType = transaction.type === 'purchase' || transaction.type === 'supplier_payment';
  const title = isSupplierType ? "Purchase Receipt" : "Sale Receipt";

  const items = Array.isArray(transaction.items) ? transaction.items : [];
  const totalSale = parseFloat(transaction.amount) || 0;
  const discount = parseFloat(transaction.discount) || 0;
  const paid = parseFloat(transaction.paid) || 0;
  const outstanding = Math.max(0, totalSale - paid);
  const receiptNo = (transaction.id || "000000").slice(-6).toUpperCase();
  const dateStr = new Date(transaction.created_at || transaction.createdAt || Date.now())
    .toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const contactName = transaction.contactName || "Walk-in";
  const contactPhone = transaction.contactPhone || "";
  const method = transaction.payment_method;

  /* ---------- Actions ---------- */
  const handleFix = () => {
    setFixTransaction(transaction);
    onClose();
    setView(isSupplierType ? 'recordSupplierPurchase' : 'record');
  };

  const handleCancel = async () => {
    const reason = window.prompt("Reason for cancelling this transaction?", "Entered by mistake");
    if (reason === null) return;

    try {
      await TransactionService.cancelTransaction(transaction.id, reason || "Cancelled");

      // Recalculate the contact's balance from all active transactions
      const history = await TransactionService.getHistory(transaction.contact_id || transaction.contactId);
      let bal = 0;
      (Array.isArray(history) ? history : []).forEach(tx => {
        if (!(tx.status === 'active' || !tx.status)) return;
        const amt = parseFloat(tx.amount) || 0;
        const pd = parseFloat(tx.paid) || 0;
        if (tx.type === 'sale' || tx.type === 'purchase') bal += amt - pd;
        else if (tx.type === 'payment' || tx.type === 'supplier_payment') bal -= pd;
      });

      const service = isSupplierType ? SupplierService : CustomerService;
      await service.updateBalance(transaction.contact_id || transaction.contactId, bal);

      showToast("🚫 Transaction cancelled");
      onClose();
      if (onUpdated) onUpdated();
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to cancel transaction");
    }
  };

  const handleShare = () => {
    const L = [];
    L.push(`${currentStore?.name || "Store"}`);
    if (currentStore?.owner_name || currentStore?.ownerName) L.push(currentStore?.owner_name || currentStore?.ownerName);
    if (currentStore?.phone) L.push(`Tel: ${currentStore.phone}`);
    L.push("──────────────────────");
    L.push(`Receipt #: ${receiptNo}`);
    L.push(`Date: ${dateStr}`);
    L.push(`${isSupplierType ? "Supplier" : "Customer"}: ${contactName}`);
    L.push("──────────────────────");
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
    if (transaction.note) L.push(`Note: ${transaction.note}`);
    L.push("");
    L.push("Thank you for your business! 🙏");
    openWhatsApp(contactPhone, L.join("\n"));
  };

  /* ---------- Render ---------- */
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-gray-50 dark:bg-gray-950 w-full max-w-lg rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-gray-50 dark:bg-gray-950 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <FileText size={22} className={isSupplierType ? "text-indigo-600 dark:text-indigo-400" : "text-green-600 dark:text-green-400"} />
            <h2 className="font-bold text-xl text-gray-900 dark:text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2.5 bg-gray-200 dark:bg-gray-800 rounded-full active:scale-95 transition">
            <X size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Store Identity */}
          <div className="text-center">
            <p className="font-bold text-lg text-gray-900 dark:text-white">{currentStore?.name || "My Store"}</p>
            {(currentStore?.owner_name || currentStore?.ownerName) && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{currentStore?.owner_name || currentStore?.ownerName}</p>
            )}
            {currentStore?.phone && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Tel: {currentStore.phone}</p>
            )}
            {currentStore?.location && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{currentStore.location}</p>
            )}
          </div>

          <div className="border-t-2 border-dashed border-gray-300 dark:border-gray-700" />

          {/* Meta */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Receipt #</span>
              <span className="font-bold text-gray-900 dark:text-white">#{receiptNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Date</span>
              <span className="font-semibold text-gray-900 dark:text-white">{dateStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">{isSupplierType ? "Supplier" : "Customer"}</span>
              <span className="font-semibold text-gray-900 dark:text-white">{contactName}</span>
            </div>
            {method && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Method</span>
                <span className="font-semibold text-gray-900 dark:text-white capitalize">{method}</span>
              </div>
            )}
          </div>

          <div className="border-t-2 border-dashed border-gray-300 dark:border-gray-700" />

          {/* Itemized Products */}
          {items.length > 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-dashed divide-gray-200 dark:divide-gray-800">
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
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-2">No item breakdown recorded for this transaction.</p>
          )}

          {/* Totals */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-2">
            <div className="flex justify-between text-base">
              <span className="text-gray-600 dark:text-gray-300">Total {isSupplierType ? "Purchase" : "Sale"}</span>
              <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalSale, currency)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Discount</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">-{formatCurrency(discount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Paid</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(paid, currency)}</span>
            </div>
            <div className="flex justify-between text-base pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
              <span className="font-bold text-gray-700 dark:text-gray-200">Outstanding</span>
              <span className={`font-bold ${outstanding > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}>
                {formatCurrency(outstanding, currency)}
              </span>
            </div>
          </div>

          {/* Note */}
          {transaction.note && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-xl p-3">
              <p className="text-[10px] font-bold text-yellow-700 dark:text-yellow-400 uppercase mb-1">Note</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{transaction.note}</p>
            </div>
          )}

          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">Thank you for your business! 🙏</p>
        </div>

        {/* Actions */}
        <div className="p-5 pt-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 space-y-2 bg-gray-50 dark:bg-gray-950">
          {contactPhone && (
            <button
              onClick={handleShare}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <Share2 size={18} /> Share Receipt (WhatsApp)
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleFix}
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <Edit3 size={16} /> Fix
            </button>
            <button
              onClick={handleCancel}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <Ban size={16} /> Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};