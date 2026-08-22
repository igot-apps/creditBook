import { useState, useEffect } from "react";
import { AlertTriangle, ArrowRight, ChevronDown } from "lucide-react";
import { formatCurrency, formatDate } from "../../../utils/helpers";
import { txDate } from "../utils/helpers";

export const OutstandingInvoices = ({ invoices, onView, currency }) => {
  const [visibleCount, setVisibleCount] = useState(5);
  useEffect(() => { setVisibleCount(5); }, [invoices]);
  if (invoices.length === 0) return null;

  const visible = invoices.slice(0, visibleCount);
  const hasMore = invoices.length > visibleCount;

  return (
    <div>
      <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1 flex items-center justify-between gap-1">
        <span className="flex items-center gap-1"><AlertTriangle size={12} className="text-orange-500" /> Unpaid Invoices ({invoices.length})</span>
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{Math.min(visibleCount, invoices.length)} of {invoices.length}</span>
      </h3>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
        {visible.map(tx => (
          <button key={tx.id} onClick={() => onView(tx)} className="w-full flex items-center justify-between p-3 active:bg-gray-50 dark:active:bg-gray-700/50 transition text-left">
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{formatCurrency(tx.trueOutstanding, currency)} unpaid</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {formatDate(txDate(tx)).split(',')[0]}
                {tx.allocated > 0 && <span className="ml-1 text-green-600 dark:text-green-400 font-bold">• partially paid</span>}
              </p>
            </div>
            <ArrowRight size={16} className="text-gray-400" />
          </button>
        ))}
      </div>
      {hasMore && (
        <button onClick={() => setVisibleCount(c => c + 5)} className="w-full mt-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800/50 active:scale-[0.98] transition flex items-center justify-center gap-1.5">
          <ChevronDown size={14} /> See More ({visible.length} of {invoices.length})
        </button>
      )}
    </div>
  );
};