import { useState, useEffect } from "react";
import { MessageCircle, Smartphone, FileText } from "lucide-react";
import { AccountShareService } from "../services/AccountShareService";
import { formatDate } from "../utils/helpers";

export const SharedHistory = ({ contactId }) => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (contactId) {
      AccountShareService.getShareHistory(contactId).then(setHistory);
    }
  }, [contactId]);

  if (history.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <FileText size={18} /> Shared History
      </div>
      <div className="p-4 space-y-3">
        {history.map((share) => (
          <div key={share.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                share.channel === 'whatsapp' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              }`}>
                {share.channel === 'whatsapp' ? <MessageCircle size={16} /> : <Smartphone size={16} />}
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white capitalize">{share.channel} • {share.scope}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{share.reference}</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{formatDate(share.createdAt).split(',')[0]}</p>
          </div>
        ))}
      </div>
    </div>
  );
};