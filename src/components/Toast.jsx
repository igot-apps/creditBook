import { Check, AlertCircle, X } from "lucide-react";
import useStore from "../store/useStore";

export const Toast = () => {
  const { toast, showToast } = useStore();

  if (!toast) return null;

  // Determine icon and color based on message content (simple heuristic)
  const isError = toast.toLowerCase().includes("error") || toast.toLowerCase().includes("failed");
  const isSuccess = !isError;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom fade-in duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${
        isSuccess 
          ? "bg-green-700 text-white border-green-600" 
          : "bg-red-600 text-white border-red-500"
      }`}>
        {isSuccess ? <Check size={20} /> : <AlertCircle size={20} />}
        <p className="font-medium text-sm max-w-[250px] text-center">{toast}</p>
        <button onClick={() => showToast(null)} className="ml-2 opacity-80 hover:opacity-100">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};