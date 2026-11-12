import { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, Plus, Check, Star, ArrowLeft, Minus, PackagePlus, Package } from "lucide-react";
import { ProductService } from "../services/ProductService";
import { formatCurrency } from "../utils/helpers";
import { matchesProductSearch } from "../utils/productSearch";
import useStore from "../store/useStore";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const visibleUnitsFor = (product, priceType) => (product.units || []).filter(unit => {
  const isVisible = priceType === "purchase" ? unit.visibleInPurchases !== false : unit.visibleInSales !== false;
  const price = priceType === "purchase" ? unit.defaultPurchasePrice : unit.defaultSalePrice;
  return isVisible && Number(price) > 0;
});

export const ProductPickerModal = ({
  isOpen,
  onClose,
  products,
  currentStore,
  onProductsSelected,
  onUnitsUpdated,
  priceType = "sale",
  onRequestCreateProduct
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [multiUnitProduct, setMultiUnitProduct] = useState(null);
  const [tempQuantities, setTempQuantities] = useState({});
  const [tempTotals, setTempTotals] = useState({});
  const [tempNotes, setTempNotes] = useState({});
  const [addedProducts, setAddedProducts] = useState([]);
  const [showAddType, setShowAddType] = useState(false);
  const [typeError, setTypeError] = useState("");
  const [isSavingType, setIsSavingType] = useState(false);
  const savingType = useRef(false);
  const readOnly = useStore(state => state.readOnly);
  const canAddType = Boolean(onUnitsUpdated && currentStore?.id && !readOnly);
  const canCreateProduct = Boolean(onRequestCreateProduct && currentStore?.id && !readOnly);

  const currency = currentStore?.currency || "GH₵";

  const getVisibleUnits = (product) => visibleUnitsFor(product, priceType);

  const getUnitsForDisplay = (product) => {
    const units = getVisibleUnits(product);
    if (matchesProductSearch(product, searchQuery, [])) return units;
    return [...units].sort((a, b) =>
      Number(matchesProductSearch(product, searchQuery, [b])) - Number(matchesProductSearch(product, searchQuery, [a]))
    );
  };

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    let result = [...products];
    
    result = result.filter(p => {
      const productVisible = priceType === "sale" 
        ? p.visibility?.sales !== false 
        : p.visibility?.purchases !== false;
      const units = visibleUnitsFor(p, priceType);
      return productVisible && units.length > 0 && matchesProductSearch(p, searchQuery, units);
    });

    if (activeTab === "favorites") result = result.filter(p => p.isFavourite);
    else if (activeTab === "recent") result = result.filter(p => p.lastUsedAt).sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt)).slice(0, 10);
    else if (activeTab === "most-used") result = result.filter(p => (p.usageCount || 0) > 0).sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 10);

    return result.sort((a, b) => {
      if (a.isFavourite !== b.isFavourite) return b.isFavourite ? 1 : -1;
      return (b.usageCount || 0) - (a.usageCount || 0);
    });
  }, [products, searchQuery, activeTab, priceType]);

  const getPrice = (unit) => priceType === "purchase" ? (unit.defaultPurchasePrice || 0) : (unit.defaultSalePrice || 0);

  // 👇 FIXED: Immutable state update to prevent React Strict Mode double-invocation bug
  const changeUnitQuantity = (product, unit, delta) => {
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
          quantity: delta, price: price, total: delta * price
        }];
      }
      return prev;
    });
    
    if (delta > 0) ProductService.trackUsage(product.id);
  };

  const handleSingleUnitAdd = (product, delta) => {
    const [unit] = getVisibleUnits(product);
    if (unit) changeUnitQuantity(product, unit, delta);
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

  const openMultiUnitModal = (product, addType = false) => {
    setMultiUnitProduct(product);
    setShowAddType(addType);
    setTypeError("");
    const existing = addedProducts.filter(p => p.productId === product.id);
    const initialQtys = {};
    const initialTotals = {};
    const initialNotes = {};
    
    getVisibleUnits(product).forEach(u => {
      const found = existing.find(ep => ep.unitName === u.name);
      initialQtys[u.id] = found ? found.quantity : 0;
      initialTotals[u.id] = found ? found.total : 0;
      initialNotes[u.id] = found?.note || "";
    });
    
    setTempQuantities(initialQtys);
    setTempTotals(initialTotals);
    setTempNotes(initialNotes);
  };

  const saveType = async (event) => {
    event.preventDefault();
    if (!canAddType || savingType.current || !multiUnitProduct) return;
    const fields = new FormData(event.currentTarget);
    const name = String(fields.get("typeName") || "").trim();
    if (!name) { setTypeError("Enter a type name."); return; }
    const unit = {
      id: crypto.randomUUID(),
      name,
      defaultPurchasePrice: Number(fields.get("purchasePrice")) || 0,
      defaultSalePrice: Number(fields.get("salePrice")) || 0,
    };
    if (getPrice(unit) <= 0) {
      setTypeError(`Enter a ${priceType} price greater than zero to use this type here.`);
      return;
    }
    savingType.current = true;
    setIsSavingType(true);
    setTypeError("");
    try {
      const units = await ProductService.addUnit(currentStore.id, multiUnitProduct.id, unit);
      onUnitsUpdated(multiUnitProduct.id, units);
      setMultiUnitProduct(product => ({ ...product, units }));
      setTempQuantities(quantities => ({ ...quantities, [unit.id]: 1 }));
      setTempTotals(totals => ({ ...totals, [unit.id]: getPrice(unit) }));
      setTempNotes(notes => ({ ...notes, [unit.id]: "" }));
      setShowAddType(false);
    } catch (error) {
      setTypeError(error instanceof Error ? error.message : "Could not save the type. Try again.");
    } finally {
      savingType.current = false;
      setIsSavingType(false);
    }
  };

  const updateModalQty = (unitId, delta) => {
    const unit = getVisibleUnits(multiUnitProduct).find(item => item.id === unitId);
    const price = getPrice(unit);
    const quantity = Math.max(0, (tempQuantities[unitId] || 0) + delta);
    setTempQuantities(prev => ({ ...prev, [unitId]: quantity }));
    setTempTotals(prev => ({ ...prev, [unitId]: quantity * price }));
  };

  const updateModalQtyInput = (unitId, value) => {
    const unit = getVisibleUnits(multiUnitProduct).find(item => item.id === unitId);
    const price = getPrice(unit);
    const parsedQuantity = parseFloat(String(value).replace(",", "."));
    const quantity = Number.isFinite(parsedQuantity) ? Math.max(0, parsedQuantity) : 0;
    setTempQuantities(prev => ({ ...prev, [unitId]: quantity }));
    setTempTotals(prev => ({ ...prev, [unitId]: quantity * price }));
  };

  const updateModalTotal = (unit, value) => {
    const price = getPrice(unit);
    const parsedTotal = parseFloat(String(value).replace(",", "."));
    const total = Number.isFinite(parsedTotal) ? Math.max(0, parsedTotal) : 0;
    setTempTotals(prev => ({ ...prev, [unit.id]: total }));
    setTempQuantities(prev => ({
      ...prev,
      [unit.id]: price > 0 ? Number((total / price).toFixed(6)) : 0
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
            total: Number.isFinite(Number(tempTotals[unit.id])) ? Number(tempTotals[unit.id]) : qty * price,
            note: String(tempNotes[unit.id] || "").trim()
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
      setSearchQuery(""); setActiveTab("all");
      setMultiUnitProduct(null); setAddedProducts([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalItemsCount = addedProducts.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="product-picker-heading" className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="shrink-0 border-b border-gray-200 bg-white pt-[env(safe-area-inset-top)] dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
          <button onClick={onClose} aria-label="Close product picker" className="grid size-11 shrink-0 place-items-center rounded-full bg-gray-100 transition hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:hover:bg-gray-700">
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
          <h2 id="product-picker-heading" className="text-center text-base font-bold text-gray-900 dark:text-white sm:text-xl">
            {priceType === "purchase" ? "Add Purchase Items" : "Add Products"}
          </h2>
          {totalItemsCount > 0 ? (
            <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${priceType === "purchase" ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"}`}>
              {totalItemsCount} items
            </div>
          ) : (
            <div className="w-11 shrink-0" />
          )}
        </div>
        
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${priceType === "purchase" ? "text-indigo-400" : "text-green-400"}`} size={20} />
            <input
              type="search" aria-label="Search products, brands or types" enterKeyHint="search"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products, brands or types..."
              className={`w-full pl-12 pr-10 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 ${
                priceType === "purchase" ? "focus:ring-indigo-500 focus:border-indigo-500" : "focus:ring-green-500 focus:border-green-500"
              } dark:text-white text-base`}
            />
            {searchQuery && (
              <button aria-label="Clear product search" onClick={() => setSearchQuery("")} className="absolute right-0.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={14} className="text-gray-600 dark:text-gray-300" />
              </button>
            )}
          </div>
          {canCreateProduct && (
            <button onClick={() => onRequestCreateProduct(searchQuery.trim())} className={`mt-2.5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed font-bold transition active:scale-[.99] ${
              priceType === "purchase" ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300" : "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
            }`}>
              <PackagePlus size={19}/> {searchQuery.trim() ? `Create “${searchQuery.trim()}”` : "New product"}
            </button>
          )}
        </div>
        
        <div className="scrollbar-hide overflow-x-auto px-4 pb-2 [&_button]:min-h-10">
          <div className="flex gap-2 min-w-max">
            <button onClick={() => setActiveTab("all")} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${activeTab === "all" ? (priceType === "purchase" ? "bg-indigo-600 text-white" : "bg-green-600 text-white") : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>All</button>
            <button onClick={() => setActiveTab("favorites")} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition flex items-center gap-1 ${activeTab === "favorites" ? "bg-yellow-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}><Star size={14} /> Favorites</button>
            <button onClick={() => setActiveTab("recent")} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${activeTab === "recent" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>Recent</button>
            <button onClick={() => setActiveTab("most-used")} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${activeTab === "most-used" ? "bg-purple-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>Most Used</button>
          </div>
        </div>
        
      </div>

      <div className="app-scroll-region min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="text-6xl mb-4 opacity-50">📦</div>
            <p className="text-gray-500 dark:text-gray-400 text-base font-medium">
              {searchQuery ? `No products found for "${searchQuery}"` : "No products in catalog"}
            </p>
            {searchQuery && canCreateProduct && (
              <button onClick={() => onRequestCreateProduct(searchQuery)} className={`mt-6 w-full max-w-xs font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg text-base ${
                priceType === "purchase" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"
              }`}>
                <Plus size={20} /> Create "{searchQuery}"
              </button>
            )}
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl grid-cols-[repeat(auto-fill,minmax(min(100%,10.5rem),1fr))] gap-3">
            {filteredProducts.map(product => {
              const totalQty = addedProducts.filter(p => p.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
              const visibleUnits = getUnitsForDisplay(product);
              const isMultiUnit = visibleUnits.length > 1;

              return (
                <div key={product.id} className={`bg-white dark:bg-gray-800 rounded-2xl border-2 p-3 transition-all ${
                  totalQty > 0 ? (priceType === "purchase" ? "border-indigo-500 dark:border-indigo-400 shadow-md" : "border-green-500 dark:border-green-400 shadow-md") : "border-gray-200 dark:border-gray-700"
                }`}>
                  <div className="mb-2">
                    <span aria-hidden="true" className="mb-1 inline-grid size-8 place-items-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"><Package size={17}/></span>
                    <p className="break-words text-sm font-bold text-gray-900 dark:text-white">{product.name}</p>
                    {product.brand && <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate italic">{product.brand}</p>}
                  </div>

                  <div className="space-y-1 mb-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
                    {visibleUnits.slice(0, 2).map(unit => {
                      const quantity = addedProducts.find(item => item.productId === product.id && item.unitName === unit.name)?.quantity || 0;
                      return (
                        <div key={unit.id} className="flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <span className="block break-words font-medium text-gray-700 dark:text-gray-300">{unit.name}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(getPrice(unit), currency)}</span>
                          </div>
                          {isMultiUnit && (
                            <div className="flex shrink-0 items-center gap-1">
                              {quantity > 0 && <span className="font-bold tabular-nums" aria-label={`${quantity} selected`}>{quantity}</span>}
                              <button
                                type="button"
                                aria-label={`Add one ${unit.name} of ${product.name}`}
                                title={`Add one ${unit.name}`}
                                onClick={() => changeUnitQuantity(product, unit, 1)}
                                className={`grid size-11 place-items-center rounded-lg transition active:scale-95 ${priceType === "purchase" ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200" : "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200"}`}
                              >
                                <Plus size={17} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                      {totalQty > 0 ? <><Check size={16} /> Edit quantities</> : "View all types"}
                    </button>
                  )}
                  {!isMultiUnit && canAddType && (
                    <button type="button" onClick={() => openMultiUnitModal(product, true)} className="mt-2 w-full rounded-lg px-2 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                      + Add type
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalItemsCount > 0 && (
        <div className="app-safe-footer shrink-0 border-t border-gray-200 bg-white px-4 pt-3 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <button onClick={handleDone} className={`w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg text-lg ${
            priceType === "purchase" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"
          }`}>
            <Check size={24} /> Done ({totalItemsCount} items)
          </button>
        </div>
      )}

      {multiUnitProduct && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="product-types-heading" className="app-sheet flex w-full flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-gray-900 sm:max-w-md sm:rounded-2xl">
            <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center z-10">
              <div>
                <h3 id="product-types-heading" className="font-bold text-lg text-gray-900 dark:text-white">{multiUnitProduct.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Select quantities for each unit</p>
              </div>
              <button onClick={() => setMultiUnitProduct(null)} disabled={isSavingType} aria-label="Close product types" className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full disabled:opacity-50">
                <X size={18} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            
            <div className="app-scroll-region min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {canAddType && !showAddType && (
                <button type="button" onClick={() => { setShowAddType(true); setTypeError(""); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 p-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                  <Plus size={16} /> Add type
                </button>
              )}
              {canAddType && showAddType && (
                <form onSubmit={saveType} className="space-y-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                  <label className="block text-sm font-semibold">Type name
                    <input autoFocus required name="typeName" placeholder="e.g. Seara carton" className="mt-1 block w-full rounded-lg border border-gray-300 bg-transparent p-2 dark:border-gray-600" />
                  </label>
                  {priceType === "purchase" ? (
                    <label className="block text-sm">Buying price
                      <input name="purchasePrice" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" className="mt-1 block w-full rounded-lg border border-gray-300 bg-transparent p-2 dark:border-gray-600" />
                    </label>
                  ) : (
                    <label className="block text-sm">Selling price
                      <input name="salePrice" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" className="mt-1 block w-full rounded-lg border border-gray-300 bg-transparent p-2 dark:border-gray-600" />
                    </label>
                  )}
                  {typeError && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{typeError}</p>}
                  <div className="flex justify-end gap-2">
                    <button type="button" disabled={isSavingType} onClick={() => setShowAddType(false)} className="rounded-lg px-3 py-2 text-sm font-semibold">Cancel</button>
                    <button type="submit" disabled={isSavingType} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900">{isSavingType ? "Saving…" : "Save and select"}</button>
                  </div>
                </form>
              )}
              {getUnitsForDisplay(multiUnitProduct).map(unit => {
                const currentQty = tempQuantities[unit.id] || 0;
                const price = getPrice(unit);
                const currentTotal = tempTotals[unit.id] || 0;
                return (
                  <div key={unit.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-bold text-gray-900 dark:text-white">{unit.name}</p>
                        <p className={`text-xs font-semibold ${priceType === "purchase" ? "text-indigo-600 dark:text-indigo-400" : "text-green-600 dark:text-green-400"}`}>
                          {formatCurrency(price, currency)} per unit
                        </p>
                      </div>
                      <div className={`flex shrink-0 items-center gap-2 rounded-lg border p-1 ${
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
                        aria-label={`Quantity of ${unit.name}`}
                        type="text"
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
                    {price > 0 && (
                      <label className="mt-3 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {priceType === "purchase" ? "Total purchase amount" : "Customer wants to pay"}
                        <div className="relative mt-1">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">{currency}</span>
                          <input
                            aria-label={`Total amount for ${unit.name}`}
                            type="text"
                            inputMode="decimal"
                            value={currentTotal || ""}
                            onChange={event => updateModalTotal(unit, event.target.value)}
                            placeholder="0.00"
                            className="min-h-11 w-full rounded-xl border border-green-200 bg-white py-2 pl-12 pr-3 text-right font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-500 dark:border-green-800 dark:bg-gray-900 dark:text-white"
                          />
                        </div>
                        {currentTotal > 0 && <span className="mt-1 block text-right font-normal text-gray-500 dark:text-gray-400">Quantity {currentQty}</span>}
                      </label>
                    )}
                    {currentQty > 0 && (
                      <label className="mt-3 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                        Item note <span className="font-normal text-gray-400">(optional)</span>
                        <input
                          value={tempNotes[unit.id] || ""}
                          onChange={event => setTempNotes(notes => ({ ...notes, [unit.id]: event.target.value }))}
                          placeholder={priceType === "purchase" ? "e.g. damaged carton replaced" : "e.g. cut into small pieces"}
                          className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="app-safe-footer shrink-0 border-t border-gray-200 bg-white px-4 pt-3 dark:border-gray-800 dark:bg-gray-900">
              <button 
                onClick={confirmMultiUnitQuantities}
                disabled={isSavingType}
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
