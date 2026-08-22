import { Edit3 } from "lucide-react";

export const FixReasonModal = ({ isOpen, onClose, onConfirm, fixReason, setFixReason }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full"><Edit3 size={20} className="text-blue-600 dark:text-blue-400" /></div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Reason for Fix</h3>
        </div>
        <textarea value={fixReason} onChange={(e) => setFixReason(e.target.value)} placeholder="e.g., Recorded wrong amount..." className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 caret-blue-600 dark:caret-blue-400 mb-4 text-sm" rows="3" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl active:scale-95 transition">Continue</button>
        </div>
      </div>
    </div>
  );
};