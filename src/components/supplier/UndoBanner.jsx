import { Check, Undo2 } from "lucide-react";
import { formatCurrency } from "../../utils/helpers";

export const UndoBanner = ({ transaction, currency, onUndo, onDismiss }) => {
  if (!transaction) return null;

  return (
    <div className="sticky top-16 z-30 bg-green-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Check size={20} className="flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-sm">Purchase recorded!</p>
          <p className="text-xs opacity-90 truncate">
            {formatCurrency(transaction.amount, currency)} • Paid {formatCurrency(transaction.paid, currency)}
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onUndo}
          className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition"
        >
          <Undo2 size={14} /> Undo
        </button>
        <button
          onClick={onDismiss}
          className="bg-white text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition"
        >
          Done
        </button>
      </div>
    </div>
  );
};