import useStore from "../../store/useStore";
import { formatCurrency } from "../../utils/helpers";
import { Phone } from "lucide-react";

export const CustomerCard = ({ customer }) => {
  const { setSelectedCustomer, setView, currentStore } = useStore();
  
  // 👇 Get dynamic currency from store, default to GH₵
  const currency = currentStore?.currency || "GH₵";

  const handleOpenProfile = () => {
    setSelectedCustomer(customer);
    setView("profile");
  };

  // Dynamic colors based on balance status
  const balanceColor = customer.balance > 0 
    ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30" 
    : customer.balance < 0 
      ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30" 
      : "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/30";

  const balanceLabel = customer.balance > 0 ? "Owes" : customer.balance < 0 ? "Credit" : "Balance";

  return (
    <div 
      onClick={handleOpenProfile}
      className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition active:scale-[0.98]"
    >
      {/* Avatar */}
      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
        {customer.name.charAt(0).toUpperCase()}
      </div>

      {/* Customer Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 dark:text-white truncate text-base">{customer.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 mt-0.5">
          <Phone size={10} /> {customer.phone || "No phone number"}
        </p>
      </div>

      {/* Balance Badge */}
      <div className={`px-3 py-1.5 rounded-xl flex flex-col items-end flex-shrink-0 border ${balanceColor}`}>
        <p className="text-[10px] font-bold uppercase opacity-80">
          {balanceLabel}
        </p>
        {/* 👇 UPDATED: Pass currency to formatCurrency */}
        <p className="font-bold text-sm">
          {formatCurrency(Math.abs(customer.balance), currency)}
        </p>
      </div>
    </div>
  );
};