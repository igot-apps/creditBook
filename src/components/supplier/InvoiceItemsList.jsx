import { X, Package } from "lucide-react";

const QUICK_QTY = [1, 2, 5, 10];
const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const InvoiceItemsList = ({ items, onUpdateItem, onRemoveItem, onSetQuickQty }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-6 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
        <Package className="mx-auto text-gray-300 dark:text-gray-600 mb-2" size={32} />
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No items yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Tap a favorite above or search for products
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="font-bold text-gray-900 dark:text-white text-sm truncate pr-2 flex-1">{item.name}</p>
            <button 
              onClick={() => onRemoveItem(index)} 
              className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg transition active:scale-90"
            >
              <X size={14} />
            </button>
          </div>

          {/* Qty × Price = Total */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <label className="absolute left-2 top-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Qty</label>
              <input 
                type="number" 
                inputMode="decimal" 
                value={item.quantity === "" ? "" : Number(item.quantity)} 
                onChange={e => onUpdateItem(index, 'quantity', e.target.value)} 
                className={`w-full px-2 pt-3.5 pb-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm font-bold text-center outline-none focus:ring-1 focus:ring-blue-500 ${noSpinnerClass}`} 
              />
            </div>
            {item.unit && (
              <span className="px-2 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded-lg uppercase tracking-wide flex-shrink-0">
                {item.unit}
              </span>
            )}
            <span className="text-gray-400 dark:text-gray-500 text-xs font-bold">×</span>
            <div className="relative flex-[1.5]">
              <label className="absolute left-2 top-0.5 text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Price</label>
              <input 
                type="number" 
                inputMode="decimal" 
                value={item.price === "" ? "" : Number(item.price)} 
                onChange={e => onUpdateItem(index, 'price', e.target.value)} 
                className={`w-full px-2 pt-3.5 pb-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm font-bold text-right outline-none focus:ring-1 focus:ring-purple-500 ${noSpinnerClass}`} 
              />
            </div>
            <span className="text-gray-400 dark:text-gray-500 text-xs font-bold">=</span>
            <div className="relative flex-1">
              <label className="absolute left-2 top-0.5 text-[9px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Total</label>
              <input 
                type="number" 
                inputMode="decimal" 
                value={item.total === "" ? "" : Number(item.total)} 
                onChange={e => onUpdateItem(index, 'total', e.target.value)} 
                className={`w-full px-2 pt-3.5 pb-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm font-bold text-right outline-none focus:ring-1 focus:ring-green-500 ${noSpinnerClass}`} 
              />
            </div>
          </div>

          {/* Quick Qty Buttons */}
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mr-1">Quick:</span>
            {QUICK_QTY.map(qty => (
              <button
                key={qty}
                onClick={() => onSetQuickQty(index, qty)}
                className={`flex-1 py-1 rounded-md text-xs font-bold transition active:scale-95 ${
                  item.quantity === qty
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {qty}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};