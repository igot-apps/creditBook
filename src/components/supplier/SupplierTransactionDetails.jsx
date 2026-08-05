import { useState } from "react";
import { X, Ban, RotateCcw, AlertTriangle, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "../../utils/helpers";
// 👇 UPDATED: Now imports from the same folder
import { TransactionItemsList } from "./TransactionItemsList";

export const SupplierTransactionDetails = ({ 
  transaction, 
  currency = "GH₵", 
  onClose, 
  onCancel, 
  onRedo 
}) => {
  if (!transaction) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center z-10">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={20} className="text-indigo-600" /> Purchase Receipt
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <X size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          
          {/* Status Badge */}
          <div className="flex justify-center">
            {transaction.isVoid ? (
              <span className="px-4 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-bold uppercase tracking-wider">
                Canceled Transaction
              </span>
            ) : (
              <span className="px-4 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider">
                Completed
              </span>
            )}
          </div>

          {/* Items List */}
          <TransactionItemsList 
            items={transaction.items} 
            currency={currency} 
            isVoid={transaction.isVoid} 
          />

          {/* Transaction Details */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Date</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatDate(transaction.date)}
              </span>
            </div>
            {transaction.note && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Note</span>
                <span className="font-semibold text-gray-900 dark:text-white text-right max-w-[60%] truncate">
                  {transaction.note}
                </span>
              </div>
            )}
            <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-2"></div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total Purchase</span>
              <span className={`font-bold ${transaction.isVoid ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                {formatCurrency(transaction.amount, currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Amount Paid</span>
              <span className={`font-bold ${transaction.isVoid ? 'line-through text-gray-400' : 'text-green-600 dark:text-green-400'}`}>
                {formatCurrency(transaction.paid, currency)}
              </span>
            </div>
            <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-2"></div>
            <div className="flex justify-between text-base">
              <span className="font-bold text-gray-700 dark:text-gray-300">Balance Impact</span>
              <span className={`font-bold ${transaction.isVoid ? 'text-gray-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {formatCurrency(transaction.newBalance - transaction.prevBalance, currency)}
              </span>
            </div>
          </div>

          {/* Cancellation Reason */}
          {transaction.isVoid && transaction.voidReason && (
            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1 mb-1">
                <AlertTriangle size={10} /> Reason for Cancellation
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                {transaction.voidReason}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2">
            {!transaction.isVoid ? (
              <button 
                onClick={onCancel}
                className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Ban size={18} /> Cancel this Transaction
              </button>
            ) : (
              <button 
                onClick={onRedo}
                className="w-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <RotateCcw size={18} /> Redo / Restore Transaction
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};