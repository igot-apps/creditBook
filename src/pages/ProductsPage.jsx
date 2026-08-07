import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Eye, Edit3, Trash2, Star, Package, X } from "lucide-react";
import useStore from "../store/useStore";
import { ProductService } from "../services/ProductService";
import { formatCurrency } from "../utils/helpers";
import { TopBar } from "../components/TopBar";
import { AddProductModal } from "../components/AddProductModal";

export const ProductsPage = () => {
  const { currentStore, setView, showToast } = useStore();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    if (currentStore?.id) {
      ProductService.getAll(currentStore.id).then(setProducts);
    }
  }, [currentStore?.id]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowAddModal(true);
  };

  const handleDelete = async (product) => {
    if (window.confirm(`Delete "${product.name}"? This cannot be undone.`)) {
      try {
        await ProductService.delete(product.id);
        setProducts(products.filter(p => p.id !== product.id));
        showToast("🗑️ Product deleted");
      } catch (error) {
        showToast("❌ Failed to delete");
      }
    }
  };

  const handleToggleFavourite = async (product) => {
    try {
      await ProductService.toggleFavourite(product.id);
      setProducts(products.map(p => p.id === product.id ? { ...p, isFavourite: !p.isFavourite } : p));
    } catch (error) {
      showToast("❌ Failed to update");
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (productData.id) {
        await ProductService.update(productData.id, productData);
        showToast("✅ Product updated");
      } else {
        await ProductService.create(currentStore.id, productData);
        showToast("✅ Product created");
      }
      // Refresh list
      const updated = await ProductService.getAll(currentStore.id);
      setProducts(updated);
    } catch (error) {
      showToast("❌ Failed to save product");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Products" />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">
        
        {/* Top Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setView('visibilityManager')}
            className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center gap-2 active:scale-95 transition shadow-sm"
          >
            <Eye size={18} className="text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-sm text-gray-900 dark:text-white">Manage Visibility</span>
          </button>
          <button 
            onClick={() => { setEditingProduct(null); setShowAddModal(true); }}
            className="bg-indigo-600 text-white p-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-md"
          >
            <Plus size={18} />
            <span className="font-bold text-sm">Add Product</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            placeholder="Search products, brands, categories..." 
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-200 dark:bg-gray-700 rounded-full">
              <X size={14} className="text-gray-600 dark:text-gray-300" />
            </button>
          )}
        </div>

        {/* Product List */}
        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Package size={48} className="mx-auto mb-3 opacity-50" />
              <p className="font-medium">{searchQuery ? "No products found" : "No products yet"}</p>
              <p className="text-sm mt-1">Tap "Add Product" to get started.</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <div key={product.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3">
                <div className="text-3xl flex-shrink-0">{ProductService.getCategoryEmoji(product.category)}</div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 dark:text-white truncate">{product.name}</p>
                    {product.isFavourite && <Star size={12} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {product.category || "Uncategorized"} {product.brand && `• ${product.brand}`} • {product.units?.length || 0} unit(s)
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleToggleFavourite(product)} className="p-2 text-gray-400 hover:text-yellow-500 transition">
                    <Star size={18} className={product.isFavourite ? "fill-yellow-500 text-yellow-500" : ""} />
                  </button>
                  <button onClick={() => handleEdit(product)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => handleDelete(product)} className="p-2 text-gray-400 hover:text-red-500 transition">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AddProductModal 
        isOpen={showAddModal} 
        onClose={() => { setShowAddModal(false); setEditingProduct(null); }} 
        onSave={handleSaveProduct} 
        editProduct={editingProduct}
      />
    </div>
  );
};