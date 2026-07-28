import { useState, useEffect, useMemo, useRef } from "react";
import { Check, MessageSquare, AlertCircle, User, Search, PlusCircle, ArrowLeft, Trash2, X, Package, FileText } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { formatDate, formatCurrency } from "../utils/helpers";
import { CustomerService } from "../services/CustomerService";
import { ProductService } from "../services/ProductService";
import { PageHeader } from "../components/PageHeader";

export const RecordPage = () => {
  const { 
    currentStore, 
    customers, 
    refreshCustomers, 
    showToast, 
    triggerConfetti, 
    setView,
    prefillTransaction,
    setPrefillTransaction
  } = useApp();
  
  // --- Customer Search State ---
  const [mode, setMode] = useState("search"); // "search" | "existing" | "new"
  const [searchQuery, setSearchQuery] = useState("");
  const [tx, setTx] = useState({ customerId: null, name: "", phone: "", items: "", amount: "", paid: "" });
  const [phoneError, setPhoneError] = useState("");

  // --- Recording Mode State ---
  const [recordMode, setRecordMode] = useState("quick"); // "quick" | "detailed"
  
  // --- Detailed Invoice State ---
  const [products, setProducts] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [showInlineProduct, setShowInlineProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", unit: "", category: "" });
  const [priceUpdateModal, setPriceUpdateModal] = useState(null); // { itemIndex, oldPrice, newPrice }

  // Load products for detailed invoice
  useEffect(() => {
    ProductService.getAll(currentStore.id).then(setProducts);
  }, [currentStore.id]);

  // Handle prefill from ProfilePage
  useEffect(() => {
    if (prefillTransaction) {
      setTx(prefillTransaction);
      setPrefillTransaction(null);
      setMode(prefillTransaction.customerId ? "existing" : "new");
    }
  }, [prefillTransaction, setPrefillTransaction]);

  // --- Customer Search Logic ---
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return customers.filter(c => !c.isArchived).slice(0, 5);
    const q = searchQuery.toLowerCase();
    return customers.filter(c => !c.isArchived && (c.name.toLowerCase().includes(q) || c.phone.includes(q)));
  }, [searchQuery, customers]);

  const handleSelectCustomer = (customer) => {
    setTx({ customerId: customer.id, name: customer.name, phone: customer.phone, items: "", amount: "", paid: "" });
    setMode("existing");
    setSearchQuery("");
  };

  const handleCreateInline = () => {
    const isPhone = /^\d+$/.test(searchQuery.replace(/\s/g, ''));
    if (isPhone) setTx(prev => ({ ...prev, phone: searchQuery, customerId: null }));
    else setTx(prev => ({ ...prev, name: searchQuery, customerId: null }));
    setMode("new");
    setSearchQuery("");
  };

  const resetToSearch = () => {
    setTx({ customerId: null, name: "", phone: "", items: "", amount: "", paid: "" });
    setInvoiceItems([]);
    setMode("search");
    setSearchQuery("");
    setProductSearch("");
    setPhoneError("");
  };

  // --- Detailed Invoice Logic ---
  const totalInvoiceAmount = invoiceItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  
  // Sync total to tx.amount for Quick Note compatibility
  useEffect(() => {
    if (recordMode === "detailed") {
      setTx(prev => ({ ...prev, amount: totalInvoiceAmount.toString() }));
    }
  }, [totalInvoiceAmount, recordMode]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.filter(p => p.isFavourite || p.usageCount > 0).slice(0, 5);
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [productSearch, products]);

  const addProductToInvoice = (product, isOneTime = false) => {
    const existingIndex = invoiceItems.findIndex(i => i.productId === product.id && !i.isOneTime);
    if (existingIndex >= 0 && !isOneTime) {
      // Increment quantity if already in invoice
      const updated = [...invoiceItems];
      updated[existingIndex].quantity += 1;
      setInvoiceItems(updated);
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
    updated[index][field] = field === 'name' ? value : parseFloat(value) || 0;
    
    // Check if price changed from default to prompt update
    if (field === 'price' && !updated[index].isOneTime) {
      const oldPrice = updated[index].defaultPrice;
      const newPrice = parseFloat(value) || 0;
      if (oldPrice !== newPrice && newPrice > 0) {
        setPriceUpdateModal({ index, oldPrice, newPrice, productId: updated[index].productId });
      }
    }
    setInvoiceItems(updated);
  };

  const handlePriceUpdate = (shouldUpdate) => {
    if (shouldUpdate && priceUpdateModal) {
      ProductService.update(priceUpdateModal.productId, { price: priceUpdateModal.newPrice });
      // Update local products list
      setProducts(prev => prev.map(p => p.id === priceUpdateModal.productId ? { ...p, price: priceUpdateModal.newPrice } : p));
    }
    setPriceUpdateModal(null);
  };

  const removeItem = (index) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const handleSaveInlineProduct = () => {
    if (!newProduct.name.trim() || !newProduct.price) {
      showToast("Name and Price are required");
      return;
    }
    const productData = {
      name: newProduct.name.trim(),
      price: parseFloat(newProduct.price),
      unit: newProduct.unit.trim(),
      category: newProduct.category.trim(),
      isFavourite: false
    };
    
    // Add to DB and local state
    ProductService.create(currentStore.id, productData).then(newId => {
      const createdProduct = { id: newId, ...productData };
      setProducts([...products, createdProduct]);
      addProductToInvoice(createdProduct);
      setShowInlineProduct(false);
      setNewProduct({ name: "", price: "", unit: "", category: "" });
    });
  };

  // --- Save Transaction ---
  const saveTransaction = async () => {
    const amount = parseFloat(tx.amount) || 0;
    const paid = parseFloat(tx.paid) || 0;
    if (amount === 0 && paid === 0) return;

    setPhoneError("");
    try {
      // For detailed mode, format items string for backward compatibility
      const itemsString = recordMode === "detailed" 
        ? invoiceItems.map(i => `${i.quantity}x ${i.name}`).join(", ") 
        : tx.items;

      await CustomerService.addTransaction(
        currentStore.id,
        tx.customerId,
        tx.name,
        tx.phone,
        amount,
        paid,
        itemsString,
        recordMode === "detailed" ? invoiceItems : null
      );
      await refreshCustomers();
      
      if (amount - paid <= 0 && paid > 0) triggerConfetti();
      
      resetToSearch();
      setView("home");
      showToast("Transaction saved");
    } catch (error) {
      console.error("Failed to save transaction", error);
      if (error.message.includes("already exists")) {
        setPhoneError(error.message);
        showToast(error.message);
      } else {
        showToast("Failed to save transaction");
      }
    }
  };

  const isExistingCustomer = mode === "existing";
  const currentBal = tx.customerId ? (customers.find(c => c.id === tx.customerId)?.balance || 0) : 0;
  const amountVal = parseFloat(tx.amount) || 0;
  const paidVal = parseFloat(tx.paid) || 0;
  const totalDue = currentBal + amountVal;
  const newBal = totalDue - paidVal;
  const isOverpayment = paidVal > totalDue && totalDue > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title="Record Sale" onBack={() => setView("home")} />

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        
        {/* 1. CUSTOMER SELECTION */}
        {mode === "search" && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search customer name or phone..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                autoFocus
              />
            </div>
            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map(c => (
                <button key={c.id} onClick={() => handleSelectCustomer(c)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">{c.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.phone}</p>
                  </div>
                  {c.balance > 0 && <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full flex-shrink-0">{formatCurrency(c.balance)}</span>}
                </button>
              ))}
              {searchQuery.trim() && searchResults.length === 0 && (
                <button onClick={handleCreateInline} className="w-full flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 transition text-left">
                  <PlusCircle size={20} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Create new customer</p>
                    <p className="text-xs opacity-80 truncate">Use "{searchQuery}"</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {isExistingCustomer && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">{tx.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Recording for</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{tx.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{tx.phone}</p>
              </div>
              <button onClick={resetToSearch} className="text-xs text-red-600 dark:text-red-400 underline font-semibold px-2 py-1 flex-shrink-0">Change</button>
            </div>
            {currentBal > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Debt</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(currentBal)}</p>
              </div>
            )}
          </div>
        )}

        {mode === "new" && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2"><User size={16} className="text-gray-400" /><p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">New Customer</p></div>
              <button onClick={resetToSearch} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 hover:text-green-600"><ArrowLeft size={12} /> Back</button>
            </div>
            <input placeholder="Customer Name" value={tx.name} onChange={e => { setTx({...tx, name: e.target.value}); setPhoneError(""); }} className="w-full text-lg font-semibold border-b border-gray-200 dark:border-gray-700 pb-2 outline-none focus:border-green-600 dark:text-white bg-transparent" />
            <div>
              <input placeholder="Phone Number (024...)" value={tx.phone} onChange={e => { setTx({...tx, phone: e.target.value}); setPhoneError(""); }} className={`w-full text-lg border-b pb-2 outline-none focus:border-green-600 bg-transparent ${phoneError ? "text-red-600 border-red-500" : "text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"}`} />
              {phoneError && <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={12} /> {phoneError}</p>}
            </div>
          </div>
        )}

        {/* 2. RECORDING MODE TOGGLE */}
        {(mode === "existing" || mode === "new") && (
          <>
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button onClick={() => setRecordMode("quick")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${recordMode === "quick" ? "bg-white dark:bg-gray-700 shadow-sm text-green-700 dark:text-green-400" : "text-gray-500"}`}>
                <FileText size={16} /> Quick Note
              </button>
              <button onClick={() => setRecordMode("detailed")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${recordMode === "detailed" ? "bg-white dark:bg-gray-700 shadow-sm text-green-700 dark:text-green-400" : "text-gray-500"}`}>
                <Package size={16} /> Detailed Invoice
              </button>
            </div>

            {/* 3. QUICK NOTE FORM */}
            {recordMode === "quick" && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <div>
                  <label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Items Bought</label>
                  <textarea 
                    placeholder="e.g., 2 tins milk, one bag rice" 
                    value={tx.items} onChange={e => setTx({...tx, items: e.target.value})} 
                    className="w-full text-lg mt-1 outline-none dark:text-white bg-transparent border-b border-gray-200 dark:border-gray-700 pb-2" rows="2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Total Amount</label>
                    <input type="number" placeholder="0.00" value={tx.amount} onChange={e => setTx({...tx, amount: e.target.value})} className="w-full text-2xl font-bold text-gray-900 dark:text-white mt-1 outline-none bg-transparent" />
                  </div>
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Money Paid</label>
                    <input type="number" placeholder="0.00" value={tx.paid} onChange={e => setTx({...tx, paid: e.target.value})} className="w-full text-2xl font-bold text-green-700 dark:text-green-400 mt-1 outline-none bg-transparent" />
                  </div>
                </div>
              </div>
            )}

            {/* 4. DETAILED INVOICE FORM */}
            {recordMode === "detailed" && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                {/* Product Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search or add product..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                  />
                </div>
                
                {/* Search Results / Inline Create */}
                {productSearch && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto shadow-lg absolute z-10 w-full max-w-lg mx-auto left-0 right-0">
                    {filteredProducts.length > 0 ? filteredProducts.map(p => (
                      <button key={p.id} onClick={() => addProductToInvoice(p)} className="w-full flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 text-left">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{p.name}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(p.price)} {p.unit && `/ ${p.unit}`}</p>
                        </div>
                        <PlusCircle size={18} className="text-green-600" />
                      </button>
                    )) : (
                      <button onClick={() => { setNewProduct({...newProduct, name: productSearch}); setShowInlineProduct(true); }} className="w-full p-3 text-green-700 dark:text-green-400 font-semibold flex items-center gap-2">
                        <PlusCircle size={18} /> Create "{productSearch}"
                      </button>
                    )}
                  </div>
                )}

                {/* Invoice Items List */}
                <div className="space-y-2">
                  {invoiceItems.length === 0 ? (
                    <p className="text-center text-gray-400 dark:text-gray-500 py-4 text-sm">No items added yet. Search above to add products.</p>
                  ) : invoiceItems.map((item, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl flex items-center gap-2 border border-gray-100 dark:border-gray-700">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{item.name} {item.isOneTime && <span className="text-xs text-blue-500 font-normal">(One-time)</span>}</p>
                        <div className="flex gap-2 mt-1 items-center">
                          <input type="number" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} className="w-14 px-2 py-1 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-sm font-bold text-center" />
                          <span className="text-xs text-gray-500">x</span>
                          <input type="number" value={item.price} onChange={e => updateItem(index, 'price', e.target.value)} className="w-20 px-2 py-1 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-sm font-bold" />
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.quantity * item.price)}</p>
                        <button onClick={() => removeItem(index)} className="text-red-500 text-xs mt-1 flex items-center gap-1"><Trash2 size={12} /> Remove</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total & Paid */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400 font-semibold">Total Amount:</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalInvoiceAmount)}</span>
                  </div>
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Money Paid</label>
                    <input type="number" placeholder="0.00" value={tx.paid} onChange={e => setTx({...tx, paid: e.target.value})} className="w-full text-2xl font-bold text-green-700 dark:text-green-400 mt-1 outline-none bg-transparent border-b border-gray-200 dark:border-gray-700 pb-2" />
                  </div>
                </div>
              </div>
            )}

            {/* 5. OVERPAYMENT WARNING */}
            {isOverpayment && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Overpayment Detected</p>
                  <p className="text-sm mt-1">This creates a <span className="font-bold">credit of {formatCurrency(Math.abs(newBal))}</span>.</p>
                </div>
              </div>
            )}

            {/* 6. SMS PREVIEW */}
            {(amountVal > 0 || paidVal > 0) && (
              <div className="bg-gray-900 text-gray-100 p-5 rounded-2xl shadow-xl relative">
                <div className="absolute top-3 right-3 bg-green-600 text-white text-xs px-2 py-1 rounded-lg font-bold flex items-center gap-1"><MessageSquare size={12} /> SMS Preview</div>
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Message to {tx.name || "Customer"}:</p>
                <div className="font-mono text-sm leading-relaxed whitespace-pre-line">
                  {`Balance update (${formatDate(new Date())}):\n`}
                  {`Old debt: ${formatCurrency(currentBal)}\n`}
                  {amountVal > 0 && `Items bought: ${formatCurrency(amountVal)}\n`}
                  {tx.items && amountVal > 0 && `What was bought: ${tx.items}\n`}
                  {paidVal > 0 && `Money paid: ${formatCurrency(paidVal)}\n`}
                  {newBal < 0 ? `Total debt now: ${formatCurrency(0)}\n(You have a credit of ${formatCurrency(Math.abs(newBal))})` : `Total debt now: ${formatCurrency(newBal)}`}
                  {`\nThank you! - From ${currentStore?.name || "Store"}`}
                </div>
              </div>
            )}

            {/* 7. SAVE BUTTON */}
            <button onClick={saveTransaction} disabled={!tx.amount && !tx.paid} className="w-full bg-green-700 text-white font-bold text-xl py-4 rounded-2xl shadow-lg disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center gap-2">
              <Check size={24} /> Save Transaction
            </button>
          </>
        )}
      </div>

      {/* --- MODALS --- */}
      
      {/* Inline Product Creation Modal */}
      {showInlineProduct && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">Create Product</h3>
              <button onClick={() => setShowInlineProduct(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" autoFocus />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Default Price" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" />
                <input placeholder="Unit (e.g. kg)" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" />
              </div>
              <input placeholder="Category (Optional)" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" />
              <button onClick={handleSaveInlineProduct} className="w-full bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"><Check size={20} /> Save & Add to Invoice</button>
            </div>
          </div>
        </div>
      )}

      {/* Price Update Prompt Modal */}
      {priceUpdateModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6 text-center">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Update Default Price?</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              You changed the price from <span className="font-bold">{formatCurrency(priceUpdateModal.oldPrice)}</span> to <span className="font-bold text-green-600">{formatCurrency(priceUpdateModal.newPrice)}</span>. 
              Do you want to update the default price for this product in your catalogue?
            </p>
            <div className="flex gap-3">
              <button onClick={() => handlePriceUpdate(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">No, Just for this invoice</button>
              <button onClick={() => handlePriceUpdate(true)} className="flex-1 bg-green-700 text-white font-bold py-3 rounded-xl">Yes, Update Default</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};