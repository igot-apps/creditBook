import { useState, useMemo } from "react";
import { Plus, Search, Package, Star, Archive, Edit3, Check, X } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { formatCurrency } from "../utils/helpers";
import { ProductService } from "../services/ProductService";
import { PageHeader } from "../components/PageHeader";

export const ProductsPage = () => {
  const { currentStore, showToast, refreshCustomers } = useApp();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, favourites, archived
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({ name: "", price: "", unit: "", category: "", isFavourite: false });

  // Load products when page mounts or tab changes
  const loadProducts = async () => {
    const includeArchived = activeTab === "archived";
    const data = await ProductService.getAll(currentStore.id, includeArchived);
    setProducts(data);
  };

  useState(() => { loadProducts(); }, [activeTab]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (activeTab === "favourites") filtered = products.filter(p => p.isFavourite);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.category && p.category.toLowerCase().includes(q))
      );
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchQuery, activeTab]);

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setForm({
        name: product.name,
        price: product.price.toString(),
        unit: product.unit || "",
        category: product.category || "",
        isFavourite: product.isFavourite || false
      });
    } else {
      setEditingProduct(null);
      setForm({ name: "", price: "", unit: "", category: "", isFavourite: false });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) {
      showToast("Name and Price are required");
      return;
    }

    try {
      const productData = {
        name: form.name.trim(),
        price: parseFloat(form.price),
        unit: form.unit.trim(),
        category: form.category.trim(),
        isFavourite: form.isFavourite
      };

      if (editingProduct) {
        await ProductService.update(editingProduct.id, productData);
        showToast("Product updated");
      } else {
        await ProductService.create(currentStore.id, productData);
        showToast("Product created");
      }
      
      setIsModalOpen(false);
      loadProducts();
    } catch (error) {
      console.error(error);
      showToast("Failed to save product");
    }
  };

  const handleToggleArchive = async (product) => {
    try {
      if (product.isActive === false) {
        await ProductService.restore(product.id);
        showToast("Product restored");
      } else {
        await ProductService.archive(product.id);
        showToast("Product archived");
      }
      loadProducts();
    } catch (error) {
      showToast("Failed to update product");
    }
  };

  const handleToggleFavourite = async (product) => {
    await ProductService.update(product.id, { isFavourite: !product.isFavourite });
    loadProducts();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title="Product Catalogue" subtitle={`${products.length} products`} />

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Search & Add */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
            />
          </div>
          <button 
            onClick={() => openModal()}
            className="bg-green-700 text-white p-3 rounded-xl shadow-md active:scale-95 transition"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "all", label: "All" },
            { key: "favourites", label: "Favourites" },
            { key: "archived", label: "Archived" }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                activeTab === tab.key 
                  ? "bg-green-700 text-white" 
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Product List */}
        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <Package className="mx-auto text-gray-300 mb-2" size={48} />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No products found</p>
            </div>
          ) : (
            filteredProducts.map(p => (
              <div key={p.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 dark:text-white truncate">{p.name}</p>
                    {p.isFavourite && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-green-700 dark:text-green-400 font-semibold">{formatCurrency(p.price)}</p>
                    {p.unit && <span className="text-xs text-gray-400">/ {p.unit}</span>}
                    {p.category && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{p.category}</span>}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleToggleFavourite(p)}
                    className={`p-2 rounded-lg transition ${p.isFavourite ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 dark:bg-gray-700 text-gray-400'}`}
                  >
                    <Star size={18} className={p.isFavourite ? "fill-yellow-500" : ""} />
                  </button>
                  <button 
                    onClick={() => openModal(p)}
                    className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300"
                  >
                    <Edit3 size={18} />
                  </button>
                  {activeTab !== "archived" && (
                    <button 
                      onClick={() => handleToggleArchive(p)}
                      className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400"
                    >
                      <Archive size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">
                {editingProduct ? "Edit Product" : "New Product"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Product Name *</label>
                <input 
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                  placeholder="e.g., Indomie" autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Default Price *</label>
                  <input 
                    type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Unit (Optional)</label>
                  <input 
                    value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                    placeholder="e.g., piece, kg"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Category (Optional)</label>
                <input 
                  value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                  placeholder="e.g., Groceries"
                />
              </div>
              
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer">
                <input 
                  type="checkbox" checked={form.isFavourite} onChange={e => setForm({...form, isFavourite: e.target.checked})}
                  className="w-5 h-5 text-green-700 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Add to Favourites</span>
              </label>

              <button 
                type="submit"
                className="w-full bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Check size={20} /> {editingProduct ? "Update Product" : "Create Product"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};