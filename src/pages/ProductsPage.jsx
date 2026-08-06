import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Package, Tag, Trash2, Edit3, Star } from "lucide-react";
import useStore from "../store/useStore";
import { ProductService } from "../services/ProductService";
import { AddProductModal } from "../components/AddProductModal";
import { TopBar } from "../components/TopBar";
import { formatCurrency } from "../utils/helpers";

export const ProductsPage = () => {
  const { currentStore, showToast } = useStore();
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null); // 👈 Tracks product being edited
  const [searchQuery, setSearchQuery] = useState("");

  const loadProducts = async () => {
    if (!currentStore?.id) return;
    try {
      const data = await ProductService.getAll(currentStore.id);
      setProducts(data || []);
    } catch (error) {
      console.error("Failed to load products", error);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [currentStore?.id]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  // 👇 CREATE / UPDATE HANDLER
  const handleSaveProduct = async (productData) => {
    try {
      if (productData.id) {
        // UPDATE existing
        await ProductService.update(productData.id, productData);
        showToast("✅ Product updated!");
      } else {
        // CREATE new
        await ProductService.create(currentStore.id, productData);
        showToast("✅ Product template saved!");
      }
      await loadProducts();
      setEditProduct(null);
    } catch (error) {
      showToast("❌ Failed to save product.");
    }
  };

  // 👇 DELETE HANDLER
  const handleDeleteProduct = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product template?")) {
      try {
        await ProductService.delete(productId);
        showToast("🗑️ Product deleted.");
        await loadProducts();
      } catch (error) {
        showToast("❌ Failed to delete product.");
      }
    }
  };

  // 👇 FAVORITE TOGGLE HANDLER
  const handleToggleFavorite = async (productId) => {
    try {
      await ProductService.toggleFavourite(productId);
      await loadProducts();
    } catch (error) {
      showToast("❌ Failed to update favorite.");
    }
  };

  const handleEditClick = (product) => {
    setEditProduct(product);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditProduct(null);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Products" subtitle="Templates for fast recording" />
      
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">
        
        {/* Search & Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
            />
          </div>
          <button 
            onClick={handleAddClick}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl flex items-center justify-center active:scale-95 transition shadow-md"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Products List */}
        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <Package className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No product templates yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Tap the + button to create one</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <div key={product.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                
                {/* Header with Actions */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate text-base">{product.name}</h3>
                      {product.isFavourite && <Star size={14} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                    </div>
                    {(product.category || product.brand) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {product.category && <span>{product.category}</span>}
                        {product.category && product.brand && <span> • </span>}
                        {product.brand && <span>{product.brand}</span>}
                      </p>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button 
                      onClick={() => handleToggleFavorite(product.id)}
                      className={`p-1.5 rounded-lg transition ${
                        product.isFavourite 
                          ? "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20" 
                          : "text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <Star size={16} className={product.isFavourite ? "fill-current" : ""} />
                    </button>
                    <button 
                      onClick={() => handleEditClick(product)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Units List */}
                <div className="space-y-1.5">
                  {product.units && product.units.map(unit => (
                    <div key={unit.id} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-900/50 px-2.5 py-1.5 rounded-lg">
                      <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Tag size={10} className="text-indigo-500" />
                        {unit.name}
                      </span>
                      <div className="flex gap-3">
                        <span className="text-gray-500 dark:text-gray-400">
                          Buy: <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(unit.defaultPurchasePrice, currentStore?.currency || "GH₵")}</span>
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          Sell: <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(unit.defaultSalePrice, currentStore?.currency || "GH₵")}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Unified Add/Edit Modal */}
      <AddProductModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditProduct(null); }} 
        onSave={handleSaveProduct} 
        editProduct={editProduct} 
      />
    </div>
  );
};