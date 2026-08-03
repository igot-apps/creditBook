import { X, Printer, Store, Phone, Mail, MapPin, FileText } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";

export const InvoiceModal = ({ onClose, transaction, customerName, customerPhone }) => {
  const { currentStore } = useStore();
  if (!transaction) return null;
  const currency = currentStore?.currency || "GH₵";
  const balanceDue = (transaction.amount || 0) - (transaction.paid || 0);

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm print:bg-white print:p-0 print:block">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col print:rounded-none print:shadow-none print:max-h-none print:w-full print:overflow-visible">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 print:hidden">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><FileText size={18} className="text-green-600" /> Receipt Details</h3>
          <button onClick={onClose} className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="bg-gray-50 dark:bg-gray-800/50 p-6 text-center border-b border-dashed border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 bg-green-700 text-white rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold shadow-md">{currentStore?.name?.charAt(0) || <Store size={24} />}</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentStore?.name || "Business Name"}</h2>
            <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
              {currentStore?.address && <p className="flex items-center justify-center gap-1.5"><MapPin size={12} /> {currentStore.address}</p>}
              {currentStore?.phone && <p className="flex items-center justify-center gap-1.5"><Phone size={12} /> {currentStore.phone}</p>}
              {currentStore?.email && <p className="flex items-center justify-center gap-1.5"><Mail size={12} /> {currentStore.email}</p>}
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Receipt No.</p>
                <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">{transaction.invoiceNumber || `#${transaction.id}`}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date Issued</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatDate(transaction.date)}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Billed To</p>
              <p className="font-bold text-gray-900 dark:text-white">{customerName || "Walk-in Customer"}</p>
              {customerPhone && <p className="text-xs text-gray-500 dark:text-gray-400">{customerPhone}</p>}
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Items & Description</p>
              {transaction.invoiceItems && transaction.invoiceItems.length > 0 ? (
                <div className="space-y-2">
                  {transaction.invoiceItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.quantity} {item.unit ? `× ${item.unit}` : 'pcs'} @ {formatCurrency(item.price, currency)}</p>
                      </div>
                      <p className="font-bold text-gray-900 dark:text-white ml-4">{formatCurrency(item.quantity * item.price, currency)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">{transaction.items || "General Purchase"}</div>
              )}
            </div>
            <div className="pt-4 border-t-2 border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Total Amount</span><span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(transaction.amount, currency)}</span></div>
              {transaction.paid > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Amount Paid</span><span className="font-semibold text-green-600 dark:text-green-400">-{formatCurrency(transaction.paid, currency)}</span></div>}
              <div className="flex justify-between items-center pt-3 border-t border-dashed border-gray-300 dark:border-gray-600">
                <span className="text-base font-bold text-gray-900 dark:text-white">Balance Due</span>
                <span className={`text-2xl font-bold font-mono ${balanceDue > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>{formatCurrency(balanceDue, currency)}</span>
              </div>
            </div>
            <div className="pt-6 text-center pb-4">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Thank you for your business!</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-mono">Generated by CreditBook</p>
              {transaction.isVoid && <div className="mt-4 border-2 border-red-500 text-red-500 font-bold text-xl py-2 px-4 rounded-lg transform -rotate-12 inline-block opacity-80">CANCELLED</div>}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex gap-3 print:hidden">
          <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition"><Printer size={18} /> Print</button>
          <button onClick={onClose} className="flex-1 flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition">Close</button>
        </div>
      </div>
    </div>
  );
};