import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Users, Check, RotateCcw } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { CustomerService } from "../services/CustomerService";
import { ProductService } from "../services/ProductService";
import { TransactionService } from "../services/TransactionService";
import { DetailedInvoice } from "../components/DetailedInvoice";
import { TopBar } from "../components/TopBar";
import { db } from "../database/db";

export const RecordSalePage = () => {
  const { 
    currentStore, setView, prefillTransaction, setPrefillTransaction, showToast, 
    autoDraft, saveDraft, clearAutoDraft,
    fixTransaction, setFixTransaction, lastScrollPosition, setLastScrollPosition
  } = useStore();
  const currency = currentStore?.currency || "GH₵";

  const [mode, setMode] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [tx, setTx] = useState({ amount: "0", paid: "", discount: "", note: "" });
  
  const [isFixing, setIsFixing] = useState(false);
  const [fixingOldId, setFixingOldId] = useState(null);
  const [originalAmount, setOriginalAmount] = useState(0);
  const [fixReason, setFixReason] = useState("");

  const [undoData, setUndoData] = useState(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  useEffect(() => {
    if (currentStore?.id) {
      CustomerService.getAll(currentStore.id).then(res => setCustomers(Array.isArray(res) ? res : [])).catch(() => setCustomers([]));
      ProductService.getAll(currentStore.id).then(res => setProducts(Array.isArray(res) ? res : [])).catch(() => setProducts([]));
    }
  }, [currentStore?.id]);

  useEffect(() => {
    if (prefillTransaction && prefillTransaction.customerId) {
      const customer = (Array.isArray(customers) ? customers : []).find(c => c.id === prefillTransaction.customerId) || {
        id: prefillTransaction.customerId, name: prefillTransaction.name || "Unknown Customer", phone: prefillTransaction.phone || ""
      };
      setSelectedCustomer(customer); setMode("existing");
      if (prefillTransaction.paid !== undefined) setTx(prev => ({ ...prev, paid: prefillTransaction.paid.toString() }));
      setPrefillTransaction(null); clearAutoDraft();
    }
  }, [prefillTransaction, customers, setPrefillTransaction, clearAutoDraft]);

  useEffect(() => {
    if (fixTransaction && fixTransaction.id) {
      const customer = (Array.isArray(customers) ? customers : []).find(c => c.id === fixTransaction.contactId) || {
        id: fixTransaction.contactId, name: fixTransaction.contactName || "Unknown Customer", phone: fixTransaction.contactPhone || ""
      };
      setSelectedCustomer(customer);
      setInvoiceItems(fixTransaction.items || []);
      setTx({ amount: fixTransaction.amount?.toString() || "0", paid: fixTransaction.paid?.toString() || "", discount: fixTransaction.discount?.toString() || "", note: fixTransaction.note || "" });
      setOriginalAmount(parseFloat(fixTransaction.amount) || 0);
      setFixReason(fixTransaction.fixReason || "");
      
      setMode("existing"); setIsFixing(true); setFixingOldId(fixTransaction.id);
      TransactionService.update(fixTransaction.id, { status: 'being_corrected' });
      setFixTransaction(null);
    }
  }, [fixTransaction, customers, setFixTransaction]);

  const handleAbortFix = async () => {
    if (fixingOldId) {
      await TransactionService.update(fixingOldId, { status: 'active' });
    }
    setIsFixing(false); setFixingOldId(null); setFixReason("");
    setMode("search"); setSelectedCustomer(null); setInvoiceItems([]);
    setTx({ amount: "0", paid: "", discount: "", note: "" });
    clearAutoDraft();
  };

  useEffect(() => {
    if (autoDraft && autoDraft.draftType === 'sale' && customers.length > 0 && !selectedCustomer && !prefillTransaction && !isFixing) {
      const draftCustomer = customers.find(c => c.id === autoDraft.customerId) || { id: autoDraft.customerId, name: autoDraft.customerName || 'Unknown Customer', phone: autoDraft.customerPhone || '' };
      setSelectedCustomer(draftCustomer);
      setInvoiceItems(autoDraft.invoiceItems || []);
      setTx({ amount: autoDraft.amount || "0", paid: autoDraft.paid || "", discount: autoDraft.discount || "", note: autoDraft.note || "" });
      setMode("existing");
    }
  }, [autoDraft, customers, selectedCustomer, prefillTransaction, isFixing]);

  useEffect(() => {
    if (mode === 'existing' && selectedCustomer && !isFixing) {
      const draftData = { customerId: selectedCustomer.id, customerName: selectedCustomer.name, customerPhone: selectedCustomer.phone, invoiceItems, amount: tx.amount, paid: tx.paid, discount: tx.discount, note: tx.note, draftType: 'sale' };
      const timeoutId = setTimeout(() => { saveDraft(draftData, true); }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedCustomer, invoiceItems, tx, mode, saveDraft, isFixing]);

  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
  }, [customers, searchQuery]);

  const handleSelectCustomer = (customer) => { setSelectedCustomer(customer); setMode("existing"); setSearchQuery(""); };
  
  const handleCreateCustomer = () => {
    const name = searchQuery.trim();
    if (name) {
      CustomerService.addCustomer(currentStore.id, name, "").then(id => {
        const newCustomer = { id, name, phone: "", balance: 0 };
        setSelectedCustomer(newCustomer); setMode("existing"); setSearchQuery("");
        showToast("✅ Customer created!");
        CustomerService.getAll(currentStore.id).then(setCustomers);
      }).catch(() => showToast(" Failed to create customer."));
    }
  };

  const handleUndoFix = async () => {
    if (!undoData) return;
    try {
      await db.transactions.delete(undoData.newId);
      await TransactionService.update(undoData.oldId, { status: 'active', cancelReason: null, replacedByTransactionId: null });
      await CustomerService.updateBalance(undoData.customerId);
      setShowUndoToast(false); setUndoData(null);
      showToast("✅ Correction undone.");
      setView("customers");
    } catch (error) { console.error(error); showToast("❌ Failed to undo."); }
  };

  const handleSaveInvoice = async () => {
    if (!selectedCustomer) return;
    const finalAmount = parseFloat(tx.amount) || 0;
    const finalPaid = parseFloat(tx.paid) || 0;

    if (finalAmount === 0 && finalPaid === 0 && !tx.note.trim() && invoiceItems.length === 0) {
      showToast("⚠️ Please add items, a payment amount, or a note."); return;
    }

    try {
      const extraData = { 
        contactName: selectedCustomer.name, 
        contactPhone: selectedCustomer.phone 
      };

      if (isFixing && fixingOldId) {
        extraData.correctsTransactionId = fixingOldId;
        extraData.fixReason = fixReason;
        
        const newId = await TransactionService.create(currentStore.id, selectedCustomer.id, 'sale', invoiceItems, finalAmount, finalPaid, tx.note, extraData);
        
        await TransactionService.update(fixingOldId, { 
          replacedByTransactionId: newId,
          status: 'cancelled',
          cancelReason: `Replaced by Sale ${newId}`
        });
        await CustomerService.updateBalance(selectedCustomer.id);
        
        setUndoData({ newId, oldId: fixingOldId, customerId: selectedCustomer.id });
        setShowUndoToast(true);
        setTimeout(() => { setShowUndoToast(false); setUndoData(null); }, 10000);
        
        setIsFixing(false); setFixingOldId(null); setFixReason("");
      } else {
        await TransactionService.create(currentStore.id, selectedCustomer.id, 'sale', invoiceItems, finalAmount, finalPaid, tx.note, extraData);
        await clearAutoDraft();
        showToast("✅ Sale recorded!");
      }
      setLastScrollPosition(window.scrollY);
      setView("customers");
    } catch (error) { console.error(error); showToast("❌ Failed to record sale."); }
  };

  const currentTotal = parseFloat(tx.amount) || 0;
  const difference = currentTotal - originalAmount;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title={isFixing ? "Fix Sale" : "Record Sale"} showBack={true} onBack={isFixing ? handleAbortFix : () => setView("customers")} />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">
        
        {isFixing && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-3 rounded-r-xl shadow-sm">
            <p className="text-[10px] font-bold text-yellow-800 dark:text-yellow-400 uppercase tracking-wider mb-1">Editing Previous Sale</p>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Original: {formatCurrency(originalAmount, currency)}</span>
              <span className="font-bold text-gray-900 dark:text-white">Current: {formatCurrency(currentTotal, currency)}</span>
            </div>
            <div className="pt-1 border-t border-yellow-200 dark:border-yellow-800/50 flex justify-between text-sm font-bold">
              <span className="text-gray-700 dark:text-gray-300">Difference:</span>
              <span className={difference >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                {difference >= 0 ? "+" : ""}{formatCurrency(difference, currency)}
              </span>
            </div>
            {fixReason && (
              <div className="mt-2 pt-2 border-t border-yellow-200 dark:border-yellow-800/50">
                <p className="text-[10px] font-bold text-yellow-800 dark:text-yellow-400 uppercase">Reason for Fix:</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 italic mt-0.5">{fixReason}</p>
              </div>
            )}
          </div>
        )}

        {mode === "search" && (
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Users size={16} className="text-green-600" /> Select Customer</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search customers..." className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" autoFocus />
            </div>
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {Array.isArray(filteredCustomers) && filteredCustomers.map(c => (
                <button key={c.id} onClick={() => handleSelectCustomer(c)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">{c.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</p><p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.phone || "No phone"}</p></div>
                  {c.balance > 0 && <p className="text-xs font-bold text-orange-600 dark:text-orange-400">Owes: {formatCurrency(c.balance, currency)}</p>}
                </button>
              ))}
              {searchQuery.trim() && filteredCustomers.length === 0 && (
                <button onClick={handleCreateCustomer} className="w-full flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 transition text-left">
                  <Plus size={20} className="flex-shrink-0" /><div className="flex-1 min-w-0"><p className="font-semibold text-sm">Create new customer</p><p className="text-xs opacity-80 truncate">Use "{searchQuery}"</p></div>
                </button>
              )}
            </div>
          </div>
        )}
        {mode === "existing" && selectedCustomer && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-green-100 dark:border-green-900/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">{selectedCustomer.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-600 dark:text-green-400 uppercase font-bold">{isFixing ? "Correcting sale for" : "Selling to"}</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{selectedCustomer.name}</p>
              </div>
              {!isFixing && (
                <button onClick={() => { setMode("search"); setSelectedCustomer(null); setInvoiceItems([]); setTx({ amount: "0", paid: "", discount: "", note: "" }); clearAutoDraft(); }} className="text-xs text-red-600 dark:text-red-400 underline font-semibold px-2 py-1 flex-shrink-0">Change</button>
              )}
            </div>
          </div>
        )}
        {mode === "existing" && (
          <DetailedInvoice tx={tx} setTx={setTx} invoiceItems={invoiceItems} setInvoiceItems={setInvoiceItems} products={products} setProducts={setProducts} currentStore={currentStore} showToast={showToast} />
        )}
        
        {/* 👇 NOTE FIELD - ADDED FOR CONSISTENCY WITH SUPPLIER SIDE */}
        {mode === "existing" && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Add a note (optional)</label>
            <textarea 
              value={tx.note} 
              onChange={e => setTx({...tx, note: e.target.value})} 
              placeholder="Add a note (optional)..." 
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm resize-none" 
              rows="2" 
            />
          </div>
        )}

        {mode === "existing" && (
          <button onClick={handleSaveInvoice} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg">
            <Check size={24} /> {isFixing ? "Save Corrected Sale" : "Save Sale"}
          </button>
        )}
      </div>

      {showUndoToast && (
        <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-4 rounded-xl shadow-2xl flex items-center justify-between z-[200] animate-in slide-in-from-bottom-5">
          <div>
            <p className="font-bold text-sm">Sale corrected successfully!</p>
            <p className="text-xs opacity-80">Tap undo to revert changes.</p>
          </div>
          <button onClick={handleUndoFix} className="flex items-center gap-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 rounded-lg font-bold text-sm active:scale-95 transition">
            <RotateCcw size={14} /> Undo
          </button>
        </div>
      )}
    </div>
  );
};