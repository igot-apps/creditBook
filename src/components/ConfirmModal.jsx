import { useState, useEffect } from "react";
import { X, AlertTriangle, ShieldCheck } from "lucide-react";

export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Are you sure?", 
  message = "This action cannot be undone.", 
  confirmWord = "yes", 
  confirmButtonText = "Confirm Action", 
  isDestructive = true 
}) => {
  const [inputValue, setInputValue] = useState("");

  // Reset input every time the modal opens
  useEffect(() => {
    if (isOpen) setInputValue("");
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed = inputValue.trim().toLowerCase() === confirmWord.toLowerCase();

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {isDestructive ? (
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
              </div>
            ) : (
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <ShieldCheck className="text-green-600 dark:text-green-400" size={20} />
              </div>
            )}
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            <X size={18} className="text-gray-700 dark:text-gray-200" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{message}</p>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase mb-2 text-center">
            Type <span className="text-red-600 dark:text-red-400 text-base mx-1">"{confirmWord}"</span> to confirm
          </p>
          <input 
            type="text" 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)} 
            placeholder={`Type "${confirmWord}"...`}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 dark:text-white text-center font-mono text-lg tracking-widest"
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="p-5 pt-0">
          <button 
            onClick={() => { onConfirm(); onClose(); }} 
            disabled={!isConfirmed}
            className={`w-full font-bold py-3.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95 flex items-center justify-center gap-2 ${
              isDestructive 
                ? "bg-red-600 hover:bg-red-700 text-white" 
                : "bg-green-700 hover:bg-green-800 text-white"
            }`}
          >
            {isDestructive ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};