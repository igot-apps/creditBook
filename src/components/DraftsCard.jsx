import { useState } from "react";
import { FileText, ChevronDown } from "lucide-react";
import { formatCurrency } from "../utils/helpers";

export const DraftsCard = ({ drafts, onResume }) => {
  const [showDrafts, setShowDrafts] = useState(false);

  if (!drafts || drafts.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Toggle Header */}
      <button
        onClick={() => setShowDrafts(!showDrafts)}
        className="w-full flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-gray-700 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
            <FileText size={18} />
          </div>
          <div className="text-left">
            <p className="font-bold text-sm text-gray-900 dark:text-white">Pending Drafts</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tap to {showDrafts ? 'hide' : 'review'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 text-xs font-bold px-2.5 py-1 rounded-full">
            {drafts.length}
          </span>
          <ChevronDown size={20} className={`text-gray-400 transition-transform duration-200 ${showDrafts ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded List */}
      {showDrafts && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-2 space-y-2 bg-gray-50 dark:bg-gray-900/50 max-h-60 overflow-y-auto">
          {drafts.map(draft => (
            <button 
              key={draft.id} 
              onClick={() => onResume(draft)} 
              className="w-full flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 active:scale-[0.98] transition text-left shadow-sm"
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                  {draft.name || "Walk-in Customer"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {draft.recordMode === 'detailed' && draft.invoiceItems ? `${draft.invoiceItems.length} items` : (draft.items || "Quick Note")}
                </p>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(parseFloat(draft.amount) || 0)}</p>
                <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold">Resume</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};