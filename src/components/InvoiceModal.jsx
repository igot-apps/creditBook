import { X, Printer, Download } from "lucide-react";
import useStore from "../store/useStore"; // 👈 CHANGED to useStore
import { formatCurrency, formatDate } from "../utils/helpers";

export const InvoiceModal = ({ transaction, onClose }) => {
  // 👈 CHANGED to useStore
  const { currentStore, customers } = useStore();

  if (!transaction || !currentStore) return null;

  // Find customer details for the invoice header
  const customer = customers.find(c => c.id === transaction.customerId) || { name: "Walk-in Customer", phone: "" };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm print:bg-white print:p-0">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-full">
        
        {/* Modal Header (Hidden when printing) */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 print:hidden">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Transaction Receipt</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            <X size={20} className="text-gray-700 dark:text-gray-200" />
          </button>
        </div>

        {/* Invoice Content */}
        <div className="p-6 print:p-0">
          {/* Store Header */}
          <div className="text-center mb-6 border-b border-dashed border-gray-300 dark:border-gray-600 pb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{currentStore.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentStore.phone}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(transaction.date)}</p>
          </div>

          {/* Customer Info */}
          <div className="mb-6">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Billed To:</p>
            <p className="font-bold text-gray-900 dark:text-white text-lg">{customer.name}</p>
            {customer.phone && <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</p>}
          </div>

          {/* Transaction Details */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Items:</span>
              <span className="font-medium text-gray-900 dark:text-white text-right max-w-[60%]">{transaction.items || "General Purchase"}</span>
            </div>
            
            {/* If it's a detailed invoice, show line items */}
            {transaction.invoiceItems && transaction.invoiceItems.length > 0 && (
              <div className="mt-3 border-t border-b border-gray-100 dark:border-gray-700 py-2 space-y-2">
                {transaction.invoiceItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{formatCurrency(item.quantity * item.price)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-900 dark:text-white">Total Amount</span>
              <span className="text-gray-900 dark:text-white">{formatCurrency(transaction.amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600 dark:text-green-400">Amount Paid</span>
              <span className="text-green-600 dark:text-green-400 font-semibold">-{formatCurrency(transaction.paid)}</span>
            </div>
            <div className={`flex justify-between text-xl font-bold pt-2 border-t-2 border-gray-900 dark:border-gray-100 ${transaction.newBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
              <span>Balance Due</span>
              <span>{formatCurrency(transaction.newBalance)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 dark:text-gray-500 pt-4 border-t border-dashed border-gray-300 dark:border-gray-600">
            <p>Thank you for your business!</p>
            <p className="mt-1">This is a computer-generated receipt.</p>
          </div>
        </div>

        {/* Action Buttons (Hidden when printing) */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-3 print:hidden">
          <button 
            onClick={handlePrint}
            className="flex-1 bg-gray-900 dark:bg-gray-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Printer size={18} /> Print / Save PDF
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3 rounded-xl active:scale-95 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};