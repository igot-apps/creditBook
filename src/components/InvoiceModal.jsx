import { X, Printer, Share2, Store, Phone, Mail, MapPin, FileText } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";

export const InvoiceModal = ({ onClose, transaction, customerName, customerPhone }) => {
  const { currentStore } = useStore();
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    // You can integrate WhatsApp/SMS sharing here later
    alert("Share functionality coming soon!");
  };

  const balanceDue = (transaction.amount || 0) - (transaction.paid || 0);

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm print:bg-white print:p-0 print:block">
      
      {/* Action Buttons (Hidden when printing) */}
      <div className="absolute top-4 right-4 flex gap-2 print:hidden">
        <button onClick={handlePrint} className="p-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg hover:scale-105 transition" title="Print Receipt">
          <Printer size={20} />
        </button>
        <button onClick={handleShare} className="p-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg hover:scale-105 transition" title="Share">
          <Share2 size={20} />
        </button>
        <button onClick={onClose} className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:scale-105 transition" title="Close">
          <X size={20} />
        </button>
      </div>

      {/* The Receipt Paper */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto print:rounded-none print:shadow-none print:max-h-none print:w-full print:overflow-visible">
        
        {/* --- RECEIPT HEADER (Business Info) --- */}
        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 text-center border-b border-dashed border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-green-700 text-white rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold shadow-md">
            {currentStore?.name?.charAt(0) || <Store size={24} />}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentStore?.name || "Business Name"}</h2>
          
          <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
            {currentStore?.address && (
              <p className="flex items-center justify-center gap-1.5"><MapPin size={12} /> {currentStore.address}</p>
            )}
            {currentStore?.phone && (
              <p className="flex items-center justify-center gap-1.5"><Phone size={12} /> {currentStore.phone}</p>
            )}
            {currentStore?.email && (
              <p className="flex items-center justify-center gap-1.5"><Mail size={12} /> {currentStore.email}</p>
            )}
          </div>
        </div>

        {/* --- INVOICE META & CUSTOMER INFO --- */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invoice Number</p>
              <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                {transaction.invoiceNumber || `#${transaction.id}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date Issued</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatDate(transaction.date)}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Billed To</p>
            <p className="font-bold text-gray-900 dark:text-white">{customerName || "Walk-in Customer"}</p>
            {customerPhone && <p className="text-xs text-gray-500 dark:text-gray-400">{customerPhone}</p>}
          </div>

          {/* --- ITEMS LIST --- */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Items & Description</p>
            
            {transaction.invoiceItems && transaction.invoiceItems.length > 0 ? (
              <div className="space-y-2">
                {transaction.invoiceItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} {item.unit ? `× ${item.unit}` : 'pcs'} @ {formatCurrency(item.price)}
                      </p>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white ml-4">
                      {formatCurrency(item.quantity * item.price)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                {transaction.items || "General Purchase"}
              </div>
            )}
          </div>

          {/* --- TOTALS SECTION --- */}
          <div className="pt-4 border-t-2 border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total Amount</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(transaction.amount)}</span>
            </div>
            {transaction.paid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Amount Paid</span>
                <span className="font-semibold text-green-600 dark:text-green-400">-{formatCurrency(transaction.paid)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t border-dashed border-gray-300 dark:border-gray-600">
              <span className="text-base font-bold text-gray-900 dark:text-white">Balance Due</span>
              <span className={`text-2xl font-bold font-mono ${
                balanceDue > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
              }`}>
                {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>

          {/* --- FOOTER --- */}
          <div className="pt-6 text-center">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Thank you for your business!</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-mono">
              Generated by CreditBook
            </p>
            {transaction.isVoid && (
              <div className="mt-4 border-2 border-red-500 text-red-500 font-bold text-xl py-2 px-4 rounded-lg transform -rotate-12 inline-block opacity-80">
                VOIDED
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};