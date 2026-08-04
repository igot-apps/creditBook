import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Truck, Package, Check, X } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { SupplierService } from "../services/SupplierService";
import { ProductService } from "../services/ProductService";
import { TopBar } from "../components/TopBar";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const RecordPurchasePage = () => {
  const { currentStore, setView, prefillTransaction, setPrefillTransaction, showToast } = useStore();
  const currency = currentStore?.currency || "GH";

  // State
  const [mode, setMode] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [note, setNote] = useState("");
  const [amountPaid, setAmountPaid] = useState(""); // 👈 NEW: Track payment made

  // 1. Load Data Safely
  useEffect(() => {
    if (currentStore?.id) {
      SupplierService.getAll(currentStore.id)
        .then(res => setSuppliers(Array.isArray(res) ? res : []))
        .catch(() => setSuppliers([]));
        
      ProductService.getAll(currentStore.id)
        .then(res => setProducts(Array.isArray(res) ? res : []))
        .catch(() => setProducts([]));
    }
  }, [currentStore?.id]);

  // 2. Handle Prefill (e.g., coming from Supplier Profile "Make Payment")
  useEffect(() => {
    if (prefillTransaction && prefillTransaction.supplierId) {
      const supplier = (Array.isArray(suppliers) ? suppliers : []).find(s => s.id === prefillTransaction.supplierId) || {
        id: prefillTransaction.supplierId,
        name: prefillTransaction.name || "Unknown Supplier",
        phone: prefillTransaction.phone || ""
      };
      setSelectedSupplier(supplier);
      setMode("existing");
      
      // 👈 Handle "Make Payment" prefill
      if (prefillTransaction.paid !== undefined) {
        setAmountPaid(prefillTransaction.paid.toString());
      }
      
      setPrefillTransaction(null);
    }
  }, [prefillTransaction, suppliers, setPrefillTransaction]);

  // 3. Filter Suppliers Safely
  const filteredSuppliers = useMemo(() => {
    if (!Array.isArray(suppliers)) return [];
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(q) || (s.phone && s.phone.includes(q)));
  }, [suppliers, searchQuery]);

  // 4. Filter Products Safely
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
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
    const name = searchQuery.trim();
    if (name) {
      SupplierService.addSupplier(currentStore.id, name, "")
        .then(id => {
          const newSupplier = { id, name, phone: "" };
          setSelectedSupplier(newSupplier);
          setMode("existing");
          setSearchQuery("");
          showToast("✅ Supplier created!");
          SupplierService.getAll(currentStore.id).then(setSuppliers);
        })
        .catch(() => showToast("❌ Failed to create supplier."));
    }
  };

  const addProductToInvoice = (product) => {
    const existing = invoiceItems.find(i => i.productId === product.id);
    const startingPrice = product.defaultPurchasePrice || 0;
    
    if (existing) {
      setInvoiceItems(invoiceItems.map(i => 
        i.productId === product.id ? { ...i, quantity: (i.quantity || 1) + 1, total: ((i.quantity || 1) + 1) * i.price } : i
      ));
    } else {
      setInvoiceItems([...invoiceItems, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: startingPrice,
        total: startingPrice,
        unit: product.unit || "Piece"
      }]);
    }
    setProductSearch("");
  };

  const updateItem = (index, field, value) => {
    const updated = [...invoiceItems];
    const numValue = value === "" ? "" : parseFloat(value);
    const isValidNum = numValue !== "" && !isNaN(numValue);

    if (field === 'quantity') {
      updated[index].quantity = numValue;
      const price = parseFloat(updated[index].price) || 0;
      updated[index].total = isValidNum ? (numValue * price) : "";
    } 
    else if (field === 'price') {
      updated[index].price = numValue;
      const qty = parseFloat(updated[index].quantity) || 0;
      updated[index].total = isValidNum ? (qty * numValue) : "";
    } 
    else if (field === 'total') {
      updated[index].total = numValue;
      const price = parseFloat(updated[index].price) || 0;
      if (price > 0 && isValidNum) {
        updated[index].quantity = numValue / price;
      } else {
        updated[index].quantity = "";
      }
    }
    setInvoiceItems(updated);
  };

  const removeItem = (index) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const totalAmount = invoiceItems.reduce((sum, item) => {
    if (item.total !== undefined && item.total !== "") return sum + (parseFloat(item.total) || 0);
    const qty = item.quantity === "" ? 0 : (parseFloat(item.quantity) || 0);
    const price = item.price === "" ? 0 : (parseFloat(item.price) || 0);
    return sum + (qty * price);
  }, 0);

  const handleSavePurchase = async () => {
    if (!selectedSupplier) return;
    
    const finalPaid = parseFloat(amountPaid) || 0;
    const finalTotal = totalAmount;

    // Allow saving if there are items OR a payment amount OR a note
    if (finalTotal === 0 && finalPaid === 0 && !note.trim()) {
      showToast("⚠️ Please add items, a payment amount, or a note.");
      return;
    }

    try {
      const itemsString = invoiceItems.length > 0 
        ? invoiceItems.map(i => `${i.quantity || 1} ${i.unit || "Piece"} ${i.name}`).join(", ") 
        : (note || "Payment made");
      
      await SupplierService.addTransaction(
        currentStore.id,
        selectedSupplier.id,
        finalTotal,
        finalPaid, //  Pass the actual paid amount
        itemsString,
        note
      );
      
      showToast("✅ Transaction recorded!");
      setView("suppliers");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to record transaction.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Record Purchase" showBack={true} onBack={() => setView("suppliers")} />
      
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
              {Array.isArray(filteredSuppliers) && filteredSuppliers.map(s => (
                <button key={s.id} onClick={() => handleSelectSupplier(s)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{s.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.phone || "No phone"}</p>
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
              <button onClick={() => { setMode("search"); setSelectedSupplier(null); setAmountPaid(""); setInvoiceItems([]); }} className="text-xs text-red-600 dark:text-red-400 underline font-semibold px-2 py-1 flex-shrink-0">Change</button>
            </div>
          </div>
        )}

        {/* 3. ITEMIZED PURCHASE */}
        {mode === "existing" && (
          <>
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
              
              {productSearch && Array.isArray(filteredProducts) && filteredProducts.length > 0 && (
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

            <div className="space-y-2">
              {invoiceItems.length === 0 ? (
                <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">Search and tap a product to add it, or enter a payment amount below.</p>
              ) : (
                Array.isArray(invoiceItems) && invoiceItems.map((item, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-bold text-gray-900 dark:text-white text-sm truncate pr-2 flex-1">{item.name}</p>
                      <button onClick={() => removeItem(index)} className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg transition active:scale-90"><X size={14} /></button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <label className="absolute left-2 top-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Qty</label>
                        <input type="number" inputMode="decimal" value={item.quantity === "" ? "" : Number(item.quantity)} onChange={e => updateItem(index, 'quantity', e.target.value)} className={`w-full px-2 pt-3.5 pb-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm font-bold text-center outline-none focus:ring-1 focus:ring-blue-500 ${noSpinnerClass}`} />
                      </div>
                      {item.unit && <span className="px-2 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded-lg uppercase tracking-wide flex-shrink-0">{item.unit}</span>}
                      <span className="text-gray-400 dark:text-gray-500 text-xs font-bold">×</span>
                      <div className="relative flex-[1.5]">
                        <label className="absolute left-2 top-0.5 text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Price</label>
                        <input type="number" inputMode="decimal" value={item.price === "" ? "" : Number(item.price)} onChange={e => updateItem(index, 'price', e.target.value)} className={`w-full px-2 pt-3.5 pb-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm font-bold text-right outline-none focus:ring-1 focus:ring-purple-500 ${noSpinnerClass}`} />
                      </div>
                      <span className="text-gray-400 dark:text-gray-500 text-xs font-bold">=</span>
                      <div className="relative flex-1">
                        <label className="absolute left-2 top-0.5 text-[9px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Total</label>
                        <input type="number" inputMode="decimal" value={item.total === "" ? "" : Number(item.total)} onChange={e => updateItem(index, 'total', e.target.value)} className={`w-full px-2 pt-3.5 pb-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm font-bold text-right outline-none focus:ring-1 focus:ring-green-500 ${noSpinnerClass}`} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 👇 UPDATED: Summary Section with Money Paid Input */}
            {(invoiceItems.length > 0 || amountPaid !== "") && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-gray-700 dark:text-gray-300">Total Purchase:</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(totalAmount, currency)}</span>
                </div>
                
                {/* 👇 NEW: Money Paid Upfront Input */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Money Paid Upfront</label>
                  <input 
                    type="number" 
                    inputMode="decimal"
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                    placeholder="0.00"
                    className={`w-full text-xl font-bold text-green-700 dark:text-green-400 outline-none bg-transparent border-b border-gray-200 dark:border-gray-700 pb-2 ${noSpinnerClass}`}
                  />
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
                  <Check size={24} /> {totalAmount > 0 ? "Record Purchase" : "Record Payment"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};