import { Edit3 } from "lucide-react";
import { ReasonPicker } from "../../../components/ReasonPicker";

const reasons = ["Wrong amount", "Wrong items or quantity", "Wrong payment details", "Wrong date", "Duplicate entry"];

export const FixReasonModal = ({ isOpen, onClose, onConfirm, fixReason, setFixReason }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full"><Edit3 size={20} className="text-blue-600 dark:text-blue-400" /></div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Reason for correction</h3>
        </div>
        <ReasonPicker value={fixReason} onChange={setFixReason} options={reasons} placeholder="Describe what needs to be corrected..." />
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">Cancel</button>
          <button onClick={onConfirm} disabled={!fixReason.trim()} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl active:scale-95 transition disabled:opacity-50">Continue</button>
        </div>
      </div>
    </div>
  );
};
