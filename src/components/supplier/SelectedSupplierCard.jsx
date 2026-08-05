import { AlertCircle } from "lucide-react";
import { formatCurrency, formatDate } from "../../utils/helpers";

export const SelectedSupplierCard = ({ supplier, onChange }) => {
  const lastPurchase = supplier?.history?.filter(t => t.amount > 0 && !t.isVoid).slice(-1)[0];

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/30">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
          {supplier.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase font-bold">Buying From</p>
          <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{supplier.name}</p>

          <div className="mt-2 flex flex-wrap gap-2">
            {supplier.balance > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <AlertCircle size={12} className="text-orange-600 dark:text-orange-400" />
                <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400">
                  Currently Owed: {formatCurrency(supplier.balance, "GH₵")}
                </span>
              </div>
            )}
            {lastPurchase && (
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                <span className="text-[11px] text-gray-600 dark:text-gray-400">
                  Last: {formatDate(lastPurchase.date).split(',')[0]} • {formatCurrency(lastPurchase.amount, "GH₵")}
                </span>
              </div>
            )}
          </div>
        </div>
        <button 
          onClick={onChange} 
          className="text-xs text-red-600 dark:text-red-400 underline font-semibold px-2 py-1 flex-shrink-0"
        >
          Change
        </button>
      </div>
    </div>
  );
};