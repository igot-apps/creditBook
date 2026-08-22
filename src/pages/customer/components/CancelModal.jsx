import { AlertTriangle } from "lucide-react";

export const CancelModal = ({ isOpen, onClose, onConfirm, cancelReason, setCancelReason, type }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full"><AlertTriangle size={20} className="text-red-600 dark:text-red-400" /></div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Cancel {type === 'payment' ? 'Payment' : 'Transaction'}?</h3>
        </div>
        <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Type the reason here..." className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 caret-red-600 dark:caret-red-400 mb-4 text-sm" rows="3" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">Go Back</button>
          <button onClick={onConfirm} disabled={!cancelReason.trim()} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 active:scale-95 transition">Yes, Cancel</button>
        </div>
      </div>
    </div>
  );
};