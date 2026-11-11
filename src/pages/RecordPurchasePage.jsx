import { DiscardInvoiceModal } from "../components/DiscardInvoiceModal";
import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus, Truck, Package, Check, X, Pause, Loader2, Percent } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { InvoicePayments } from "../components/InvoicePayments";
import { SupplierService } from "../services/SupplierService";
import { ProductService } from "../services/ProductService";
import { TransactionService } from "../services/TransactionService";
import { SuspendedTransactionService } from "../services/SuspendedTransactionService";
import { ProductPickerModal } from "../components/ProductPickerModal";
import { AddProductModal } from "../components/AddProductModal";
import { TopBar } from "../components/TopBar";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const RecordPurchasePage = () => {
  const {
    currentStore, setView, prefillTransaction, setPrefillTransaction, showToast,
    autoDraft, saveDraft, clearAutoDraft,
    fixTransaction, setFixTransaction, lastScrollPosition, setLastScrollPosition,
    setSelectedSupplier: setStoreSelectedSupplier,
    resumedSuspendedId, clearResumedSuspended,
    readOnly
  } = useStore();

  // 👇 VIEW-ONLY GUARD
  const blockIfReadOnly = () => {
    if (readOnly) {
      showToast("🔒 Subscription expired — please renew to continue.");
      return true;
    }
    return false;
  };

  const currency = currentStore?.currency || "GH₵";
  const lastActionTime = useRef(0);

  const [mode, setMode] = useState("search");
  const [transactionType, setTransactionType] = useState("purchase");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [note, setNote] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [invoicePayments, setInvoicePayments] = useState([]);
  const [discount, setDiscount] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [isFixing, setIsFixing] = useState(false);
  const [fixingOldId, setFixingOldId] = useState(null);
  const [replacementId, setReplacementId] = useState(null);
  const [originalAmount, setOriginalAmount] = useState(0);
  const [originalPaid, setOriginalPaid] = useState(0);
  const [fixReason, setFixReason] = useState("");
  const [invoiceToDiscard, setInvoiceToDiscard] = useState(null);
  const [suspendedId, setSuspendedId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);

  // Load Draft on Mount
  useEffect(() => { useStore.getState().loadDraft('purchase'); }, []);

  useEffect(() => {
    if (currentStore?.id) {
      SupplierService.getAll({ fetchAll: true }).then(res => setSuppliers(Array.isArray(res) ? res : [])).catch(() => setSuppliers([]));
      ProductService.getAll().then(res => setProducts(Array.isArray(res) ? res : [])).catch(() => setProducts([]));
    }
  }, [currentStore?.id]);

  // Load Suspended Purchase if resumed from Home Page
  useEffect(() => {
    if (resumedSuspendedId) {
      SuspendedTransactionService.getSuspendedTransactions().then(all => {
        const susp = all.find(s => s.id === resumedSuspendedId);
        if (susp) {
          setSelectedSupplier({
            id: susp.contactId,
            name: susp.contactName || "Unknown Supplier",
            phone: susp.contactPhone || ""
          });
          setInvoiceItems(susp.items || []);
          setTransactionType(susp.type === 'payment' ? 'payment' : 'purchase');
          setAmountPaid((susp.paid || 0).toString());
          setInvoicePayments(susp.invoicePayments || []);
          setDiscount((susp.discount || 0).toString());
          setNote(susp.note || "");
          setSuspendedId(susp.id);
          setMode("existing");
          showToast("️ Resumed suspended purchase");
        }
        clearResumedSuspended();
      });
    }
  }, [resumedSuspendedId, clearResumedSuspended, showToast]);

  // Handle Prefill from Profile Page
  useEffect(() => {
    if (prefillTransaction && prefillTransaction.supplierId) {
      const supplier = suppliers.find(s => s.id === prefillTransaction.supplierId) || {
        id: prefillTransaction.supplierId,
        name: prefillTransaction.name || "Unknown Supplier",
        phone: prefillTransaction.phone || ""
      };
      setSelectedSupplier(supplier);
      setMode("existing");
      setTransactionType(prefillTransaction.type || "purchase");
      if (prefillTransaction.paid !== undefined) setAmountPaid(prefillTransaction.paid.toString());
      setPrefillTransaction(null);
      clearAutoDraft('purchase');
    }
  }, [prefillTransaction, suppliers, setPrefillTransaction, clearAutoDraft]);

  // Handle Fix Transaction (snake_case-safe + fetches REAL supplier name)
  useEffect(() => {
    if (!fixTransaction || !fixTransaction.id) return;
    const contactId = fixTransaction.contact_id || fixTransaction.contactId;
    const startFixMode = (supplier) => {
      setSelectedSupplier(supplier);
      setTransactionType(fixTransaction.type === "supplier_payment" ? "payment" : "purchase");
      setInvoiceItems(fixTransaction.items || []);
      setNote(fixTransaction.note || '');
      setAmountPaid(fixTransaction.paid?.toString() || '');
      setInvoicePayments(fixTransaction.invoice_payments || []);
      setDiscount(fixTransaction.discount?.toString() || '');
      setOriginalAmount(Number(fixTransaction.type === "supplier_payment" ? fixTransaction.paid : fixTransaction.amount) || 0);
      setOriginalPaid(Number(fixTransaction.paid) || 0);
      setFixReason(fixTransaction.fixReason || "");
      setMode("existing");
      setIsFixing(true);
      setFixingOldId(fixTransaction.id);
      setReplacementId(crypto.randomUUID());
      setFixTransaction(null);
    };
    if (contactId) {
      SupplierService.getById(contactId)
        .then(s => startFixMode(s || { id: contactId, name: "Unknown Supplier", phone: "" }))
        .catch(() => startFixMode({ id: contactId, name: "Unknown Supplier", phone: "" }));
    } else {
      startFixMode({ id: null, name: "Unknown Supplier", phone: "" });
    }
  }, [fixTransaction, setFixTransaction]);

  const handleAbortFix = () => {
    if (!isSaving) setView("supplierProfile");
  };

  // Restore Auto-Draft
  useEffect(() => {
    if (autoDraft && autoDraft.draftType === 'purchase' && suppliers.length > 0 && !selectedSupplier && !prefillTransaction && !resumedSuspendedId && !fixTransaction && !isFixing) {
      const draftSupplier = suppliers.find(s => s.id === autoDraft.supplierId) || {
        id: autoDraft.supplierId,
        name: autoDraft.supplierName || 'Unknown Supplier',
        phone: autoDraft.supplierPhone || ''
      };
      setSelectedSupplier(draftSupplier);
      setTransactionType(autoDraft.transactionType || "purchase");
      setInvoiceItems(autoDraft.invoiceItems || []);
      setNote(autoDraft.note || '');
      setAmountPaid(autoDraft.amountPaid || '');
      setInvoicePayments(autoDraft.invoicePayments || []);
      setDiscount(autoDraft.discount || '');
      setSuspendedId(autoDraft.suspendedId || null);
      setMode("existing");
    }
  }, [autoDraft, suppliers, selectedSupplier, prefillTransaction, resumedSuspendedId, fixTransaction, isFixing]);

  // Save Auto-Draft (debounced)
  useEffect(() => {
    if (mode === 'existing' && selectedSupplier && !isFixing) {
      const draftData = {
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        supplierPhone: selectedSupplier.phone,
        transactionType,
        invoiceItems,
        note,
        amountPaid,
        invoicePayments,
        suspendedId,
        discount,
        draftType: 'purchase'
      };
      const timeoutId = setTimeout(() => { saveDraft(draftData, true); }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedSupplier, transactionType, invoiceItems, note, amountPaid, invoicePayments, discount, suspendedId, mode, saveDraft, isFixing]);

  const filteredSuppliers = useMemo(() => {
    if (!Array.isArray(suppliers)) return [];
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(q) || (s.phone && s.phone.includes(q)));
  }, [suppliers, searchQuery]);

  const handleSelectSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setMode("existing");
    setSearchQuery("");
  };

  const handleCreateSupplier = () => {
    if (blockIfReadOnly()) return;
    const name = searchQuery.trim();
    if (name) {
      SupplierService.addSupplier(currentStore.id, name, "").then(id => {
        setSelectedSupplier({ id, name, phone: "", balance: 0 });
        setMode("existing");
        setSearchQuery("");
        showToast("✅ Supplier created!");
        SupplierService.getAll({ fetchAll: true }).then(setSuppliers);
      }).catch(() => showToast("❌ Failed to create supplier."));
    }
  };

  const handleProductsSelected = (selectedProducts) => {
    const now = Date.now();
    if (now - lastActionTime.current < 300) return;
    lastActionTime.current = now;
    setInvoiceItems(prev => {
      const itemMap = new Map();
      prev.forEach(item => {
        const key = `${item.productId || 'custom'}-${item.unitName}`;
        itemMap.set(key, { ...item, quantity: parseFloat(item.quantity) || 0, price: parseFloat(item.price) || 0 });
      });
      selectedProducts.forEach(newItem => {
        const key = `${newItem.productId || 'custom'}-${newItem.unitName}`;
        const incomingQty = parseFloat(newItem.quantity) > 0 ? parseFloat(newItem.quantity) : 1;
        const cleanPrice = parseFloat(newItem.price) || 0;
        if (itemMap.has(key)) {
          const existing = itemMap.get(key);
          existing.quantity = incomingQty;
          existing.total = existing.quantity * existing.price;
        } else {
          itemMap.set(key, {
            productId: newItem.productId, name: newItem.name, brand: newItem.brand || "",
            unitName: newItem.unitName, quantity: incomingQty, price: cleanPrice, total: incomingQty * cleanPrice
          });
        }
      });
      return Array.from(itemMap.values());
    });
    setShowProductPicker(false);
  };

  const handleSaveProduct = async (productData) => {
    const now = Date.now();
    if (now - lastActionTime.current < 300) return;
    lastActionTime.current = now;
    try {
      const newId = await ProductService.create(currentStore.id, productData);
      const updatedProducts = await ProductService.getAll();
      setProducts(updatedProducts);
      const createdProduct = updatedProducts.find(p => p.id === newId);
      if (createdProduct && createdProduct.units && createdProduct.units.length > 0) {
        const unit = createdProduct.units[0];
        setInvoiceItems(prev => {
          const itemMap = new Map();
          prev.forEach(item => {
            const key = `${item.productId || 'custom'}-${item.unitName}`;
            itemMap.set(key, { ...item, quantity: parseFloat(item.quantity) || 0, price: parseFloat(item.price) || 0 });
          });
          const key = `${newId}-${unit.name}`;
          const cleanPrice = parseFloat(unit.defaultPurchasePrice) || 0;
          if (itemMap.has(key)) {
            const existing = itemMap.get(key);
            existing.quantity += 1;
            existing.total = existing.quantity * existing.price;
          } else {
            itemMap.set(key, {
              productId: newId, name: createdProduct.name, brand: createdProduct.brand || "",
              unitName: unit.name, quantity: 1, price: cleanPrice, total: cleanPrice
            });
          }
          return Array.from(itemMap.values());
        });
        showToast("✅ Product template created and added!");
      }
      setNewProductName("");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to create product.");
    }
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

  const totalAmount = useMemo(() => {
    return invoiceItems.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);
  }, [invoiceItems]);

  // 👇 Discount-aware totals
  const discountValue = parseFloat(discount) || 0;
  const netTotal = Math.max(0, totalAmount - discountValue);
  const totalQuantity = invoiceItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const handleSuspendPurchase = async () => {
    if (blockIfReadOnly()) return;
    if (isSuspending || isSaving) return;
    if (!selectedSupplier) { showToast("⚠️ Select a supplier first"); return; }
    if (invoiceItems.length === 0 && !note.trim() && parseFloat(amountPaid) === 0) {
      showToast("⚠️ Add items before suspending"); return;
    }
    setIsSuspending(true);
    try {
      const data = {
        id: suspendedId,
        storeId: currentStore.id,
        type: 'purchase',
        contactId: selectedSupplier.id,
        contactName: selectedSupplier.name,
        contactPhone: selectedSupplier.phone,
        items: invoiceItems,
        amount: netTotal,
        paid: parseFloat(amountPaid) || 0,
        invoicePayments: invoicePayments.length || suspendedId ? invoicePayments : undefined,
        discount: discountValue,
        note: note
      };
      await SuspendedTransactionService.suspendTransaction(data);
      clearAutoDraft('purchase');
      showToast("⏸️ Purchase suspended");
      setView("home");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to suspend purchase");
    } finally {
      setIsSuspending(false);
    }
  };



  const handleSavePurchase = async () => {
    if (blockIfReadOnly()) return;
    if (isSaving || isSuspending) return;
    if (!selectedSupplier) return;
    const finalPaid = parseFloat(amountPaid) || 0;
    const finalTotal = transactionType === "payment" ? 0 : netTotal;
    if (transactionType === "purchase" && discountValue > totalAmount) {
      showToast("⚠️ Discount cannot be more than the total purchase."); return;
    }
    if (finalTotal === 0 && finalPaid === 0 && !note.trim() && invoiceItems.length === 0) {
      showToast("⚠️ Please add items, a payment amount, or a note."); return;
    }
    setIsSaving(true);
    try {
      const extraData = {
        invoicePayments,
        contactName: selectedSupplier.name,
        contactPhone: selectedSupplier.phone,
        discount: discountValue
      };
      if (isFixing && fixingOldId) {
        await TransactionService.correct(fixingOldId, replacementId, {
          amount: finalTotal,
          paid: finalPaid,
          discount: extraData.discount,
          note: note,
          items: invoiceItems,
          invoice_payments: extraData.invoicePayments || [],
        }, fixReason);
        showToast("Correction saved");
      } else {
        await TransactionService.create(currentStore.id, selectedSupplier.id, transactionType === "payment" ? "payment" : "purchase", invoiceItems, finalTotal, finalPaid, note, extraData);
        await SupplierService.updateBalance(selectedSupplier.id);
        clearAutoDraft('purchase');
        if (suspendedId) {
          await SuspendedTransactionService.deleteSuspendedTransaction(suspendedId);
          setSuspendedId(null);
        }
        showToast("✅ Transaction recorded!");
      }
      setLastScrollPosition(window.scrollY);
      setStoreSelectedSupplier(selectedSupplier);
      setView("supplierProfile");
    } catch (error) {
      console.error(error);
      showToast(error.code === "P0001" ? error.message : "Failed to record transaction.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentTotal = transactionType === "payment" ? Number(amountPaid) || 0 : netTotal;
  const difference = currentTotal - originalAmount;
  const balanceChange = transactionType === "payment" ? -difference : difference - ((Number(amountPaid) || 0) - originalPaid);

  return (
    <div className="app-screen min-h-screen bg-gray-50 dark:bg-gray-950">
      <TopBar title={isFixing ? (transactionType === "purchase" ? "Fix Purchase" : "Fix Payment") : (transactionType === "purchase" ? "Record Purchase" : "Make Payment")} showBack={true} onBack={isFixing ? handleAbortFix : () => setView("suppliers")} />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">
        {isFixing && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-3 rounded-r-xl shadow-sm">
            <p className="text-[10px] font-bold text-yellow-800 dark:text-yellow-400 uppercase tracking-wider mb-1">Review correction</p>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Original: {formatCurrency(originalAmount, currency)}</span>
              <span className="font-bold text-gray-900 dark:text-white">Current: {formatCurrency(currentTotal, currency)}</span>
            </div>
            <div className="pt-1 border-t border-yellow-200 dark:border-yellow-800/50 flex justify-between text-sm font-bold">
              <span className="text-gray-700 dark:text-gray-300">Change to account balance</span>
              <span className={balanceChange >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                {balanceChange >= 0 ? "+" : ""}{formatCurrency(balanceChange, currency)}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">Reason: {fixReason}</p>
          </div>
        )}

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
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">{(s.name || "?").charAt(0)}</div>
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

        {mode === "existing" && selectedSupplier && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                {(selectedSupplier.name || "?").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase font-bold">{isFixing ? "Correcting" : (transactionType === "purchase" ? "Buying from" : "Paying to")}</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{selectedSupplier.name || "Unknown Supplier"}</p>
              </div>
              {!isFixing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInvoiceToDiscard({ id: suspendedId, type: "purchase", contactName: selectedSupplier.name })}
                    disabled={isSaving || isSuspending}
                    className="text-xs text-red-600 dark:text-red-400 underline font-semibold px-2 py-1 flex-shrink-0"
                  >
                    Discard Draft
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    onClick={() => {
                      setMode("search");
                      setSelectedSupplier(null);
                      setSuspendedId(null);
                      setAmountPaid("");
                      setInvoicePayments([]);
                      clearAutoDraft('purchase');
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 underline font-semibold px-2 py-1 flex-shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === "existing" && (
          <>
            {transactionType === "purchase" && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Package size={18} className="text-indigo-600" /> Items</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{invoiceItems.length} {invoiceItems.length === 1 ? "line item" : "line items"} · {totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} total qty</p>
                  </div>
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
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-gray-700 dark:text-gray-300">Total Purchase:</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(totalAmount, currency)}</span>
                </div>
              )}
              {/* 👇 Supplier Discount input */}
              {transactionType === "purchase" && (
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1">
                    <Percent size={12} /> Supplier Discount (Optional)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    placeholder="0.00"
                    className={`w-full text-lg font-bold text-purple-700 dark:text-purple-400 outline-none bg-transparent border-b border-gray-200 dark:border-gray-700 pb-2 ${noSpinnerClass}`}
                  />
                  {discountValue > 0 && (
                    <div className="flex justify-between items-center mt-2 text-sm font-bold">
                      <span className="text-gray-600 dark:text-gray-300">Net Total (after discount):</span>
                      <span className="text-green-600 dark:text-green-400">{formatCurrency(netTotal, currency)}</span>
                    </div>
                  )}
                </div>
              )}
              <div>
                {transactionType === "purchase" ? (
                  <InvoicePayments paid={amountPaid} invoicePayments={invoicePayments} total={netTotal} currency={currency} isPurchase onChange={(paid, payments) => {
                    setAmountPaid(paid);
                    setInvoicePayments(payments);
                  }} />
                ) : (
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Payment amount
                    <input type="number" inputMode="decimal" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder="0.00" className={`w-full text-xl font-bold text-green-700 dark:text-green-400 outline-none bg-transparent border-b border-gray-200 dark:border-gray-700 pb-2 ${noSpinnerClass}`} autoFocus />
                  </label>
                )}
                {transactionType === "purchase" && (
                  <p className="mt-2 flex justify-between text-sm font-semibold">
                    <span>Balance remaining</span><span>{formatCurrency(Math.max(0, netTotal - (Number(amountPaid) || 0)), currency)}</span>
                  </p>
                )}
              </div>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)..." className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm resize-none" rows="2" />
              {mode === "existing" && !isFixing && transactionType === "purchase" && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleSuspendPurchase}
                    disabled={isSuspending || isSaving}
                    className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-sm disabled:opacity-60"
                  >
                    {isSuspending ? <><Loader2 className="animate-spin" size={20} /> Suspending...</> : <><Pause size={20} /> Suspend</>}
                  </button>
                  <button
                    onClick={handleSavePurchase}
                    disabled={isSaving || isSuspending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg disabled:opacity-60"
                  >
                    {isSaving ? <><Loader2 className="animate-spin" size={24} /> Saving...</> : <><Check size={24} /> Save Purchase</>}
                  </button>
                </div>
              )}
              {mode === "existing" && !isFixing && transactionType === "payment" && (
                <button
                  onClick={handleSavePurchase}
                  disabled={isSaving || isSuspending}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg disabled:opacity-60"
                >
                  {isSaving ? <><Loader2 className="animate-spin" size={24} /> Saving...</> : <><Check size={24} /> Save Payment</>}
                </button>
              )}
              {mode === "existing" && isFixing && (
                <button
                  onClick={handleSavePurchase}
                  disabled={isSaving || isSuspending}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg disabled:opacity-60"
                >
                  {isSaving ? <><Loader2 className="animate-spin" size={24} /> Saving...</> : <><Check size={24} /> Save Corrected Transaction</>}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <ProductPickerModal isOpen={showProductPicker} onClose={() => setShowProductPicker(false)} products={products} currentStore={currentStore} onProductsSelected={handleProductsSelected} onUnitsUpdated={(id, units) => setProducts(list => list.map(product => product.id === id ? { ...product, units } : product))} priceType="purchase" onRequestCreateProduct={(name) => { setShowProductPicker(false); setNewProductName(name); setShowAddProductModal(true); }} />
      <AddProductModal isOpen={showAddProductModal} onClose={() => setShowAddProductModal(false)} onSave={handleSaveProduct} initialName={newProductName} />

      <DiscardInvoiceModal invoice={invoiceToDiscard} onClose={() => setInvoiceToDiscard(null)} onDiscarded={() => {
        setInvoiceToDiscard(null);
        setView("home");
      }} />
    </div>
  );
};
