import { useState, useEffect, useMemo } from "react";
import { Search, X, Plus, Check, Star, ArrowLeft, Minus } from "lucide-react";
import { ProductService, CATEGORY_EMOJIS } from "../services/ProductService";
import { formatCurrency } from "../utils/helpers";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const ProductPickerModal = ({
  isOpen,
  onClose,
  products,
  currentStore,
  onProductsSelected,
  priceType = "sale",
  onRequestCreateProduct
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeTab, setActiveTab] = useState("all");
  const [multiUnitProduct, setMultiUnitProduct] = useState(null);
  const [tempQuantities, setTempQuantities] = useState({});
  const [addedProducts, setAddedProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const currency = currentStore?.currency || "GH₵";

  useEffect(() => {
    if (currentStore?.id) {
      ProductService.getCategories(currentStore.id).then(setCategories);
    }
  }, [currentStore?.id]);

  const getVisibleUnits = (product) => {
    if (!product.units) return [];
    return product.units.filter(u =>
      priceType === "purchase" ? u.visibleInPurchases !== false : u.visibleInSales !== false
    );
  };

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    let result = [...products];
    
    result = result.filter(p => {
      const productVisible = priceType === "sale" 
        ? p.visibility?.sales !== false 
        : p.visibility?.purchases !== false;
      const hasVisibleUnit = p.units && p.units.some(u => 
        priceType === "sale" ? u.visibleInSales !== false : u.visibleInPurchases !== false
      );
      return productVisible && hasVisibleUnit;
    });

    if (activeTab === "favorites") result = result.filter(p => p.isFavourite);
    else if (activeTab === "recent") result = result.filter(p => p.lastUsedAt).sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt)).slice(0, 10);
    else if (activeTab === "most-used") result = result.filter(p => (p.usageCount || 0) > 0).sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 10);

    if (selectedCategory !== "All") result = result.filter(p => p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => {
      if (a.isFavourite !== b.isFavourite) return b.isFavourite ? 1 : -1;
      return (b.usageCount || 0) - (a.usageCount || 0);
    });
  }, [products, searchQuery, selectedCategory, activeTab, priceType]);

  const getPrice = (unit) => priceType === "purchase" ? (unit.defaultPurchasePrice || 0) : (unit.defaultSalePrice || 0);

  // 👇 FIXED: Immutable state update to prevent React Strict Mode double-invocation bug
  const handleSingleUnitAdd = (product, delta) => {
    const visibleUnits = getVisibleUnits(product);
    const unit = visibleUnits[0] || { name: "Piece", defaultSalePrice: 0, defaultPurchasePrice: 0 };
    const price = getPrice(unit);

    setAddedProducts(prev => {
      const existingIndex = prev.findIndex(p => p.productId === product.id && p.unitName === unit.name);
      
      if (existingIndex >= 0) {
        const newQty = prev[existingIndex].quantity + delta;
        if (newQty <= 0) {
          // Return a new array without this item
          return prev.filter((_, i) => i !== existingIndex);
        } else {
          // Create a BRAND NEW object to avoid mutating the original state
          const newItem = { 
            ...prev[existingIndex], 
            quantity: newQty, 
            total: newQty * price 
          };
          const newPrev = [...prev];
          newPrev[existingIndex] = newItem;
          return newPrev;
        }
      } else if (delta > 0) {
        return [...prev, {
          productId: product.id, name: product.name, brand: product.brand, unitName: unit.name,
          quantity: 1, price: price, total: price
        }];
      }
      return prev;
    });
    
    if (delta > 0) ProductService.trackUsage(product.id);
  };

  // 👇 FIXED: Immutable state update for manual input
  const handleSingleUnitSetQty = (product, value) => {
    const visibleUnits = getVisibleUnits(product);
    const unit = visibleUnits[0] || { name: "Piece", defaultSalePrice: 0, defaultPurchasePrice: 0 };
    const price = getPrice(unit);
    const qty = parseFloat(value);

    setAddedProducts(prev => {
      const existingIndex = prev.findIndex(p => p.productId === product.id && p.unitName === unit.name);
      
      if (existingIndex >= 0) {
        if (isNaN(qty) || qty <= 0) {
          return prev.filter((_, i) => i !== existingIndex);
        } else {
          const newItem = { 
            ...prev[existingIndex], 
            quantity: qty, 
            total: qty * price 
          };
          const newPrev = [...prev];
          newPrev[existingIndex] = newItem;
          return newPrev;
        }
      } else if (!isNaN(qty) && qty > 0) {
        return [...prev, {
          productId: product.id, name: product.name, brand: product.brand, unitName: unit.name,
          quantity: qty, price: price, total: qty * price
        }];
      }
      return prev;
    });
    
    if (!isNaN(qty) && qty > 0) ProductService.trackUsage(product.id);
  };

  const openMultiUnitModal = (product) => {
    setMultiUnitProduct(product);
    const existing = addedProducts.filter(p => p.productId === product.id);
    const initialQtys = {};
    
    getVisibleUnits(product).forEach(u => {
      const found = existing.find(ep => ep.unitName === u.name);
      initialQtys[u.id] = found ? found.quantity : 0;
    });
    
    setTempQuantities(initialQtys);
  };

  const updateModalQty = (unitId, delta) => {
    setTempQuantities(prev => ({
      ...prev,
      [unitId]: Math.max(0, (prev[unitId] || 0) + delta)
    }));
  };

  const updateModalQtyInput = (unitId, value) => {
    const qty = parseFloat(value);
    setTempQuantities(prev => ({
      ...prev,
      [unitId]: isNaN(qty) ? 0 : Math.max(0, qty)
    }));
  };

  const confirmMultiUnitQuantities = () => {
    if (!multiUnitProduct) return;
    
    setAddedProducts(prev => {
      let newProducts = prev.filter(p => p.productId !== multiUnitProduct.id);
      
      getVisibleUnits(multiUnitProduct).forEach(unit => {
        const qty = tempQuantities[unit.id] || 0;
        if (qty > 0) {
          const price = getPrice(unit);
          newProducts.push({
            productId: multiUnitProduct.id,
            name: multiUnitProduct.name,
            brand: multiUnitProduct.brand,
            unitName: unit.name,
            quantity: qty,
            price: price,
            total: qty * price
          });
        }
      });
      
      return newProducts;
    });
    
    const totalAdded = Object.values(tempQuantities).reduce((sum, q) => sum + q, 0);
    if (totalAdded > 0) ProductService.trackUsage(multiUnitProduct.id);
    setMultiUnitProduct(null);
  };

  const handleDone = () => {
    if (addedProducts.length > 0) onProductsSelected(addedProducts);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(""); setSelectedCategory("All"); setActiveTab("all");
      setMultiUnitProduct(null); setAddedProducts([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalItemsCount = addedProducts.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-950 flex flex-col overflow-hidden">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between p-4">
          <button onClick={onClose} className="p-2 -ml-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition active:scale-95">
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="font-bold text-xl text-gray-900 dark:text-white">
            {priceType === "purchase" ? "Add Purchase Items" : "Add Products"}
          </h1>
          {totalItemsCount > 0 ? (
            <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${priceType === "purchase" ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"}`}>
              {totalItemsCount} items
            </div>
          ) : (
            <div className="w-10"></div>
          )}
        </div>
        
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${priceType === "purchase" ? "text-indigo-400" : "text-green-400"}`} size={20} />
            <input
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products, brands, categories..."
              className={`w-full pl-12 pr-10 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 ${
                priceType === "purchase" ? "focus:ring-indigo-500 focus:border-indigo-500" : "focus:ring-green-500 focus:border-green-500"
              } dark:text-white text-base`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                <X size={14} className="text-gray-600 dark:text-gray-300" />
              </button>
            )}
          </div>
        </div>
        
        <div className="px-4 pb-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button onClick={() => setActiveTab("all")} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${activeTab === "all" ? (priceType === "purchase" ? "bg-indigo-600 text-white" : "bg-green-600 text-white") : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>All</button>
            <button onClick={() => setActiveTab("favorites")} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition flex items-center gap-1 ${activeTab === "favorites" ? "bg-yellow-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}><Star size={14} /> Favorites</button>
            <button onClick={() => setActiveTab("recent")} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${activeTab === "recent" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>Recent</button>
            <button onClick={() => setActiveTab("most-used")} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${activeTab === "most-used" ? "bg-purple-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>Most Used</button>
          </div>
        </div>
        
        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button onClick={() => setSelectedCategory("All")} className={`px-3 py-1 rounded-full text-xs font-semibold transition ${selectedCategory === "All" ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>All</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1 rounded-full text-xs font-semibold transition flex items-center gap-1 ${selectedCategory === cat ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>
                <span>{ProductService.getCategoryEmoji(cat)}</span>{cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="text-6xl mb-4 opacity-50">📦</div>
            <p className="text-gray-500 dark:text-gray-400 text-base font-medium">
              {searchQuery ? `No products found for "${searchQuery}"` : "No products in catalog"}
            </p>
            {searchQuery && onRequestCreateProduct && (
              <button onClick={() => onRequestCreateProduct(searchQuery)} className={`mt-6 w-full max-w-xs font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg text-base ${
                priceType === "purchase" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"
              }`}>
                <Plus size={20} /> Create "{searchQuery}"
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(product => {
              const emoji = ProductService.getCategoryEmoji(product.category);
              const totalQty = addedProducts.filter(p => p.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
              const visibleUnits = getVisibleUnits(product);
              const isMultiUnit = visibleUnits.length > 1;

              return (
                <div key={product.id} className={`bg-white dark:bg-gray-800 rounded-2xl border-2 p-3 transition-all ${
                  totalQty > 0 ? (priceType === "purchase" ? "border-indigo-500 dark:border-indigo-400 shadow-md" : "border-green-500 dark:border-green-400 shadow-md") : "border-gray-200 dark:border-gray-700"
                }`}>
                  <div className="text-center mb-2">
                    <div className="text-5xl mb-1">{emoji}</div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{product.name}</p>
                    {product.category && <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{product.category}</p>}
                    {product.brand && <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate italic">{product.brand}</p>}
                  </div>

                  <div className="space-y-1 mb-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
                    {visibleUnits.slice(0, 2).map(unit => (
                      <div key={unit.id} className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{unit.name}</span>
                        <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(getPrice(unit), currency)}</span>
                      </div>
                    ))}
                    {visibleUnits.length > 2 && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center pt-1 border-t border-gray-200 dark:border-gray-700">+{visibleUnits.length - 2} more</p>
                    )}
                  </div>

                  {!isMultiUnit ? (
                    totalQty === 0 ? (
                      <button 
                        onClick={() => handleSingleUnitAdd(product, 1)}
                        className={`w-full py-2.5 rounded-xl font-bold text-sm transition active:scale-95 flex items-center justify-center gap-1 ${
                          priceType === "purchase" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        <Plus size={16} /> Add
                      </button>
                    ) : (
                      <div className={`flex items-center justify-between rounded-xl p-1 border ${
                        priceType === "purchase" ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800" : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      }`}>
                        <button onClick={() => handleSingleUnitAdd(product, -1)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 shadow-sm text-gray-700 dark:text-gray-300 font-bold text-lg active:scale-90 transition">
                          <Minus size={18} />
                        </button>
                        <input 
                          type="number" 
                          step="0.1" 
                          inputMode="decimal"
                          value={totalQty} 
                          onChange={(e) => handleSingleUnitSetQty(product, e.target.value)}
                          className={`w-12 text-center font-bold text-base bg-transparent outline-none ${noSpinnerClass} ${
                            priceType === "purchase" ? "text-indigo-700 dark:text-indigo-300" : "text-green-700 dark:text-green-300"
                          }`}
                        />
                        <button onClick={() => handleSingleUnitAdd(product, 1)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 shadow-sm text-gray-700 dark:text-gray-300 font-bold text-lg active:scale-90 transition">
                          <Plus size={18} />
                        </button>
                      </div>
                    )
                  ) : (
                    <button 
                      onClick={() => openMultiUnitModal(product)}
                      className={`w-full py-2.5 rounded-xl font-bold text-sm transition active:scale-95 flex items-center justify-center gap-1 ${
                        totalQty > 0 
                          ? (priceType === "purchase" ? "bg-indigo-500 text-white" : "bg-green-500 text-white")
                          : (priceType === "purchase" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-green-600 hover:bg-green-700 text-white")
                      }`}
                    >
                      {totalQty > 0 ? <><Check size={16} /> {totalQty} added</> : <><Plus size={16} /> Add Units</>}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalItemsCount > 0 && (
        <div className="bg-white dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-800 p-4 flex-shrink-0 shadow-2xl">
          <button onClick={handleDone} className={`w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg text-lg ${
            priceType === "purchase" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"
          }`}>
            <Check size={24} /> Done ({totalItemsCount} items)
          </button>
        </div>
      )}

      {multiUnitProduct && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center z-10">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{multiUnitProduct.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Select quantities for each unit</p>
              </div>
              <button onClick={() => setMultiUnitProduct(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <X size={18} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {getVisibleUnits(multiUnitProduct).map(unit => {
                const currentQty = tempQuantities[unit.id] || 0;
                return (
                  <div key={unit.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{unit.name}</p>
                      <p className={`text-xs font-semibold ${priceType === "purchase" ? "text-indigo-600 dark:text-indigo-400" : "text-green-600 dark:text-green-400"}`}>
                        {formatCurrency(getPrice(unit), currency)}
                      </p>
                    </div>
                    <div className={`flex items-center gap-2 rounded-lg p-1 border ${
                      priceType === "purchase" ? "bg-white dark:bg-gray-900 border-indigo-200 dark:border-indigo-800" : "bg-white dark:bg-gray-900 border-green-200 dark:border-green-800"
                    }`}>
                      <button 
                        onClick={() => updateModalQty(unit.id, -1)}
                        disabled={currentQty === 0}
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold disabled:opacity-30 active:scale-90 transition"
                      >
                        <Minus size={16} />
                      </button>
                      <input 
                        type="number" 
                        step="0.1" 
                        inputMode="decimal"
                        value={currentQty || ""} 
                        onChange={(e) => updateModalQtyInput(unit.id, e.target.value)}
                        placeholder="0"
                        className={`w-12 text-center font-bold text-base bg-transparent outline-none ${noSpinnerClass} text-gray-900 dark:text-white`}
                      />
                      <button 
                        onClick={() => updateModalQty(unit.id, 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold active:scale-90 transition"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
              <button 
                onClick={confirmMultiUnitQuantities}
                className={`w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg ${
                  priceType === "purchase" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                <Check size={20} /> Add to Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};