import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Truck, Package, Check, X, Circle } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { SupplierService } from "../services/SupplierService";
import { ProductService } from "../services/ProductService";
import { TopBar } from "../components/TopBar";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const RecordPurchasePage = () => {
  const { currentStore, setView, prefillTransaction, setPrefillTransaction, showToast } = useStore();
  const currency = currentStore?.currency || "GH₵";

  const [mode, setMode] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductForUnit, setSelectedProductForUnit] = useState(null);
  const [note, setNote] = useState("");
  const [amountPaid, setAmountPaid] = useState("");

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

  useEffect(() => {
    if (prefillTransaction && prefillTransaction.supplierId) {
      const supplier = (Array.isArray(suppliers) ? suppliers : []).find(s => s.id === prefillTransaction.supplierId) || {
        id: prefillTransaction.supplierId,
        name: prefillTransaction.name || "Unknown Supplier",
        phone: prefillTransaction.phone || ""
      };
      setSelectedSupplier(supplier);
      setMode("existing");
      if (prefillTransaction.paid !== undefined) {
        setAmountPaid(prefillTransaction.paid.toString());
      }
      setPrefillTransaction(null);
    }
  }, [prefillTransaction, suppliers, setPrefillTransaction]);

  const filteredSuppliers = useMemo(() => {
    if (!Array.isArray(suppliers)) return [];
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(q) || (s.phone && s.phone.includes(q)));
  }, [suppliers, searchQuery]);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    if (!productSearch.trim()) {
      return products.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 8);
    }
    const q = productSearch.toLowerCase();
    return products.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q))
    ).sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  }, [productSearch, products]);

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
          const newSupplier = { id, name, phone: "", balance: 0 };
          setSelectedSupplier(newSupplier);
          setMode("existing");
          setSearchQuery("");
          showToast("✅ Supplier created!");
          SupplierService.getAll(currentStore.id).then(setSuppliers);
        })
        .catch(() => showToast("❌ Failed to create supplier."));
    }
  };

  const addUnitToInvoice = (product, unit) => {
    const existingIndex = invoiceItems.findIndex(i => i.productId === product.id && i.unitName === unit.name);
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
          price: unit.defaultPurchasePrice || 0,
          total: unit.defaultPurchasePrice || 0
        }
      ]);
    }
    setProductSearch("");
    setSelectedProductForUnit(null);
    ProductService.trackUsage(product.id);
  };

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

  const totalAmount = invoiceItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    return sum + (qty * price);
  }, 0);

  const handleSavePurchase = async () => {
    if (!selectedSupplier) return;
    const finalPaid = parseFloat(amountPaid) || 0;
    const finalTotal = totalAmount;

    if (finalTotal === 0 && finalPaid === 0 && !note.trim() && invoiceItems.length === 0) {
      showToast("⚠️ Please add items, a payment amount, or a note.");
      return;
    }

    try {
      await SupplierService.addTransaction(
        currentStore.id,
        selectedSupplier.id,
        finalTotal,
        finalPaid,
        invoiceItems,
        note
      );
      showToast("✅ Purchase recorded!");
      setView("suppliers");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to record purchase.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Record Purchase" showBack={true} onBack={() => setView("suppliers")} />
      
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">
        
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
                  {s.balance > 0 && (
                    <p className="text-xs font-bold text-orange-600 dark:text-orange-400">
                      Owed: {formatCurrency(s.balance, currency)}
                    </p>
                  )}
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
                  placeholder="Search product, brand, or category..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
                />
              </div>

              {productSearch && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(p => {
                      if (selectedProductForUnit === p.id) {
                        return (
                          <div key={p.id} className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 bg-indigo-50/30 dark:bg-indigo-900/10">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
                              {p.name} {p.brand && `(${p.brand})`}
                            </p>
                            <div className="space-y-2">
                              {p.units && p.units.map(unit => (
                                <button 
                                  key={unit.id} 
                                  onClick={() => addUnitToInvoice(p, unit)}
                                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-700 transition text-left active:scale-[0.98]"
                                >
                                  <div className="flex items-center gap-2">
                                    <Circle size={16} className="text-gray-400" />
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{unit.name}</span>
                                  </div>
                                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                    {formatCurrency(unit.defaultPurchasePrice, currency)}
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
                          className="w-full flex justify-between items-center p-3 hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0 text-left"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{p.name}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {p.category && `${p.category} • `}
                              {p.brand || 'General'} • {p.units?.length || 0} unit(s)
                            </p>
                          </div>
                          <Plus size={16} className="text-indigo-600 flex-shrink-0 ml-2" />
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No products found.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {invoiceItems.length === 0 ? (
                <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">Search and tap a product to add it, or enter a payment amount below.</p>
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
                        <input type="number" inputMode="decimal" value={item.quantity === "" ? "" : Number(item.quantity)} onChange={e => updateItem(index, 'quantity', e.target.value)} className={`w-full px-2 pt-3.5 pb-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm font-bold text-center outline-none focus:ring-1 focus:ring-blue-500 ${noSpinnerClass}`} />
                      </div>
                      <span className="text-gray-400 dark:text-gray-500 text-xs font-bold">×</span>
                      <div className="relative flex-[1.5]">
                        <label className="absolute left-2 top-0.5 text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Price</label>
                        <input type="number" inputMode="decimal" value={item.price === "" ? "" : Number(item.price)} onChange={e => updateItem(index, 'price', e.target.value)} className={`w-full px-2 pt-3.5 pb-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm font-bold text-right outline-none focus:ring-1 focus:ring-purple-500 ${noSpinnerClass}`} />
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

            {(invoiceItems.length > 0 || amountPaid !== "") && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-gray-700 dark:text-gray-300">Total Purchase:</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(totalAmount, currency)}</span>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Paid Today</label>
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
                  <Check size={24} /> {totalAmount > 0 ? "Save Purchase" : "Save Payment"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};