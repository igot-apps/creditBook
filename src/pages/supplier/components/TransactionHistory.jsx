import { Edit3, Ban, Check, FileText, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { formatCurrency, formatDate } from "../../../utils/helpers";
import { txDate } from "../utils/helpers";

export const TransactionHistory = ({ history, onView, onToggleOld, expandedOldTx, setViewingTransaction, currency, hasMore, onLoadMore, shownCount, totalCount }) => {
  const getTimelineIcon = (tx) => {
    if (tx.status === 'being_corrected') return <Edit3 size={16} className="text-yellow-600" />;
    if (tx.status === 'cancelled') return <Ban size={16} className="text-red-500" />;
    if (tx.type === 'supplier_payment') return <Check size={16} className="text-green-500" />;
    if ((parseFloat(tx.amount) || 0) > 0 && (parseFloat(tx.paid) || 0) === 0) return <FileText size={16} className="text-orange-500" />;
    return <FileText size={16} className="text-green-500" />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">Recent Activity</span>
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
            return (
              <div key={tx.id} className="space-y-2">
                <div role="button" tabIndex={0} onClick={() => onView(tx)} className={`w-full text-left p-3 rounded-xl border transition-all active:scale-[0.98] cursor-pointer ${
                  isCancelled ? 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20' :
                  isBeingCorrected ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20' :
                  'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-full ${isInvalid ? (isCancelled ? 'bg-red-100 dark:bg-red-900/40' : 'bg-yellow-100 dark:bg-yellow-900/40') : 'bg-indigo-100 dark:bg-indigo-900/30'}`}>
                        {getTimelineIcon(tx)}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${isInvalid ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                          {tx.type === 'supplier_payment' ? 'Payment' : 'Purchase'}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{formatDate(txDate(tx)).split(',')[0]}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isInvalid ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(tx.amount || tx.paid, currency)}</p>
                      {tx.type === 'purchase' && (parseFloat(tx.paid) || 0) > 0 && !isInvalid && <p className="text-[10px] text-green-600 dark:text-green-400">Paid: {formatCurrency(tx.paid, currency)}</p>}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                    {tx.correctsTransactionId && (
                      <button onClick={(e) => { e.stopPropagation(); onToggleOld(tx); }} className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                        {expandedOldTx && expandedOldTx.id === tx.correctsTransactionId ? <>Hide Previous <ChevronUp size={10} /></> : <>View Previous <ChevronDown size={10} /></>}
                      </button>
                    )}
                    {tx.replacedByTransactionId && (
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 ml-auto">Updated Receipt <ArrowRight size={10} /></p>
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
          <button onClick={onLoadMore} className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800/50 active:scale-[0.98] transition flex items-center justify-center gap-2">
            <ChevronDown size={16} /> Load More Transactions
          </button>
        )}
      </div>
    </div>
  );
};