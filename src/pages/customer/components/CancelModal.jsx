import { AlertTriangle } from "lucide-react";
import { ReasonPicker } from "../../../components/ReasonPicker";

const paymentReasons = ["Entered by mistake", "Duplicate payment", "Payment was reversed", "Wrong customer"];
const saleReasons = ["Entered by mistake", "Duplicate invoice", "Sale did not happen", "Customer returned the order"];

export const CancelModal = ({ isOpen, onClose, onConfirm, cancelReason, setCancelReason, type }) => {
  if (!isOpen) return null;
  const reasons = type === "payment" ? paymentReasons : saleReasons;
  return (
    <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full"><AlertTriangle size={20} className="text-red-600 dark:text-red-400" /></div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Cancel {type === 'payment' ? 'Payment' : 'Transaction'}?</h3>
        </div>
        <ReasonPicker value={cancelReason} onChange={setCancelReason} options={reasons} accent="red" />
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">Go Back</button>
          <button onClick={onConfirm} disabled={!cancelReason.trim()} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 active:scale-95 transition">Yes, Cancel</button>
        </div>
      </div>
    </div>
  );
};
