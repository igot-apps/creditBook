import { X, Check } from "lucide-react";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const CreateProductModal = ({ 
  product, 
  onChange, 
  onSave, 
  onClose 
}) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Create Product</h3>
          <button 
            onClick={onClose} 
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"
          >
            <X size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Product Name</label>
            <input
              value={product.name}
              onChange={e => onChange({ ...product, name: e.target.value })}
              placeholder="e.g., Corn Flour"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Unit</label>
              <input
                value={product.unit}
                onChange={e => onChange({ ...product, unit: e.target.value })}
                placeholder="e.g., Bag, Kg"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Default Buying Price</label>
              <input
                type="number"
                inputMode="decimal"
                value={product.defaultPurchasePrice}
                onChange={e => onChange({ ...product, defaultPurchasePrice: e.target.value })}
                placeholder="0.00"
                className={`w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm ${noSpinnerClass}`}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Default Selling Price (Optional)</label>
            <input
              type="number"
              inputMode="decimal"
              value={product.defaultSalePrice}
              onChange={e => onChange({ ...product, defaultSalePrice: e.target.value })}
              placeholder="0.00"
              className={`w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm ${noSpinnerClass}`}
            />
          </div>
          <button
            onClick={onSave}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Check size={18} /> Save & Add to Purchase
          </button>
        </div>
      </div>
    </div>
  );
};