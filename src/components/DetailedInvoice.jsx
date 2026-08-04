import { useState, useMemo, useEffect } from "react";
import { Search, PlusCircle, X, Check, Tag, ChevronUp, ChevronDown } from "lucide-react";
import { ProductService } from "../services/ProductService";
import { formatCurrency } from "../utils/helpers";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const DetailedInvoice = ({
  tx, setTx, invoiceItems, setInvoiceItems,
  products, setProducts, currentStore, showToast
}) => {
  const [productSearch, setProductSearch] = useState("");
  const [showInlineProduct, setShowInlineProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", unit: "", category: "" });
  const [priceUpdateIndex, setPriceUpdateIndex] = useState(null);
  
  const [discount, setDiscount] = useState(tx.discount || "");
  const [showSummary, setShowSummary] = useState(true);

  const currency = currentStore?.currency || "GH₵";

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

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.filter(p => p.isFavourite || p.usageCount > 0).slice(0, 5);
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [productSearch, products]);

  const addProductToInvoice = (product, isOneTime = false) => {
    const existingIndex = invoiceItems.findIndex(i => i.productId === product.id && !i.isOneTime);
    
    if (existingIndex >= 0 && !isOneTime) {
      showToast(`"${product.name}" is already in the invoice.`);
    } else {
      setInvoiceItems([...invoiceItems, { 
        productId: isOneTime ? null : product.id, 
        name: product.name, 
        quantity: 1, 
        price: product.price || 0, 
        defaultPrice: product.price || 0, 
        unit: product.unit || "", 
        isOneTime 
      }]);
    }
    setProductSearch("");
    if (!isOneTime) ProductService.trackUsage(product.id);
  };

  const updateItem = (index, field, value) => {
    const updated = [...invoiceItems];
    if (field !== 'name') {
      updated[index][field] = value === "" ? "" : (parseFloat(value) || 0);
    } else {
      updated[index][field] = value;
    }
    if (field === 'price' && !updated[index].isOneTime) {
      const oldPrice = updated[index].defaultPrice; 
      const newPrice = parseFloat(value) || 0;
      if (oldPrice !== newPrice && newPrice > 0) setPriceUpdateIndex(index);
    }
    setInvoiceItems(updated);
  };

  const handlePriceUpdate = (index, shouldUpdate) => {
    if (shouldUpdate) {
      const productId = invoiceItems[index].productId;
      const newPrice = invoiceItems[index].price;
      ProductService.update(productId, { price: newPrice });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, price: newPrice } : p));
      const updated = [...invoiceItems];
      updated[index].defaultPrice = newPrice;
      setInvoiceItems(updated);
    }
    setPriceUpdateIndex(null);
  };

  const removeItem = (index) => setInvoiceItems(invoiceItems.filter((_, i) => i !== index));

  const handleSaveInlineProduct = () => {
    if (!newProduct.name.trim() || !newProduct.price) { showToast("Name and Price are required"); return; }
    const productData = { 
      name: newProduct.name.trim(), 
      price: parseFloat(newProduct.price), 
      unit: newProduct.unit.trim(), 
      category: newProduct.category.trim(), 
      isFavourite: false 
    };
    ProductService.create(currentStore.id, productData).then(newId => {
      const createdProduct = { id: newId, ...productData };
      setProducts([...products, createdProduct]); 
      addProductToInvoice(createdProduct);
      setShowInlineProduct(false); 
      setNewProduct({ name: "", price: "", unit: "", category: "" });
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[85vh]">
      
      {/* 1. COMPACT STICKY SEARCH BAR */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 p-2 border-b border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            value={productSearch} 
            onChange={e => setProductSearch(e.target.value)} 
            placeholder="Search or add product..." 
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm" 
            autoFocus
          />
        </div>
        {productSearch && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto shadow-xl z-30">
            {filteredProducts.length > 0 ? filteredProducts.map(p => (
              <button key={p.id} onClick={() => addProductToInvoice(p)} className="w-full flex justify-between items-center p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 text-left">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{p.name}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(p.price, currency)} {p.unit && `/ ${p.unit}`}</p>
                </div>
                <PlusCircle size={16} className="text-green-600" />
              </button>
            )) : (
              <button onClick={() => { setNewProduct({...newProduct, name: productSearch}); setShowInlineProduct(true); }} className="w-full p-2.5 text-green-700 dark:text-green-400 font-semibold flex items-center gap-2 hover:bg-green-50 dark:hover:bg-green-900/20 text-sm">
                <PlusCircle size={16} /> Create "{productSearch}"
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. COMPACT SCROLLABLE ITEMS LIST */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/50 dark:bg-gray-900/30 min-h-[150px]">
        {invoiceItems.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-400 dark:text-gray-500 text-sm">No items added yet.</p>
            <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">Search above to start building.</p>
          </div>
        ) : invoiceItems.map((item, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-center mb-1.5">
              <p className="font-bold text-gray-900 dark:text-white text-sm truncate pr-2 flex-1">
                {item.name} {item.isOneTime && <span className="text-[10px] text-blue-500 font-normal ml-1">(One-time)</span>}
              </p>
              <button onClick={() => removeItem(index)} className="text-gray-400 hover:text-red-500 p-1 transition active:scale-90"><X size={14} /></button>
            </div>
            
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input 
                  type="number" inputMode="decimal" 
                  value={item.quantity === "" ? "" : Number(item.quantity)} 
                  onChange={e => updateItem(index, 'quantity', e.target.value)} 
                  placeholder="Qty"
                  className={`w-full px-2 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-center outline-none focus:ring-1 focus:ring-blue-500 ${noSpinnerClass}`} 
                />
              </div>
              <span className="text-gray-400 dark:text-gray-500 text-xs font-bold">×</span>
              
              <div className="relative flex-[1.5]">
                <input 
                  type="number" inputMode="decimal" 
                  value={item.price === "" ? "" : Number(item.price)} 
                  onChange={e => updateItem(index, 'price', e.target.value)} 
                  placeholder="Price"
                  className={`w-full px-2 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-right outline-none focus:ring-1 focus:ring-blue-500 ${noSpinnerClass}`} 
                />
              </div>
              <span className="text-gray-400 dark:text-gray-500 text-xs font-bold">=</span>
              
              <div className="flex-1 text-right min-w-[60px]">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), currency)}
                </p>
              </div>
            </div>
            
            {priceUpdateIndex === index && (
              <div className="mt-2 pt-1.5 border-t border-dashed border-yellow-300 dark:border-yellow-800 flex items-center justify-between text-[11px]">
                <span className="text-yellow-700 dark:text-yellow-400 font-medium">Update default price?</span>
                <div className="flex gap-3">
                  <button onClick={() => handlePriceUpdate(index, true)} className="font-bold text-green-700 dark:text-green-400">Yes</button>
                  <button onClick={() => handlePriceUpdate(index, false)} className="text-gray-500 font-medium">No</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 3. COMPACT COLLAPSIBLE SUMMARY */}
      <div className="sticky bottom-0 z-20 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <button onClick={() => setShowSummary(!showSummary)} className="w-full flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Summary</span>
            <span className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(finalTotal, currency)}</span>
          </div>
          {showSummary ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronUp size={14} className="text-gray-400" />}
        </button>
        
        {showSummary && (
          <div className="p-2.5 space-y-2 border-t border-gray-100 dark:border-gray-700">
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
            <div className="flex justify-between items-center pt-1 border-t border-dashed border-gray-200 dark:border-gray-600">
              <span className="text-sm font-bold text-gray-900 dark:text-white">Total Due:</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(finalTotal, currency)}</span>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase">Money Paid</label>
              <input 
                type="number" inputMode="decimal" placeholder="0.00" 
                value={tx.paid} onChange={e => setTx({...tx, paid: e.target.value})} 
                className={`w-full text-base font-bold text-green-700 dark:text-green-400 outline-none bg-transparent border-b border-gray-200 dark:border-gray-700 pb-1 ${noSpinnerClass}`} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Inline Create Product Modal */}
      {showInlineProduct && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Create Product</h3>
              <button onClick={() => setShowInlineProduct(false)} className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm" autoFocus />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" inputMode="decimal" placeholder="Default Price" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className={`w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm ${noSpinnerClass}`} />
                <input placeholder="Unit (e.g. kg)" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm" />
              </div>
              <input placeholder="Category (Optional)" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm" />
              <button onClick={handleSaveInlineProduct} className="w-full bg-green-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 active:scale-95 transition text-sm"><Check size={18} /> Save & Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};