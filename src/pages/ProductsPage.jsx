import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Eye, Edit3, Trash2, Star, Package, X } from "lucide-react";
import useStore from "../store/useStore";
import { ProductService } from "../services/ProductService";
import { matchesProductSearch } from "../utils/productSearch";
import { TopBar } from "../components/TopBar";
import { AddProductModal } from "../components/AddProductModal";

export const ProductsPage = () => {
  const { currentStore, setView, showToast, focusedProduct, setFocusedProduct } = useStore();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState(() => focusedProduct?.query || "");
  const [highlightedProductId, setHighlightedProductId] = useState(() => focusedProduct?.id || null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    if (currentStore?.id) {
      ProductService.getAll(currentStore.id).then(setProducts);
    }
  }, [currentStore?.id]);

  useEffect(() => {
    if (!focusedProduct?.id || products.length === 0) return;
    setSearchQuery(focusedProduct.query || focusedProduct.name || "");
    setHighlightedProductId(focusedProduct.id);
    const scrollTimer = setTimeout(() => {
      document.getElementById(`product-${focusedProduct.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    const highlightTimer = setTimeout(() => {
      setHighlightedProductId(null);
      setFocusedProduct(null);
    }, 3500);
    return () => { clearTimeout(scrollTimer); clearTimeout(highlightTimer); };
  }, [focusedProduct?.id, products.length, setFocusedProduct]);

  const query = searchQuery.trim();
  const results = useMemo(() => products.flatMap(product => {
    const units = product.units ?? [];
    const matchesProduct = matchesProductSearch(product, query, []);
    const matchingUnits = matchesProduct ? units : units.filter(unit =>
      matchesProductSearch(product, query, [unit])
    );

    return matchesProduct || matchingUnits.length ? [{ product, units, matchingUnits }] : [];
  }), [products, query]);

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
      const isFavourite = !product.is_favourite;
      await ProductService.update(product.id, { is_favourite: isFavourite });
      setProducts(items => items.map(p => p.id === product.id ? { ...p, is_favourite: isFavourite } : p));
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
    <div className="app-screen min-h-screen bg-gray-50 dark:bg-gray-950">
      <TopBar title="Products" />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="mx-auto max-w-6xl space-y-4 px-4 pb-8 sm:px-6">
        
        {/* Top Actions */}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
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
            aria-label="Search products, brands or types"
            enterKeyHint="search"
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            placeholder="Search products, brands or types..."
            className="w-full pl-10 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
          {searchQuery && (
            <button aria-label="Clear product search" onClick={() => setSearchQuery("")} className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
              <X size={14} className="text-gray-600 dark:text-gray-300" />
            </button>
          )}
        </div>

        {/* Product List */}
        <p role="status" className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {results.length} {query ? "matching " : ""}{results.length === 1 ? "product" : "products"}
        </p>
        <div className="grid items-start gap-3 lg:grid-cols-2">
          {results.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-300 py-12 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <Package size={48} className="mx-auto mb-3 opacity-50" />
              <p className="font-medium">{query ? "No matching products" : "No products yet"}</p>
              <p className="text-sm mt-1">{query ? "Try a different product, brand or type name." : 'Tap "Add Product" to get started.'}</p>
            </div>
          ) : (
            results.map(({ product, units, matchingUnits }) => (
              <article id={`product-${product.id}`} key={product.id} className={`rounded-2xl border bg-white p-4 shadow-sm transition-all duration-500 dark:bg-gray-800 ${highlightedProductId === product.id ? "border-indigo-500 ring-4 ring-indigo-200 dark:border-indigo-400 dark:ring-indigo-900" : "border-gray-200 dark:border-gray-700"}`}>
                <div className="flex items-start gap-3">
                  <div aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Package size={21}/></div>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words font-bold text-gray-900 dark:text-white">{product.name}</h2>
                    {product.brand && <p className="text-sm text-gray-500 dark:text-gray-400">{product.brand}</p>}
                  </div>
                </div>
                {units.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                      {matchingUnits === units
                        ? `${units.length} ${units.length === 1 ? "type" : "types"}`
                        : `${matchingUnits.length} of ${units.length} types match`}
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {matchingUnits.map(unit => (
                        <li key={unit.id ?? unit.name} className={`max-w-full break-words rounded-lg px-2.5 py-1 text-sm ${matchingUnits === units
                          ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                          : "bg-indigo-50 font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"}`}>
                          {unit.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-1 dark:border-gray-700">
                  <button aria-label={`Favourite ${product.name}`} aria-pressed={Boolean(product.is_favourite)} onClick={() => handleToggleFavourite(product)} className="grid size-11 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-yellow-600 dark:text-gray-300 dark:hover:bg-gray-700">
                    <Star size={18} className={product.is_favourite ? "fill-yellow-500 text-yellow-500" : ""} />
                  </button>
                  <button aria-label={`Edit ${product.name}`} onClick={() => handleEdit(product)} className="ml-auto flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-gray-700">
                    <Edit3 size={16} /> Edit
                  </button>
                  <button aria-label={`Delete ${product.name}`} onClick={() => handleDelete(product)} className="grid size-11 place-items-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-300 dark:hover:bg-red-950">
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
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
