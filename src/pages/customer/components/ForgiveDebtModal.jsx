import { useState, useEffect } from "react";
import { HeartHandshake, Loader2 } from "lucide-react";
import { formatCurrency } from "../../../utils/helpers";

export const ForgiveDebtModal = ({ isOpen, onClose, onConfirm, balance, currency, customerName }) => {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) { setAmount(balance > 0 ? String(balance) : ""); setReason(""); setIsSaving(false); }
  }, [isOpen, balance]);

  if (!isOpen) return null;
  const amt = parseFloat(amount) || 0;
  const valid = amt > 0 && amt <= balance && reason.trim().length > 0;

  const handleConfirm = async () => {
    if (!valid) return;
    setIsSaving(true);
    try { await onConfirm(amt, reason.trim()); } catch (e) { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full"><HeartHandshake size={20} className="text-purple-600 dark:text-purple-400" /></div>
          <div><h3 className="font-bold text-xl text-gray-900 dark:text-white">Forgive Debt</h3><p className="text-xs text-gray-500 dark:text-gray-400">{customerName}</p></div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-xl p-3 mb-4 flex justify-between items-center">
          <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase">Current Outstanding</span>
          <span className="font-bold text-purple-700 dark:text-purple-400">{formatCurrency(balance, currency)}</span>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Amount to Forgive</label>
            <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white font-bold text-sm" />
            {amt > balance && <p className="mt-1 text-[10px] font-semibold text-red-600 dark:text-red-400">Cannot forgive more than the outstanding balance.</p>}
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Reason (required)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Customer is unable to pay due to hardship..." className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm" rows="3" />
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">This permanently reduces the customer's debt and is recorded in history with your reason. You can cancel it later if done by mistake.</p>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={isSaving} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl disabled:opacity-60">Go Back</button>
            <button onClick={handleConfirm} disabled={!valid || isSaving} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed">
              {isSaving ? <><Loader2 className="animate-spin" size={16} /> Forgiving...</> : <><HeartHandshake size={16} /> Forgive</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};