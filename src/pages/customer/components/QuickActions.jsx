import { Plus, Banknote, Phone, Share2 } from "lucide-react";

export const QuickActions = ({ onSale, onPayment, onCall, onShare }) => (
  <div className="grid grid-cols-4 gap-2">
    <button onClick={onSale} className="bg-green-600 text-white p-3 rounded-xl flex flex-col items-center gap-1.5 active:scale-95 transition shadow-md">
      <Plus size={20} /> <span className="text-[10px] font-bold">Sale</span>
    </button>
    <button onClick={onPayment} className="bg-blue-600 text-white p-3 rounded-xl flex flex-col items-center gap-1.5 active:scale-95 transition shadow-md">
      <Banknote size={20} /> <span className="text-[10px] font-bold">Payment</span>
    </button>
    <button onClick={onCall} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-3 rounded-xl flex flex-col items-center gap-1.5 active:scale-95 transition">
      <Phone size={20} /> <span className="text-[10px] font-bold">Call</span>
    </button>
    <button onClick={onShare} className="bg-purple-600 text-white p-3 rounded-xl flex flex-col items-center gap-1.5 active:scale-95 transition shadow-md">
      <Share2 size={20} /> <span className="text-[10px] font-bold">Share</span>
    </button>
  </div>
);