import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Star, Archive, Edit3, Package } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { ProductService } from "../services/ProductService";
import { TopBar } from "../components/TopBar";
import { AddProductModal } from "../components/AddProductModal";

export const ProductsPage = () => {
  const { currentStore, showToast } = useStore();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Load products on mount
  useEffect(() => {
    if (currentStore?.id) {
      loadProducts();
    }
  }, [currentStore?.id]);

  const loadProducts = async () => {
    if (!currentStore?.id) return;
    const loaded = await ProductService.getAll(currentStore.id);
    setProducts(loaded);
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, searchQuery]);

  const handleToggleFavourite = async (product) => {
    try {
      await ProductService.toggleFavourite(currentStore.id, product.id, product.isFavourite);
      await loadProducts(); // Refresh list
    } catch (error) {
      showToast("Failed to update favourite status.");
    }
  };

  const handleArchive = async (product) => {
    if (!window.confirm(`Archive "${product.name}"? It will be hidden from new sales but old invoices will remain intact.`)) return;
    try {
      await ProductService.archive(currentStore.id, product.id);
      await loadProducts();
      showToast("Product archived.");
    } catch (error) {
      showToast("Failed to archive product.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* 👇 FIXED TOP BAR */}
      <TopBar title="Products" />
      
      {/* 👇 MAIN CONTENT - Increased top padding for breathing room */}
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">
        
        {/* Search & Add */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
            />
            <button 
              onClick={() => { setEditingProduct(null); setIsAddingProduct(true); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-green-700 text-white rounded-lg shadow-sm active:scale-95 transition"
              title="Add new product"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Product List */}
        <div className="space-y-3">
          {filteredProducts.length === 0 && !searchQuery.trim() ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <Package className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No products in catalog yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Tap the + button to add your first product</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 dark:text-gray-500 text-sm">No products match your search.</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <div key={product.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                {/* Favourite Star */}
                <button 
                  onClick={() => handleToggleFavourite(product)}
                  className={`p-2 rounded-full transition active:scale-90 ${product.isFavourite ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <Star size={20} className={product.isFavourite ? "fill-current" : ""} />
                </button>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{product.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{product.unit}</p>
                  <div className="flex gap-3 mt-2 text-xs">
                    <span className="text-green-600 dark:text-green-400 font-semibold">Sell: {formatCurrency(product.defaultSalePrice, currentStore?.currency || "GH₵")}</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">Buy: {formatCurrency(product.defaultPurchasePrice, currentStore?.currency || "GH₵")}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => { setEditingProduct(product); setIsAddingProduct(true); }}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                    title="Edit"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={() => handleArchive(product)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    title="Archive"
                  >
                    <Archive size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isAddingProduct && (
        <AddProductModal 
          product={editingProduct}
          onClose={() => {
            setIsAddingProduct(false);
            setEditingProduct(null);
            loadProducts(); // Refresh list after closing
          }} 
        />
      )}
    </div>
  );
};