import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Truck, Package, Check, X } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { SupplierService } from "../services/SupplierService";
import { ProductService } from "../services/ProductService";
import { ProductPickerModal } from "../components/ProductPickerModal";
import { AddProductModal } from "../components/AddProductModal";
import { TopBar } from "../components/TopBar";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const RecordPurchasePage = () => {
  const { currentStore, setView, prefillTransaction, setPrefillTransaction, showToast, autoDraft, saveDraft, clearAutoDraft } = useStore();
  const currency = currentStore?.currency || "GH₵";

  const [mode, setMode] = useState("search");
  const [transactionType, setTransactionType] = useState("purchase");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [note, setNote] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState("");

  useEffect(() => {
    if (currentStore?.id) {
      SupplierService.getAll(currentStore.id).then(res => setSuppliers(Array.isArray(res) ? res : [])).catch(() => setSuppliers([]));
      ProductService.getAll(currentStore.id).then(res => setProducts(Array.isArray(res) ? res : [])).catch(() => setProducts([]));
    }
  }, [currentStore?.id]);

  useEffect(() => {
    if (prefillTransaction && prefillTransaction.supplierId) {
      const supplier = (Array.isArray(suppliers) ? suppliers : []).find(s => s.id === prefillTransaction.supplierId) || {
        id: prefillTransaction.supplierId, name: prefillTransaction.name || "Unknown Supplier", phone: prefillTransaction.phone || ""
      };
      setSelectedSupplier(supplier);
      setMode("existing");
      setTransactionType(prefillTransaction.type || "purchase");
      if (prefillTransaction.paid !== undefined) setAmountPaid(prefillTransaction.paid.toString());
      setPrefillTransaction(null);
      clearAutoDraft();
    }
  }, [prefillTransaction, suppliers, setPrefillTransaction, clearAutoDraft]);

  useEffect(() => {
    if (autoDraft && autoDraft.draftType === 'purchase' && suppliers.length > 0 && !selectedSupplier && !prefillTransaction) {
      const draftSupplier = suppliers.find(s => s.id === autoDraft.supplierId) || { id: autoDraft.supplierId, name: autoDraft.supplierName || 'Unknown Supplier', phone: autoDraft.supplierPhone || '' };
      setSelectedSupplier(draftSupplier);
      setTransactionType(autoDraft.transactionType || "purchase");
      setInvoiceItems(autoDraft.invoiceItems || []);
      setNote(autoDraft.note || '');
      setAmountPaid(autoDraft.amountPaid || '');
      setMode("existing");
    }
  }, [autoDraft, suppliers, selectedSupplier, prefillTransaction]);

  useEffect(() => {
    if (mode === 'existing' && selectedSupplier) {
      const draftData = { supplierId: selectedSupplier.id, supplierName: selectedSupplier.name, supplierPhone: selectedSupplier.phone, transactionType, invoiceItems, note, amountPaid, draftType: 'purchase' };
      const timeoutId = setTimeout(() => { saveDraft(draftData, true); }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedSupplier, transactionType, invoiceItems, note, amountPaid, mode, saveDraft]);

  const filteredSuppliers = useMemo(() => {
    if (!Array.isArray(suppliers)) return [];
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(q) || (s.phone && s.phone.includes(q)));
  }, [suppliers, searchQuery]);

  const handleSelectSupplier = (supplier) => { setSelectedSupplier(supplier); setMode("existing"); setSearchQuery(""); };
  const handleCreateSupplier = () => {
    const name = searchQuery.trim();
    if (name) {
      SupplierService.addSupplier(currentStore.id, name, "").then(id => {
        const newSupplier = { id, name, phone: "", balance: 0 };
        setSelectedSupplier(newSupplier); setMode("existing"); setSearchQuery("");
        showToast("✅ Supplier created!");
        SupplierService.getAll(currentStore.id).then(setSuppliers);
      }).catch(() => showToast("❌ Failed to create supplier."));
    }
  };

  const handleProductsSelected = (selectedProducts) => { setInvoiceItems(prev => [...prev, ...selectedProducts]); setShowProductPicker(false); };

  const handleSaveProduct = async (productData) => {
    try {
      const newId = await ProductService.create(currentStore.id, productData);
      const updatedProducts = await ProductService.getAll(currentStore.id);
      setProducts(updatedProducts);
      const createdProduct = updatedProducts.find(p => p.id === newId);
      if (createdProduct && createdProduct.units && createdProduct.units.length > 0) {
        const unit = createdProduct.units[0];
        setInvoiceItems(prev => [...prev, { productId: newId, name: createdProduct.name, brand: createdProduct.brand || "", unitName: unit.name, quantity: 1, price: unit.defaultPurchasePrice || 0, total: unit.defaultPurchasePrice || 0 }]);
      }
      showToast("✅ Product template created and added!");
      setNewProductName("");
    } catch (error) { console.error(error); showToast("❌ Failed to create product."); }
  };

  const updateItem = (index, field, value) => {
    const updated = [...invoiceItems];
    if (field !== 'name' && field !== 'unitName') updated[index][field] = value === "" ? "" : (parseFloat(value) || 0);
    else updated[index][field] = value;
    if (field === 'quantity' || field === 'price') {
      const qty = parseFloat(updated[index].quantity) || 0; const price = parseFloat(updated[index].price) || 0;
      updated[index].total = qty * price;
    }
    setInvoiceItems(updated);
  };

  const removeItem = (index) => setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  const totalAmount = invoiceItems.reduce((sum, item) => { const qty = parseFloat(item.quantity) || 0; const price = parseFloat(item.price) || 0; return sum + (qty * price); }, 0);

  const handleSavePurchase = async () => {
    if (!selectedSupplier) return;
    const finalPaid = parseFloat(amountPaid) || 0;
    const finalTotal = transactionType === "payment" ? 0 : totalAmount;
    if (finalTotal === 0 && finalPaid === 0 && !note.trim() && invoiceItems.length === 0) { showToast("⚠️ Please add items, a payment amount, or a note."); return; }
    try {
      await SupplierService.addTransaction(currentStore.id, selectedSupplier.id, finalTotal, finalPaid, invoiceItems, note);
      await clearAutoDraft();
      showToast("✅ Transaction recorded!");
      setView("suppliers");
    } catch (error) { console.error(error); showToast("❌ Failed to record transaction."); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title={transactionType === "purchase" ? "Record Purchase" : "Make Payment"} showBack={true} onBack={() => setView("suppliers")} />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">
        {mode === "search" && (
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Truck size={16} className="text-indigo-600" /> Select Supplier</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search suppliers..." className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" autoFocus />
            </div>
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {Array.isArray(filteredSuppliers) && filteredSuppliers.map(s => (
                <button key={s.id} onClick={() => handleSelectSupplier(s)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">{s.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 dark:text-white truncate">{s.name}</p><p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.phone || "No phone"}</p></div>
                </button>
              ))}
              {searchQuery.trim() && filteredSuppliers.length === 0 && (
                <button onClick={handleCreateSupplier} className="w-full flex items-center gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 transition text-left">
                  <Plus size={20} className="flex-shrink-0" /><div className="flex-1 min-w-0"><p className="font-semibold text-sm">Create new supplier</p><p className="text-xs opacity-80 truncate">Use "{searchQuery}"</p></div>
                </button>
              )}
            </div>
          </div>
        )}
        {mode === "existing" && selectedSupplier && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">{selectedSupplier.name.charAt(0)}</div>
              <div className="flex-1 min-w-0"><p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase font-bold">{transactionType === "purchase" ? "Buying from" : "Paying to"}</p><p className="font-bold text-gray-900 dark:text-white text-lg truncate">{selectedSupplier.name}</p></div>
              <button onClick={() => { setMode("search"); setSelectedSupplier(null); setAmountPaid(""); setInvoiceItems([]); setNote(""); clearAutoDraft(); }} className="text-xs text-red-600 dark:text-red-400 underline font-semibold px-2 py-1 flex-shrink-0">Change</button>
            </div>
          </div>
        )}
        {mode === "existing" && (
          <>
            {transactionType === "purchase" && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Package size={18} className="text-indigo-600" /> Add Items</h3>
                  <button onClick={() => setShowAddProductModal(true)} className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition"><Plus size={14} /> New Product</button>
                </div>
                <button onClick={() => setShowProductPicker(true)} className="w-full bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"><Plus size={20} /> Add Products</button>
                <div className="space-y-2">
                  {invoiceItems.length === 0 ? <p className="text-center text-gray-400 text-sm py-4">Tap "Add Products" to browse catalog or "New Product" to create one</p> : (
                    invoiceItems.map((item, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex-1 min-w-0 pr-2"><p className="font-bold text-gray-900 dark:text-white text-sm truncate">{item.name}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider">{item.unitName}</p></div>
                          <button onClick={() => removeItem(index)} className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg"><X size={14} /></button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1"><label className="absolute left-2 top-0.5 text-[9px] font-bold text-blue-600 uppercase">Qty</label><input type="number" inputMode="decimal" value={item.quantity === "" ? "" : Number(item.quantity)} onChange={e => updateItem(index, 'quantity', e.target.value)} className={`w-full px-2 pt-3.5 pb-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm font-bold text-center outline-none ${noSpinnerClass}`} /></div>
                          <span className="text-gray-400 text-xs font-bold">×</span>
                          <div className="relative flex-[1.5]"><label className="absolute left-2 top-0.5 text-[9px] font-bold text-purple-600 uppercase">Price</label><input type="number" inputMode="decimal" value={item.price === "" ? "" : Number(item.price)} onChange={e => updateItem(index, 'price', e.target.value)} className={`w-full px-2 pt-3.5 pb-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm font-bold text-right outline-none ${noSpinnerClass}`} /></div>
                          <span className="text-gray-400 text-xs font-bold">=</span>
                          <div className="flex-1 text-right min-w-[60px]"><p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), currency)}</p></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
              {transactionType === "purchase" && invoiceItems.length > 0 && (
                <div className="flex justify-between items-center text-lg font-bold"><span className="text-gray-700 dark:text-gray-300">Total Purchase:</span><span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(totalAmount, currency)}</span></div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">{transactionType === "purchase" ? "Money Paid Upfront" : "Payment Amount"}</label>
                <input type="number" inputMode="decimal" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder="0.00" className={`w-full text-xl font-bold text-green-700 dark:text-green-400 outline-none bg-transparent border-b border-gray-200 dark:border-gray-700 pb-2 ${noSpinnerClass}`} autoFocus={transactionType === "payment"} />
              </div>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)..." className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm resize-none" rows="2" />
              <button onClick={handleSavePurchase} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg"><Check size={24} /> {transactionType === "purchase" && totalAmount > 0 ? "Save Purchase" : "Save Payment"}</button>
            </div>
          </>
        )}
      </div>

      <ProductPickerModal
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        products={products}
        currentStore={currentStore}
        onProductsSelected={handleProductsSelected}
        priceType="purchase"
        // 👇 FIX: Close the picker BEFORE opening the Add Product modal to prevent z-index conflicts
        onRequestCreateProduct={(name) => { 
          setShowProductPicker(false); 
          setNewProductName(name); 
          setShowAddProductModal(true); 
        }}
      />

      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onSave={handleSaveProduct}
        initialName={newProductName}
      />
    </div>
  );
};