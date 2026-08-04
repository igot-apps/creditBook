import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Truck, Package, Check, ArrowLeft, X, Trash2 } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { SupplierService } from "../services/SupplierService";
import { ProductService } from "../services/ProductService";
import { TopBar } from "../components/TopBar";

export const RecordPurchasePage = () => {
  const { currentStore, suppliers, setView, prefillTransaction, setPrefillTransaction, showToast } = useStore();
  const currency = currentStore?.currency || "GH₵";

  // State
  const [mode, setMode] = useState("search"); // search, existing, new
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [products, setProducts] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [note, setNote] = useState("");

  // Load Data
  useEffect(() => {
    if (currentStore?.id) {
      ProductService.getAll(currentStore.id).then(setProducts);
    }
  }, [currentStore?.id]);

  // Handle Prefill (from Supplier Profile "Make Payment" or "Record Purchase")
  useEffect(() => {
    if (prefillTransaction) {
      if (prefillTransaction.supplierId) {
        // Find supplier from list (or mock it if not loaded yet)
        const supplier = suppliers.find(s => s.id === prefillTransaction.supplierId) || {
          id: prefillTransaction.supplierId,
          name: prefillTransaction.name,
          phone: prefillTransaction.phone
        };
        setSelectedSupplier(supplier);
        setMode("existing");
      }
      if (prefillTransaction.items === "Payment") {
        // If it's a payment, we might just want a simple amount input, 
        // but for now we'll treat it as a purchase with 0 items and a 'paid' amount.
        // (Simplification for V1)
      }
      setPrefillTransaction(null);
    }
  }, [prefillTransaction, suppliers, setPrefillTransaction]);

  // Filter Suppliers
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(q) || s.phone.includes(q));
  }, [suppliers, searchQuery]);

  // Filter Products
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.filter(p => p.isFavourite).slice(0, 5);
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [productSearch, products]);

  // Actions
  const handleSelectSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setMode("existing");
    setSearchQuery("");
  };

  const handleCreateSupplier = () => {
    // Simple inline creation for V1
    const name = searchQuery.trim();
    if (name) {
      SupplierService.addSupplier(currentStore.id, name, "").then(id => {
        const newSupplier = { id, name, phone: "" };
        setSelectedSupplier(newSupplier);
        setMode("existing");
        setSearchQuery("");
        showToast("✅ Supplier created!");
      });
    }
  };

  const addProductToInvoice = (product) => {
    const existing = invoiceItems.find(i => i.productId === product.id);
    if (existing) {
      setInvoiceItems(invoiceItems.map(i => 
        i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setInvoiceItems([...invoiceItems, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: product.defaultPurchasePrice || 0, //  USES BUYING PRICE
        unit: product.unit
      }]);
    }
    setProductSearch("");
  };

  const updateItem = (index, field, value) => {
    const updated = [...invoiceItems];
    updated[index][field] = parseFloat(value) || 0;
    setInvoiceItems(updated);
  };

  const removeItem = (index) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const totalAmount = invoiceItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  const handleSavePurchase = async () => {
    if (!selectedSupplier) return;
    if (totalAmount === 0 && !note) {
      showToast("⚠️ Please add items or a note.");
      return;
    }

    try {
      const itemsString = invoiceItems.map(i => `${i.quantity} ${i.unit} ${i.name}`).join(", ");
      
      await SupplierService.addTransaction(
        currentStore.id,
        selectedSupplier.id,
        totalAmount,
        0, // Paid 0 for now (Payment flow can be added later)
        itemsString || note,
        note
      );
      
      showToast("✅ Purchase recorded!");
      setView("suppliers"); // Go back to supplier list
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to record purchase.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* 👇 FIXED TOP BAR - Explicit Title & Indigo Theme */}
      <TopBar title="Record Purchase" showBack={true} onBack={() => setView("suppliers")} />
      
      {/* 👇 MAIN CONTENT */}
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">
        
        {/* 1. SUPPLIER SELECTION */}
        {mode === "search" && (
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Truck size={16} className="text-indigo-600" /> Select Supplier
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search suppliers..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                autoFocus
              />
            </div>
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {filteredSuppliers.map(s => (
                <button key={s.id} onClick={() => handleSelectSupplier(s)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{s.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.phone}</p>
                  </div>
                </button>
              ))}
              {searchQuery.trim() && filteredSuppliers.length === 0 && (
                <button onClick={handleCreateSupplier} className="w-full flex items-center gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 transition text-left">
                  <Plus size={20} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Create new supplier</p>
                    <p className="text-xs opacity-80 truncate">Use "{searchQuery}"</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 2. SELECTED SUPPLIER CARD */}
        {mode === "existing" && selectedSupplier && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                {selectedSupplier.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase font-bold">Buying from</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{selectedSupplier.name}</p>
              </div>
              <button onClick={() => { setMode("search"); setSelectedSupplier(null); }} className="text-xs text-red-600 dark:text-red-400 underline font-semibold px-2 py-1 flex-shrink-0">Change</button>
            </div>
          </div>
        )}

        {/* 3. ITEMIZED PURCHASE (Only if supplier selected) */}
        {mode === "existing" && (
          <>
            {/* Product Search */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Package size={18} className="text-indigo-600" /> Add Items
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
                />
              </div>
              
              {/* Product Suggestions */}
              {productSearch && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 max-h-40 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <button key={p.id} onClick={() => addProductToInvoice(p)} className="w-full flex justify-between items-center p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0 text-left">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{p.name}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(p.defaultPurchasePrice, currency)} {p.unit && `/ ${p.unit}`}</p>
                      </div>
                      <Plus size={16} className="text-indigo-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Invoice Items List */}
            <div className="space-y-2">
              {invoiceItems.length === 0 ? (
                <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">Search and tap a product to add it.</p>
              ) : (
                invoiceItems.map((item, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={item.quantity} 
                        onChange={e => updateItem(index, 'quantity', e.target.value)}
                        className="w-12 px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-center text-sm font-bold"
                      />
                      <span className="text-gray-400">×</span>
                      <input 
                        type="number" 
                        value={item.price} 
                        onChange={e => updateItem(index, 'price', e.target.value)}
                        className="w-16 px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-right text-sm font-bold"
                      />
                    </div>
                    <button onClick={() => removeItem(index)} className="text-red-400 p-1"><X size={16} /></button>
                  </div>
                ))
              )}
            </div>

            {/* Total & Save */}
            {invoiceItems.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-gray-700 dark:text-gray-300">Total Purchase:</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(totalAmount, currency)}</span>
                </div>
                
                <textarea 
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a note (optional)..."
                  className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm resize-none"
                  rows="2"
                />

                <button 
                  onClick={handleSavePurchase}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg"
                >
                  <Check size={24} /> Record Purchase
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};