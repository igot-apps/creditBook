import { useState, useMemo } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { formatCurrency } from "../utils/helpers";
import { TransactionService } from "../services/TransactionService";

export const DeleteContactModal = ({ isOpen, onClose, onConfirm, contact, type = "customer", transactions = [], currency = "GH₵" }) => {
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate stats to show the user what they're about to destroy
  const stats = useMemo(() => {
    const active = (transactions || []).filter(t => t.status === 'active' || !t.status);
    const sales = active.filter(t => t.type === 'sale' || t.type === 'purchase');
    const payments = active.filter(t => t.type === 'payment' || t.type === 'supplier_payment');
    const totalSales = sales.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const totalPaid = active.reduce((s, t) => s + (parseFloat(t.paid) || 0), 0);
    const outstanding = Math.max(0, totalSales - totalPaid);
    return {
      transactionCount: active.length,
      totalSales,
      totalPaid,
      outstanding
    };
  }, [transactions]);

  const canDelete = confirmation.trim().toLowerCase() === "yes";
  const typeLabel = type === "supplier" ? "Supplier" : "Customer";

  if (!isOpen || !contact) return null;

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      await onConfirm();
      setConfirmation("");
      onClose();
    } catch (error) {
      console.error(error);
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmation("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4" onClick={handleClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/40 p-5 flex items-start gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full flex-shrink-0">
            <AlertTriangle size={22} className="text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-red-700 dark:text-red-400">Delete {typeLabel} Permanently?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              You are about to delete <span className="font-bold text-gray-900 dark:text-white">{contact.name}</span>.
              This action <span className="font-bold text-red-600 dark:text-red-400">cannot be undone</span>.
            </p>
          </div>
          <button onClick={handleClose} disabled={isDeleting} className="p-1.5 bg-white/60 dark:bg-gray-800 rounded-full hover:bg-white dark:hover:bg-gray-700 transition">
            <X size={16} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* What gets deleted */}
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">What will be deleted:</p>
            <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span><span className="font-bold">{stats.transactionCount}</span> transaction{stats.transactionCount !== 1 ? "s" : ""}</span>
              </li>
              {stats.totalSales > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>{formatCurrency(stats.totalSales, currency)} in {type === "supplier" ? "purchases" : "sales"} history</span>
                </li>
              )}
              {stats.totalPaid > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>{formatCurrency(stats.totalPaid, currency)} in payment records</span>
                </li>
              )}
              {stats.outstanding > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(stats.outstanding, currency)} outstanding balance
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* Confirmation input */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">
              Type <span className="text-red-600 dark:text-red-400 font-mono">yes</span> to confirm deletion
            </label>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canDelete) handleDelete(); }}
              placeholder="yes"
              disabled={isDeleting}
              autoFocus
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white font-mono text-sm disabled:opacity-60"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleClose}
              disabled={isDeleting}
              className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!canDelete || isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              {isDeleting ? (
                <><Loader2 className="animate-spin" size={18} /> Deleting...</>
              ) : (
                <><Trash2 size={16} /> Delete Permanently</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};