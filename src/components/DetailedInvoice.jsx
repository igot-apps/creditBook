import { useState, useMemo, useEffect } from "react";
import { Search, Plus, X, Tag, ChevronUp, ChevronDown, Circle, Check } from "lucide-react";
import { ProductService } from "../services/ProductService";
import { formatCurrency } from "../utils/helpers";
import { AddProductModal } from "./AddProductModal";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const DetailedInvoice = ({
  tx, setTx, invoiceItems, setInvoiceItems,
  products, setProducts, currentStore, showToast
}) => {
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductForUnit, setSelectedProductForUnit] = useState(null);
  const [discount, setDiscount] = useState(tx.discount || "");
  const [showSummary, setShowSummary] = useState(true);

  // 👇 Use the full AddProductModal
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  const currency = currentStore?.currency || "GH₵";

  // 1. Smart Search Ranking: Favourites -> Most Used -> Alphabetical
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    
    if (!productSearch.trim()) {
      return products
        .sort((a, b) => {
          if (a.isFavourite !== b.isFavourite) return b.isFavourite ? 1 : -1;
          return (b.usageCount || 0) - (a.usageCount || 0);
        })
        .slice(0, 8);
    }
    
    const q = productSearch.toLowerCase();
    return products
      .filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        if (a.isFavourite !== b.isFavourite) return b.isFavourite ? 1 : -1;
        return (b.usageCount || 0) - (a.usageCount || 0);
      });
  }, [productSearch, products]);

  // Calculate Totals
  const totalInvoiceAmount = invoiceItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    return sum + (qty * price);
  }, 0);

  const discountAmount = parseFloat(discount) || 0;
  const finalTotal = Math.max(0, totalInvoiceAmount - discountAmount);

  useEffect(() => {
    setTx(prev => ({ ...prev, amount: finalTotal.toString() }));
  }, [finalTotal, setTx]);

  // 2. Add Unit to Invoice (Stores Historical Facts)
  const addUnitToInvoice = (product, unit) => {
    const existingIndex = invoiceItems.findIndex(
      i => i.productId === product.id && i.unitName === unit.name
    );

    if (existingIndex >= 0) {
      const updated = [...invoiceItems];
      updated[existingIndex].quantity = (updated[existingIndex].quantity || 1) + 1;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
      setInvoiceItems(updated);
    } else {
      setInvoiceItems([
        ...invoiceItems,
        {
          productId: product.id,
          name: product.name,
          brand: product.brand,
          unitName: unit.name,
          quantity: 1,
          price: unit.defaultSalePrice || 0,
          total: unit.defaultSalePrice || 0
        }
      ]);
    }
    
    setProductSearch("");
    setSelectedProductForUnit(null);
    ProductService.trackUsage(product.id);
  };

  // 👇 Handle saving the full product template
  const handleSaveProduct = async (productData) => {
    try {
      const newId = await ProductService.create(currentStore.id, productData);
      
      // Refresh products list
      const updatedProducts = await ProductService.getAll(currentStore.id);
      setProducts(updatedProducts);
      
      // Auto-add the first unit to the invoice
      const createdProduct = updatedProducts.find(p => p.id === newId);
      if (createdProduct && createdProduct.units && createdProduct.units.length > 0) {
        addUnitToInvoice(createdProduct, createdProduct.units[0]);
      }
      
      showToast("✅ Product template created and added!");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to create product.");
    }
  };

  // 3. Update Item Fields
  const updateItem = (index, field, value) => {
    const updated = [...invoiceItems];
    if (field !== 'name' && field !== 'unitName') {
      updated[index][field] = value === "" ? "" : (parseFloat(value) || 0);
    } else {
      updated[index][field] = value;
    }
    
    if (field === 'quantity' || field === 'price') {
      const qty = parseFloat(updated[index].quantity) || 0;
      const price = parseFloat(updated[index].price) || 0;
      updated[index].total = qty * price;
    }
    setInvoiceItems(updated);
  };

  const removeItem = (index) => setInvoiceItems(invoiceItems.filter((_, i) => i !== index));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[85vh]">
      
      {/* 1. COMPACT STICKY SEARCH BAR */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 p-2 border-b border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            value={productSearch} 
            onChange={e => setProductSearch(e.target.value)} 
            placeholder="Search product, brand, or category..." 
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm" 
            autoFocus
          />
        </div>
        
        {/* Search Results & Radio Card Unit Selector */}
        {productSearch && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto shadow-xl z-30">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(p => {
                if (selectedProductForUnit === p.id) {
                  return (
                    <div key={p.id} className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 bg-green-50/30 dark:bg-green-900/10">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
                        {p.name} {p.brand && `(${p.brand})`}
                      </p>
                      <div className="space-y-2">
                        {p.units && p.units.map(unit => (
                          <button 
                            key={unit.id} 
                            onClick={() => addUnitToInvoice(p, unit)}
                            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 transition text-left active:scale-[0.98]"
                          >
                            <div className="flex items-center gap-2">
                              <Circle size={16} className="text-gray-400" />
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{unit.name}</span>
                            </div>
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(unit.defaultSalePrice, currency)}
                            </span>
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={() => setSelectedProductForUnit(null)} 
                        className="w-full mt-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  );
                }

                return (
                  <button 
                    key={p.id} 
                    onClick={() => setSelectedProductForUnit(p.id)} 
                    className="w-full flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 text-left active:bg-gray-100 dark:active:bg-gray-800"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {p.category && `${p.category} • `}
                        {p.brand || 'General'} • {p.units?.length || 0} unit(s)
                      </p>
                    </div>
                    <Plus size={18} className="text-green-600 flex-shrink-0 ml-2" />
                  </button>
                );
              })
            ) : (
              // 👇 Show "No products found" with button to open full AddProductModal
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No products found for "{productSearch}"</p>
                <button 
                  onClick={() => setShowAddProductModal(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <Plus size={18} /> Create Product Template
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. SCROLLABLE ITEMS LIST */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/50 dark:bg-gray-900/30 min-h-[150px]">
        {invoiceItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">No items added yet</p>
            <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">Search above to start building the invoice</p>
          </div>
        ) : invoiceItems.map((item, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{item.name}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{item.unitName}</p>
              </div>
              <button onClick={() => removeItem(index)} className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg transition active:scale-90">
                <X size={14} />
              </button>
            </div>
            
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <label className="absolute left-2 top-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Qty</label>
                <input 
                  type="number" inputMode="decimal" 
                  value={item.quantity === "" ? "" : Number(item.quantity)} 
                  onChange={e => updateItem(index, 'quantity', e.target.value)} 
                  className={`w-full px-2 pt-3.5 pb-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm font-bold text-center outline-none focus:ring-1 focus:ring-blue-500 ${noSpinnerClass}`} 
                />
              </div>
              <span className="text-gray-400 dark:text-gray-500 text-xs font-bold">×</span>
              <div className="relative flex-[1.5]">
                <label className="absolute left-2 top-0.5 text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Price</label>
                <input 
                  type="number" inputMode="decimal" 
                  value={item.price === "" ? "" : Number(item.price)} 
                  onChange={e => updateItem(index, 'price', e.target.value)} 
                  className={`w-full px-2 pt-3.5 pb-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm font-bold text-right outline-none focus:ring-1 focus:ring-purple-500 ${noSpinnerClass}`} 
                />
              </div>
              <span className="text-gray-400 dark:text-gray-500 text-xs font-bold">=</span>
              <div className="flex-1 text-right min-w-[60px]">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), currency)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. COMPACT COLLAPSIBLE SUMMARY */}
      <div className="sticky bottom-0 z-20 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <button onClick={() => setShowSummary(!showSummary)} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Summary</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(finalTotal, currency)}</span>
          </div>
          {showSummary ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronUp size={16} className="text-gray-400" />}
        </button>
        
        {showSummary && (
          <div className="p-3 space-y-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Subtotal: {formatCurrency(totalInvoiceAmount, currency)}</span>
              <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/10 px-2 py-1 rounded border border-orange-100 dark:border-orange-900/30">
                <Tag className="text-orange-500" size={12} />
                <input 
                  type="number" inputMode="decimal" placeholder="Discount" 
                  value={discount} 
                  onChange={e => {
                    const val = e.target.value;
                    setDiscount(val);
                    setTx(prev => ({ ...prev, discount: val }));
                  }}
                  className={`w-16 bg-transparent text-right font-bold text-orange-700 dark:text-orange-400 outline-none text-xs ${noSpinnerClass}`} 
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200 dark:border-gray-600">
              <span className="text-sm font-bold text-gray-900 dark:text-white">Total Due:</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(finalTotal, currency)}</span>
            </div>
            
            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase mb-1 block">Money Received</label>
              <input 
                type="number" inputMode="decimal" placeholder="0.00" 
                value={tx.paid} onChange={e => setTx({...tx, paid: e.target.value})} 
                className={`w-full text-lg font-bold text-green-700 dark:text-green-400 outline-none bg-transparent border-b border-gray-200 dark:border-gray-700 pb-1 ${noSpinnerClass}`} 
              />
            </div>
          </div>
        )}
      </div>

      {/* 👇 Full AddProductModal */}
      <AddProductModal 
        isOpen={showAddProductModal} 
        onClose={() => setShowAddProductModal(false)} 
        onSave={handleSaveProduct} 
      />
    </div>
  );
};