import { useState, useEffect, useMemo } from "react";
import { Search, X, ShoppingCart, Truck, Check, ArrowLeft, CheckSquare, Square, Eye, EyeOff } from "lucide-react";
import useStore from "../store/useStore";
import { ProductService, CATEGORY_EMOJIS } from "../services/ProductService";
import { formatCurrency } from "../utils/helpers";
import { TopBar } from "../components/TopBar";

export const VisibilityManagerPage = () => {
  const { currentStore, setView, showToast } = useStore();
  
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // all, hidden_sales, hidden_purchases, hidden_everywhere, visible_everywhere
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState(new Set()); // Stores strings like "productId__unitId"

  // 1. Load Products
  useEffect(() => {
    if (currentStore?.id) {
      ProductService.getAll(currentStore.id).then(setProducts);
    }
  }, [currentStore?.id]);

  // 2. Smart Filtering (Products & Units)
  const processedProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    const q = searchQuery.toLowerCase();

    return products.map(p => {
      // Filter units based on search and active filter
      const filteredUnits = p.units.filter(u => {
        const matchesSearch = !q || p.name.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
        if (!matchesSearch) return false;

        const isSalesHidden = u.visibleInSales === false;
        const isPurchasesHidden = u.visibleInPurchases === false;

        if (activeFilter === "hidden_sales") return isSalesHidden;
        if (activeFilter === "hidden_purchases") return isPurchasesHidden;
        if (activeFilter === "hidden_everywhere") return isSalesHidden && isPurchasesHidden;
        if (activeFilter === "visible_everywhere") return !isSalesHidden && !isPurchasesHidden;
        
        return true; // 'all'
      });

      return { ...p, units: filteredUnits };
    }).filter(p => p.units.length > 0); // Hide products with no matching units
  }, [products, searchQuery, activeFilter]);

  // 3. Instant Toggle Handler (Optimistic UI)
  const handleToggle = async (productId, unitId, field) => {
    const product = products.find(p => p.id === productId);
    const unit = product?.units.find(u => u.id === unitId);
    if (!unit) return;

    const newVal = !unit[field];
    
    // Optimistic local update for instant feel
    setProducts(prev => prev.map(p => p.id === productId ? {
      ...p, units: p.units.map(u => u.id === unitId ? { ...u, [field]: newVal } : u)
    } : p));

    try {
      await ProductService.updateUnitVisibility(productId, unitId, { [field]: newVal });
    } catch (error) {
      console.error("Failed to update visibility", error);
      showToast("❌ Failed to save changes");
    }
  };

  // 4. Bulk Selection Logic
  const toggleSelection = (key) => {
    setSelectedUnits(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllVisible = () => {
    const allKeys = new Set();
    processedProducts.forEach(p => p.units.forEach(u => allKeys.add(`${p.id}__${u.id}`)));
    setSelectedUnits(allKeys);
  };

  const clearSelection = () => setSelectedUnits(new Set());

  // 5. Bulk Action Handler
  const executeBulkAction = async (field, value) => {
    const updates = {}; // { productId: [unitIds] }
    
    selectedUnits.forEach(key => {
      const [productId, unitId] = key.split("__");
      if (!updates[productId]) updates[productId] = [];
      updates[productId].push(unitId);
    });

    // Optimistic local update
    setProducts(prev => prev.map(p => {
      if (!updates[p.id]) return p;
      return {
        ...p,
        units: p.units.map(u => updates[p.id].includes(u.id) ? { ...u, [field]: value } : u)
      };
    }));

    try {
      const promises = Object.entries(updates).map(([productId, unitIds]) => 
        ProductService.bulkUpdateUnitVisibility(productId, unitIds, { [field]: value })
      );
      await Promise.all(promises);
      showToast(`✅ Updated ${selectedUnits.size} units`);
    } catch (error) {
      console.error("Bulk update failed", error);
      showToast("❌ Failed to save bulk changes");
    }

    setIsBulkMode(false);
    clearSelection();
  };

  const filters = [
    { id: "all", label: "All" },
    { id: "hidden_sales", label: "Hidden in Sales" },
    { id: "hidden_purchases", label: "Hidden in Purchases" },
    { id: "hidden_everywhere", label: "Hidden Everywhere" },
    { id: "visible_everywhere", label: "Visible Everywhere" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <TopBar title="Manage Visibility" showBack={true} onBack={() => setView("products")} />
      
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="flex flex-col h-[calc(100vh-env(safe-area-inset-top)-4.5rem)]">
        
        {/* 1. SEARCH & BULK TOGGLE */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex-shrink-0">
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                placeholder="Search products or units..." 
                className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                  <X size={12} className="text-gray-600 dark:text-gray-300" />
                </button>
              )}
            </div>
            <button 
              onClick={() => { setIsBulkMode(!isBulkMode); clearSelection(); }}
              className={`px-3 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 transition active:scale-95 ${
                isBulkMode ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              {isBulkMode ? <CheckSquare size={16} /> : <Edit3 size={16} />}
              {isBulkMode ? "Done" : "Bulk"}
            </button>
          </div>

          {/* 2. FILTER CHIPS */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {filters.map(f => (
              <button 
                key={f.id} 
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                  activeFilter === f.id 
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" 
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. SCROLLABLE LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {processedProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="text-lg font-medium">No units found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters.</p>
            </div>
          ) : (
            processedProducts.map(product => (
              <div key={product.id}>
                {/* Product Group Header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-lg">{ProductService.getCategoryEmoji(product.category)}</span>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">{product.name}</h3>
                  {product.brand && <span className="text-[10px] text-gray-500 dark:text-gray-400 italic">({product.brand})</span>}
                </div>

                {/* Unit Rows */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {product.units.map(unit => {
                    const isSalesVisible = unit.visibleInSales !== false;
                    const isPurchasesVisible = unit.visibleInPurchases !== false;
                    const selectionKey = `${product.id}__${unit.id}`;
                    const isSelected = selectedUnits.has(selectionKey);

                    return (
                      <div key={unit.id} className={`p-3 flex items-center gap-3 ${isBulkMode ? (isSelected ? "bg-indigo-50 dark:bg-indigo-900/20" : "") : "active:bg-gray-50 dark:active:bg-gray-700/50"}`}>
                        
                        {/* Bulk Checkbox */}
                        {isBulkMode && (
                          <button onClick={() => toggleSelection(selectionKey)} className="flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                            {isSelected ? <CheckSquare size={20} /> : <Square size={20} className="text-gray-400" />}
                          </button>
                        )}

                        {/* Unit Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{unit.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">
                            Buy: {formatCurrency(unit.defaultPurchasePrice, currentStore?.currency)} • 
                            Sell: {formatCurrency(unit.defaultSalePrice, currentStore?.currency)}
                          </p>
                        </div>

                        {/* Visibility Toggles */}
                        {!isBulkMode && (
                          <div className="flex gap-2 flex-shrink-0">
                            <button 
                              onClick={() => handleToggle(product.id, unit.id, "visibleInSales")}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center transition active:scale-90 ${
                                isSalesVisible ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                              }`}
                              title={isSalesVisible ? "Visible in Sales" : "Hidden from Sales"}
                            >
                              <ShoppingCart size={16} />
                            </button>
                            <button 
                              onClick={() => handleToggle(product.id, unit.id, "visibleInPurchases")}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center transition active:scale-90 ${
                                isPurchasesVisible ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                              }`}
                              title={isPurchasesVisible ? "Visible in Purchases" : "Hidden from Purchases"}
                            >
                              <Truck size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 4. BULK ACTION BOTTOM SHEET */}
        {isBulkMode && selectedUnits.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 shadow-2xl z-50 animate-in slide-in-from-bottom-5">
            <div className="max-w-lg mx-auto space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-bold text-gray-900 dark:text-white text-sm">{selectedUnits.size} unit(s) selected</p>
                <button onClick={selectAllVisible} className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Select All Visible</button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => executeBulkAction("visibleInSales", false)} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1 active:scale-95 transition">
                  <EyeOff size={14} /> Hide from Sales
                </button>
                <button onClick={() => executeBulkAction("visibleInSales", true)} className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1 active:scale-95 transition">
                  <Eye size={14} /> Show in Sales
                </button>
                <button onClick={() => executeBulkAction("visibleInPurchases", false)} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1 active:scale-95 transition">
                  <EyeOff size={14} /> Hide from Purchases
                </button>
                <button onClick={() => executeBulkAction("visibleInPurchases", true)} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1 active:scale-95 transition">
                  <Eye size={14} /> Show in Purchases
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper icon for the Bulk button
const Edit3 = ({ size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
);