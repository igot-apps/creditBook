import { Search, Plus, Package, Star } from "lucide-react";
import { formatCurrency } from "../../utils/helpers";

export const ProductSearchSection = ({
  productSearch,
  onProductSearchChange,
  favoriteProducts,
  filteredProducts,
  onAddProduct,
  onCreateProduct
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Package size={18} className="text-indigo-600" /> Step 2: Add Items
      </h3>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          value={productSearch}
          onChange={onProductSearchChange}
          placeholder="Search or add product..."
          className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
        />
      </div>

      {/* Favorites */}
      {!productSearch.trim() && favoriteProducts.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Star size={10} className="fill-yellow-400 text-yellow-400" /> Quick Add
          </p>
          <div className="flex flex-wrap gap-2">
            {favoriteProducts.map(p => (
              <button
                key={p.id}
                onClick={() => onAddProduct(p)}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-bold transition active:scale-95"
              >
                + {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {productSearch.trim() && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(p => (
              <button 
                key={p.id} 
                onClick={() => onAddProduct(p)} 
                className="w-full flex justify-between items-center p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0 text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(p.defaultPurchasePrice, "GH₵")} {p.unit && `/ ${p.unit}`}</p>
                </div>
                <Plus size={16} className="text-indigo-600 flex-shrink-0 ml-2" />
              </button>
            ))
          ) : (
            <button
              onClick={() => onCreateProduct(productSearch)}
              className="w-full p-3 text-indigo-700 dark:text-indigo-400 font-semibold flex items-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm"
            >
              <Plus size={16} /> Create "{productSearch}"
            </button>
          )}
        </div>
      )}
    </div>
  );
};