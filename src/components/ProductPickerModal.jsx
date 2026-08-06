import { useState, useEffect, useMemo } from "react";
import { Search, X, Plus, Check, Star, ArrowLeft } from "lucide-react";
import { ProductService, CATEGORY_EMOJIS } from "../services/ProductService";
import { formatCurrency } from "../utils/helpers";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const ProductPickerModal = ({ 
  isOpen, 
  onClose, 
  products, 
  currentStore, 
  onProductsSelected,
  priceType = "sale"
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedProductForUnit, setSelectedProductForUnit] = useState(null);
  const [addedProducts, setAddedProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const currency = currentStore?.currency || "GH₵";

  useEffect(() => {
    if (currentStore?.id) {
      ProductService.getCategories(currentStore.id).then(setCategories);
    }
  }, [currentStore?.id]);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];

    let result = [...products];

    if (activeTab === "favorites") {
      result = result.filter(p => p.isFavourite);
    } else if (activeTab === "recent") {
      result = result.filter(p => p.lastUsedAt).sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt)).slice(0, 10);
    } else if (activeTab === "most-used") {
      result = result.filter(p => (p.usageCount || 0) > 0).sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 10);
    }

    if (selectedCategory !== "All") {
      result = result.filter(p => p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

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
  }, [products, searchQuery, selectedCategory, activeTab]);

  const getPrice = (unit) => {
    return priceType === "purchase" 
      ? (unit.defaultPurchasePrice || 0)
      : (unit.defaultSalePrice || 0);
  };

  const handleAddProduct = async (product, unit = null) => {
    if (product.units && product.units.length > 1 && !unit) {
      setSelectedProductForUnit(product);
      return;
    }

    const selectedUnit = unit || (product.units && product.units[0]) || { name: "Piece", defaultSalePrice: 0, defaultPurchasePrice: 0 };

    setAddedProducts(prev => [...prev, {
      productId: product.id,
      name: product.name,
      brand: product.brand,
      unitName: selectedUnit.name,
      quantity: 1,
      price: getPrice(selectedUnit),
      total: getPrice(selectedUnit)
    }]);

    ProductService.trackUsage(product.id);
    setSelectedProductForUnit(null);
  };

  const handleDone = () => {
    if (addedProducts.length > 0) {
      onProductsSelected(addedProducts);
    }
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedCategory("All");
      setActiveTab("all");
      setSelectedProductForUnit(null);
      setAddedProducts([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // TRUE FULLSCREEN - Edge to edge
    <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-950 flex flex-col overflow-hidden">
      
      {/* 👇 FIXED HEADER - Absolutely cannot scroll */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        {/* Top bar */}
        <div className="flex items-center justify-between p-4">
          <button 
            onClick={onClose} 
            className="p-2 -ml-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition active:scale-95"
          >
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="font-bold text-xl text-gray-900 dark:text-white">
            {priceType === "purchase" ? "Add Purchase Items" : "Add Products"}
          </h1>
          {addedProducts.length > 0 ? (
            <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${
              priceType === "purchase" 
                ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400" 
                : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
            }`}>
              {addedProducts.length} added
            </div>
          ) : (
            <div className="w-10"></div>
          )}
        </div>

        {/* Search Box */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${
              priceType === "purchase" ? "text-indigo-400" : "text-green-400"
            }`} size={20} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products, brands, categories..."
              className={`w-full pl-12 pr-10 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 ${
                priceType === "purchase" 
                  ? "focus:ring-indigo-500 focus:border-indigo-500" 
                  : "focus:ring-green-500 focus:border-green-500"
              } dark:text-white text-base`}
              autoFocus
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-200 dark:bg-gray-700 rounded-full"
              >
                <X size={14} className="text-gray-600 dark:text-gray-300" />
              </button>
            )}
          </div>
        </div>

        {/* Smart Tabs */}
        <div className="px-4 pb-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                activeTab === "all"
                  ? priceType === "purchase" ? "bg-indigo-600 text-white" : "bg-green-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("favorites")}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition flex items-center gap-1 ${
                activeTab === "favorites"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Star size={14} /> Favorites
            </button>
            <button
              onClick={() => setActiveTab("recent")}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                activeTab === "recent"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setActiveTab("most-used")}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                activeTab === "most-used"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              Most Used
            </button>
          </div>
        </div>

        {/* Category Chips */}
        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setSelectedCategory("All")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                selectedCategory === "All"
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition flex items-center gap-1 ${
                  selectedCategory === cat
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                <span>{ProductService.getCategoryEmoji(cat)}</span>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 👇 SCROLLABLE PRODUCT GRID - Only this scrolls */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-500 dark:text-gray-400 text-base font-medium">No products found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
              {searchQuery ? `No results for "${searchQuery}"` : "Try a different category or search term"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(product => {
              const emoji = ProductService.getCategoryEmoji(product.category);
              const isAdded = addedProducts.some(p => p.productId === product.id);

              return (
                <div
                  key={product.id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl border-2 p-3 transition-all ${
                    isAdded
                      ? priceType === "purchase" 
                        ? "border-indigo-500 dark:border-indigo-400 shadow-md"
                        : "border-green-500 dark:border-green-400 shadow-md"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="text-center mb-2">
                    <div className="text-5xl mb-1">{emoji}</div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{product.name}</p>
                    {product.category && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{product.category}</p>
                    )}
                    {product.brand && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate italic">{product.brand}</p>
                    )}
                  </div>

                  <div className="space-y-1 mb-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
                    {product.units && product.units.slice(0, 2).map(unit => (
                      <div key={unit.id} className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{unit.name}</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(getPrice(unit), currency)}
                        </span>
                      </div>
                    ))}
                    {product.units && product.units.length > 2 && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center pt-1 border-t border-gray-200 dark:border-gray-700">
                        +{product.units.length - 2} more units
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleAddProduct(product)}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition active:scale-95 flex items-center justify-center gap-1 ${
                      isAdded
                        ? priceType === "purchase"
                          ? "bg-indigo-500 text-white"
                          : "bg-green-500 text-white"
                        : priceType === "purchase"
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                          : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check size={16} /> Added
                      </>
                    ) : (
                      <>
                        <Plus size={16} /> Add
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 👇 FIXED DONE BUTTON - Always visible at bottom */}
      {addedProducts.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-800 p-4 flex-shrink-0 shadow-2xl">
          <button
            onClick={handleDone}
            className={`w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg text-lg ${
              priceType === "purchase"
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            <Check size={24} />
            Done ({addedProducts.length} {addedProducts.length === 1 ? "Product" : "Products"})
          </button>
        </div>
      )}

      {/* Unit Selector Modal */}
      {selectedProductForUnit && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Choose Unit</h3>
              <button onClick={() => setSelectedProductForUnit(null)} className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                <X size={18} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{selectedProductForUnit.name}</p>
            <div className="space-y-2">
              {selectedProductForUnit.units.map(unit => (
                <button
                  key={unit.id}
                  onClick={() => handleAddProduct(selectedProductForUnit, unit)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition text-left active:scale-[0.98] ${
                    priceType === "purchase"
                      ? "border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                  }`}
                >
                  <span className="font-semibold text-gray-900 dark:text-white">{unit.name}</span>
                  <span className={`font-bold ${
                    priceType === "purchase"
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-green-600 dark:text-green-400"
                  }`}>
                    {formatCurrency(getPrice(unit), currency)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};