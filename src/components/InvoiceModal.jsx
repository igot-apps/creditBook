import { X, Printer } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { formatCurrency, formatDate } from "../utils/helpers";

export const InvoiceModal = ({ onClose, transaction }) => {
  const { currentStore, selectedCustomer } = useApp();

  if (!transaction || !selectedCustomer || !currentStore) return null;

  const handlePrint = () => {
    window.print();
  };

  // Safely convert numeric ID to a padded string (e.g., 6 becomes "0006")
  const receiptNumber = String(transaction.id).padStart(4, '0');

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm print:bg-white print:static print:p-0">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl print:max-w-none print:rounded-none print:shadow-none print:h-auto">
        
        {/* Screen-only header (Hidden when printing) */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 print:hidden sticky top-0 bg-white z-10">
          <h3 className="font-bold text-lg text-gray-900">Invoice / Receipt</h3>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="p-2 bg-green-700 text-white rounded-lg hover:bg-green-800 active:scale-95 transition flex items-center gap-2 text-sm font-semibold">
              <Printer size={16} /> Print
            </button>
            <button onClick={onClose} className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 active:scale-95 transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable content */}
        <div className="p-6 print:p-8 text-gray-900">
          {/* Store header */}
          <div className="text-center border-b-2 border-green-700 pb-4 mb-6">
            <div className="w-16 h-16 bg-green-700 rounded-full mx-auto mb-3 flex items-center justify-center text-yellow-400 font-bold text-2xl shadow-md">
              {currentStore.name.charAt(0)}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{currentStore.name}</h2>
            <p className="text-sm text-gray-600 mt-1">{currentStore.phone}</p>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Official Receipt</p>
          </div>

          {/* Invoice info */}
          <div className="flex justify-between mb-6 text-sm">
            <div>
              <p className="font-bold text-gray-700 mb-1 uppercase text-xs">Bill To:</p>
              <p className="text-lg font-semibold text-gray-900">{selectedCustomer.name}</p>
              <p className="text-gray-600">{selectedCustomer.phone}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-700 mb-1 uppercase text-xs">Receipt #</p>
              <p className="text-gray-900 font-mono">{receiptNumber}</p>
              <p className="text-gray-600 mt-2">{formatDate(transaction.date)}</p>
            </div>
          </div>

          {/* Items */}
          <table className="w-full mb-6 border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 text-sm font-bold text-gray-700 uppercase">Description</th>
                <th className="text-right py-2 text-sm font-bold text-gray-700 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 text-gray-900">{transaction.items || "General Purchase"}</td>
                <td className="text-right font-semibold text-gray-900">{formatCurrency(transaction.amount)}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="space-y-3 border-t-2 border-gray-200 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Previous Balance:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(transaction.prevBalance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">New Purchase:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(transaction.amount)}</span>
            </div>
            <div className="flex justify-between text-sm text-green-700 font-bold">
              <span>Amount Paid:</span>
              <span>- {formatCurrency(transaction.paid)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t border-gray-200 pt-3 mt-3">
              <span className="text-gray-900">New Balance:</span>
              <span className={transaction.newBalance > 0 ? "text-red-600" : transaction.newBalance < 0 ? "text-blue-600" : "text-green-600"}>
                {transaction.newBalance < 0 ? `Credit: ${formatCurrency(Math.abs(transaction.newBalance))}` : formatCurrency(transaction.newBalance)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-500 border-t border-dashed border-gray-300 pt-4">
            <p className="font-semibold text-gray-700 mb-1">Thank you for your business!</p>
            <p>Generated by CreditBook</p>
          </div>
        </div>
      </div>
    </div>
  );
};