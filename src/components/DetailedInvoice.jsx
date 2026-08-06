import { useState, useMemo, useEffect } from "react";
import { Plus, X, Tag, ChevronUp, ChevronDown, Package } from "lucide-react";
import { ProductService } from "../services/ProductService";
import { formatCurrency } from "../utils/helpers";
import { ProductPickerModal } from "./ProductPickerModal";
import { AddProductModal } from "./AddProductModal";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const DetailedInvoice = ({
  tx, setTx, invoiceItems, setInvoiceItems,
  products, setProducts, currentStore, showToast
}) => {
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [discount, setDiscount] = useState(tx.discount || "");
  const [showSummary, setShowSummary] = useState(true);

  const currency = currentStore?.currency || "GH₵";

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

  // Handle products selected from ProductPickerModal
  const handleProductsSelected = (selectedProducts) => {
    setInvoiceItems(prev => [...prev, ...selectedProducts]);
    setShowProductPicker(false);
  };

  // 👇 NEW: Handle saving the full product template from AddProductModal
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

  // Add Unit to Invoice (Stores Historical Facts)
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
    
    ProductService.trackUsage(product.id);
  };

  // Update Item Fields
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
      
      {/* 1. ADD PRODUCTS BUTTON */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 p-3 border-b border-gray-100 dark:border-gray-700 shadow-sm">
        <button
          onClick={() => setShowProductPicker(true)}
          className="w-full bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border-2 border-dashed border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <Plus size={20} />
          Add Products
        </button>
      </div>

      {/* 2. INVOICE ITEMS LIST */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/50 dark:bg-gray-900/30 min-h-[150px]">
        {invoiceItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No items added yet</p>
            <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">Tap "Add Products" to start</p>
          </div>
        ) : (
          invoiceItems.map((item, index) => (
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
          ))
        )}
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

      {/* 👇 PRODUCT PICKER MODAL (with new onRequestCreateProduct prop) */}
      <ProductPickerModal
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        products={products}
        currentStore={currentStore}
        onProductsSelected={handleProductsSelected}
        onRequestCreateProduct={(name) => { setNewProductName(name); setShowAddProductModal(true); }}
      />

      {/* 👇 FULL PRODUCT TEMPLATE MODAL (with initialName prop) */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onSave={handleSaveProduct}
        initialName={newProductName}
      />
    </div>
  );
};