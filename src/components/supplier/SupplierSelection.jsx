import { Search, Plus, Truck, AlertCircle } from "lucide-react";
import { formatCurrency } from "../../utils/helpers";

export const SupplierSelection = ({ 
  suppliers, 
  searchQuery, 
  onSearchChange, 
  onSelectSupplier, 
  onCreateSupplier 
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Truck size={16} className="text-indigo-600" /> Step 1: Select Supplier
      </p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search suppliers..."
          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          autoFocus
        />
      </div>
      <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
        {suppliers.map(s => (
          <button 
            key={s.id} 
            onClick={() => onSelectSupplier(s)} 
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left"
          >
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              {s.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">{s.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.phone || "No phone"}</p>
            </div>
            {s.balance > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <AlertCircle size={10} className="text-orange-600 dark:text-orange-400" />
                <p className="text-[10px] font-bold text-orange-700 dark:text-orange-400">
                  {formatCurrency(s.balance, "GH₵")}
                </p>
              </div>
            )}
          </button>
        ))}
        {searchQuery.trim() && suppliers.length === 0 && (
          <button 
            onClick={onCreateSupplier} 
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 transition text-left"
          >
            <Plus size={20} className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Create new supplier</p>
              <p className="text-xs opacity-80 truncate">Use "{searchQuery}"</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};