import { useState, useEffect, useMemo } from "react";
import { Check, MessageSquare, AlertCircle, User, Search, PlusCircle, ArrowLeft, FileText, Copy, Contact, Save, Edit3, Package } from "lucide-react";
import useStore from "../store/useStore";
import { formatDate, formatCurrency, isValidPhone } from "../utils/helpers";
import { openSMS } from "../utils/communication";
import { CustomerService } from "../services/CustomerService";
import { ProductService } from "../services/ProductService";
import { PageHeader } from "../components/PageHeader";
import { EditCustomerModal } from "../components/EditCustomerModal";
import { DraftsCard } from "../components/DraftsCard";
import { DetailedInvoice } from "../components/DetailedInvoice";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const RecordPage = () => {
  const { currentStore, customers, refreshCustomers, showToast, triggerConfetti, setView, prefillTransaction, setPrefillTransaction, saveDraft, deleteDraft, drafts } = useStore();
  
  // Core State
  const [mode, setMode] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [tx, setTx] = useState({ customerId: null, name: "", phone: "", items: "", amount: "", paid: "" });
  const [phoneError, setPhoneError] = useState("");
  const [recordMode, setRecordMode] = useState("quick");
    const [sendSmsOnSave, setSendSmsOnSave] = useState(false);
  
  // Data State
  const [products, setProducts] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  
  // UI State
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);

  useEffect(() => { if (currentStore?.id) ProductService.getAll(currentStore.id).then(setProducts); }, [currentStore?.id]);

  useEffect(() => {
    if (prefillTransaction) {
      setTx({
        customerId: prefillTransaction.customerId || null, name: prefillTransaction.name || "", phone: prefillTransaction.phone || "",
        items: prefillTransaction.items || "", amount: prefillTransaction.amount ? prefillTransaction.amount.toString() : "", paid: prefillTransaction.paid ? prefillTransaction.paid.toString() : ""
      });
      if (prefillTransaction.invoiceItems?.length > 0) { setRecordMode("detailed"); setInvoiceItems(prefillTransaction.invoiceItems); } 
      else { setRecordMode("quick"); }

      if (prefillTransaction.customerId) setMode("existing");
      else if (prefillTransaction.name || prefillTransaction.phone) setMode("new");
      else setMode("search");
      
      if (prefillTransaction.isDraft) setEditingDraftId(prefillTransaction.id);
      setPrefillTransaction(null);
    }
  }, [prefillTransaction, setPrefillTransaction]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return customers.filter(c => !c.isArchived).slice(0, 5);
    const q = searchQuery.toLowerCase();
    return customers.filter(c => !c.isArchived && (c.name.toLowerCase().includes(q) || c.phone.includes(q)));
  }, [searchQuery, customers]);

  const handleSelectCustomer = (customer) => { setTx({ customerId: customer.id, name: customer.name, phone: customer.phone, items: "", amount: "", paid: "" }); setMode("existing"); setSearchQuery(""); };
  const handleCreateInline = () => {
    const isPhone = /^\d+$/.test(searchQuery.replace(/\s/g, ''));
    if (isPhone) setTx(prev => ({ ...prev, phone: searchQuery, customerId: null }));
    else setTx(prev => ({ ...prev, name: searchQuery, customerId: null }));
    setMode("new"); setSearchQuery("");
  };

  const resetToSearch = () => {
    setTx({ customerId: null, name: "", phone: "", items: "", amount: "", paid: "" });
    setInvoiceItems([]); setMode("search"); setSearchQuery(""); setPhoneError(""); setEditingDraftId(null);
  };

  const handleResumeDraft = (draft) => {
    setPrefillTransaction({ ...draft, isDraft: true, customerId: draft.customerId, name: draft.name, phone: draft.phone, items: draft.items, amount: draft.amount, paid: draft.paid, invoiceItems: draft.invoiceItems });
  };

  const handlePickContact = async () => {
    if (!('contacts' in navigator)) { showToast("Contact picker not supported."); return; }
    try {
      const [contact] = await navigator.contacts.select(['tel'], { multiple: false });
      if (contact?.tel?.[0]) {
        let phoneNum = contact.tel[0]; if (phoneNum.startsWith('tel:')) phoneNum = phoneNum.substring(4);
        setTx(prev => ({ ...prev, phone: phoneNum })); setPhoneError(""); showToast("Contact selected!");
      }
    } catch (err) { console.log("Cancelled"); }
  };

  const handleCopySMS = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(smsMessage); 
      else {
        const textArea = document.createElement("textarea"); textArea.value = smsMessage;
        textArea.style.position = "fixed"; textArea.style.left = "-999999px"; document.body.appendChild(textArea);
        textArea.focus(); textArea.select(); document.execCommand('copy'); textArea.remove();
      }
      showToast("Message copied!");
    } catch (err) { showToast("Failed to copy."); }
  };

  const handleSaveDraft = async () => {
    if (!tx.name && !tx.phone && invoiceItems.length === 0) { showToast("Add a customer or items to save a draft."); return; }
    try {
      await saveDraft({ id: editingDraftId, customerId: tx.customerId, name: tx.name, phone: tx.phone, items: tx.items, amount: tx.amount, paid: tx.paid, recordMode, invoiceItems: recordMode === "detailed" ? invoiceItems : null });
      showToast("Draft saved successfully!"); resetToSearch(); setView("home");
    } catch (error) { showToast("Failed to save draft."); }
  };

  const saveTransaction = async () => {
    const amount = parseFloat(tx.amount) || 0; 
    const paid = parseFloat(tx.paid) || 0;
    
    if (amount === 0 && paid === 0) return;
    if (!currentStore?.id) { showToast("Database not ready."); return; }
    
    if (!tx.customerId && !isValidPhone(tx.phone)) { 
      setPhoneError("Please enter a valid phone number."); 
      showToast("⚠️ Invalid phone number"); 
      return; 
    }
    
    setPhoneError("");
    try {
      const itemsString = recordMode === "detailed" ? invoiceItems.map(i => `${i.quantity}x ${i.name}`).join(", ") : tx.items;
      
      // 1. Save to database FIRST
      await CustomerService.addTransaction(
        currentStore.id, tx.customerId, tx.name, tx.phone, amount, paid, itemsString, 
        recordMode === "detailed" ? invoiceItems : null
      );
      
      if (editingDraftId) await deleteDraft(editingDraftId);
      await refreshCustomers();
      
      if (amount - paid <= 0 && paid > 0) triggerConfetti();
      
      // 2. ONLY open SMS app if the toggle is ON and we have a message/phone
      if (sendSmsOnSave && tx.phone && smsMessage) {
        openSMS(tx.phone, smsMessage);
      }

      resetToSearch(); 
      setView("home"); 
      showToast(sendSmsOnSave ? "Saved & SMS ready!" : "Transaction saved");
    } catch (error) {
      const realError = error.message || error.toString();
      if (realError.includes("already exists")) { 
        setPhoneError(realError); 
        showToast(realError); 
      } else {
        showToast(`Error: ${realError.substring(0, 60)}`);
      }
    }
  };

  const isExistingCustomer = mode === "existing";
  const currentBal = tx.customerId ? (customers.find(c => c.id === tx.customerId)?.balance || 0) : 0;
  const amountVal = parseFloat(tx.amount) || 0; const paidVal = parseFloat(tx.paid) || 0;
  const totalDue = currentBal + amountVal; const newBal = totalDue - paidVal;
  const isOverpayment = paidVal > totalDue && totalDue > 0;

  const smsMessage = useMemo(() => {
    if (amountVal === 0 && paidVal === 0) return "";
    return `Balance update (${formatDate(new Date())}):\nOld debt: ${formatCurrency(currentBal)}\n` +
      (amountVal > 0 ? `Items bought: ${formatCurrency(amountVal)}\n` : '') + (tx.items && amountVal > 0 ? `What was bought: ${tx.items}\n` : '') +
      (paidVal > 0 ? `Money paid: ${formatCurrency(paidVal)}\n` : '') +
      (newBal < 0 ? `Total debt now: ${formatCurrency(0)}\n(You have a credit of ${formatCurrency(Math.abs(newBal))})` : `Total debt now: ${formatCurrency(newBal)}`) +
      `\nThank you! - From ${currentStore?.name || "Store"}`;
  }, [currentBal, amountVal, paidVal, tx.items, newBal, currentStore]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title={editingDraftId ? "Edit Draft" : "Record Sale"} onBack={() => setView("home")} />

      {editingDraftId && (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border-b border-yellow-300 dark:border-yellow-800 px-4 py-2 flex justify-between items-center">
          <p className="text-xs font-bold text-yellow-800 dark:text-yellow-300">Editing Draft</p>
          <button onClick={() => { deleteDraft(editingDraftId); resetToSearch(); }} className="text-xs text-red-600 dark:text-red-400 font-bold underline">Discard Draft</button>
        </div>
      )}

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        
        {/* 1. Drafts Card (Extracted) */}
        {mode === "search" && !editingDraftId && (
          <DraftsCard drafts={drafts} onResume={handleResumeDraft} />
        )}

        {/* 2. Customer Search */}
        {mode === "search" && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search customer name or phone..." className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" autoFocus />
            </div>
            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map(c => (
                <button key={c.id} onClick={() => handleSelectCustomer(c)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">{c.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</p><p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.phone}</p></div>
                  {c.balance > 0 && <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full flex-shrink-0">{formatCurrency(c.balance)}</span>}
                </button>
              ))}
              {searchQuery.trim() && searchResults.length === 0 && (
                <button onClick={handleCreateInline} className="w-full flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 transition text-left">
                  <PlusCircle size={20} className="flex-shrink-0" /><div className="flex-1 min-w-0"><p className="font-semibold text-sm">Create new customer</p><p className="text-xs opacity-80 truncate">Use "{searchQuery}"</p></div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3. Existing Customer Display */}
        {isExistingCustomer && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">{tx.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Recording for</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{tx.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{tx.phone || "No phone number"}</p>
              </div>
              <button onClick={() => setIsEditingCustomer(true)} className="text-blue-600 dark:text-blue-400 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition active:scale-90 flex-shrink-0"><Edit3 size={18} /></button>
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

        {/* 4. New Customer Inputs */}
        {mode === "new" && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2"><User size={16} className="text-gray-400" /><p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">{editingDraftId ? "Customer Info" : "New Customer"}</p></div>
              <button onClick={resetToSearch} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 hover:text-green-600"><ArrowLeft size={12} /> Back</button>
            </div>
            <input placeholder="Customer Name" value={tx.name} onChange={e => { setTx({...tx, name: e.target.value}); setPhoneError(""); }} className="w-full text-lg font-semibold border-b border-gray-200 dark:border-gray-700 pb-2 outline-none focus:border-green-600 dark:text-white bg-transparent" />
            <div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input type="tel" inputMode="tel" placeholder="e.g., 024 123 4567" value={tx.phone} onChange={e => { setTx({...tx, phone: e.target.value}); setPhoneError(""); }} className={`w-full text-lg border-b pb-2 outline-none focus:border-green-600 bg-transparent ${phoneError ? "text-red-600 border-red-500" : "text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"}`} />
                </div>
                <button type="button" onClick={handlePickContact} className="flex-shrink-0 p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition active:scale-90 mb-1"><Contact size={22} /></button>
              </div>
              {phoneError && <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={12} /> {phoneError}</p>}
            </div>
          </div>
        )}

        {/* 5. Recording Modes (Quick vs Detailed) */}
        {(mode === "existing" || mode === "new") && (
          <>
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button onClick={() => setRecordMode("quick")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${recordMode === "quick" ? "bg-white dark:bg-gray-700 shadow-sm text-green-700 dark:text-green-400" : "text-gray-500"}`}><FileText size={16} /> Quick Note</button>
              <button onClick={() => setRecordMode("detailed")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${recordMode === "detailed" ? "bg-white dark:bg-gray-700 shadow-sm text-green-700 dark:text-green-400" : "text-gray-500"}`}><Package size={16} /> Detailed Invoice</button>
            </div>

            {recordMode === "quick" && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <div><label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Items Bought</label><textarea placeholder="e.g., 2 tins milk, one bag rice" value={tx.items} onChange={e => setTx({...tx, items: e.target.value})} className="w-full text-lg mt-1 outline-none dark:text-white bg-transparent border-b border-gray-200 dark:border-gray-700 pb-2" rows="2" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Total Amount</label><input type="number" inputMode="decimal" placeholder="0.00" value={tx.amount} onChange={e => setTx({...tx, amount: e.target.value})} className={`w-full text-2xl font-bold text-gray-900 dark:text-white mt-1 outline-none bg-transparent ${noSpinnerClass}`} /></div>
                  <div><label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Money Paid</label><input type="number" inputMode="decimal" placeholder="0.00" value={tx.paid} onChange={e => setTx({...tx, paid: e.target.value})} className={`w-full text-2xl font-bold text-green-700 dark:text-green-400 mt-1 outline-none bg-transparent ${noSpinnerClass}`} /></div>
                </div>
              </div>
            )}

            {/* Detailed Invoice (Extracted Component) */}
            {recordMode === "detailed" && (
              <DetailedInvoice 
                tx={tx} setTx={setTx} 
                invoiceItems={invoiceItems} setInvoiceItems={setInvoiceItems} 
                products={products} setProducts={setProducts} 
                currentStore={currentStore} showToast={showToast} 
              />
            )}

            {isOverpayment && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Overpayment Detected</p>
                  <p className="text-sm mt-1">Credit of {formatCurrency(Math.abs(newBal))}.</p>
                </div>
              </div>
            )}

            {/* Compact SMS Preview Box */}
            {smsMessage && (
              <div className="bg-gray-900 text-gray-100 p-4 rounded-2xl shadow-xl relative">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">SMS Preview</p>
                  {/* Compact Copy Button */}
                  <button 
                    onClick={handleCopySMS}
                    className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white px-2.5 py-1.5 rounded-lg transition active:scale-95"
                  >
                    <Copy size={14} /> Copy
                  </button>
                </div>
                
                <div className="font-mono text-sm leading-relaxed whitespace-pre-line mb-3 bg-black/30 p-3 rounded-lg border border-gray-700 max-h-32 overflow-y-auto">
                  {smsMessage}
                </div>
                
                {/* Elegant Toggle Switch */}
                <label className="flex items-center gap-3 p-2.5 bg-gray-800 rounded-xl cursor-pointer active:scale-[0.98] transition border border-gray-700">
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={sendSmsOnSave} 
                      onChange={(e) => setSendSmsOnSave(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-200">Send SMS after saving</span>
                </label>
              </div>
            )}

            {/* Clean Action Buttons */}
            <div className="space-y-3 pt-2">
              {/* 1. Save as Draft */}
              <button 
                onClick={handleSaveDraft} 
                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-lg py-3.5 rounded-2xl shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Save size={20} /> Save as Draft
              </button>

              {/* 2. Primary Save (Respects the SMS Toggle) */}
              <button 
                onClick={saveTransaction} 
                disabled={!tx.amount && !tx.paid} 
                className="w-full bg-green-700 hover:bg-green-800 text-white font-bold text-xl py-4 rounded-2xl shadow-lg disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Check size={24} /> 
                {editingDraftId ? "Finalize Transaction" : "Save Transaction"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Edit Customer Modal */}
      {isEditingCustomer && tx.customerId && (
        <EditCustomerModal 
          customer={customers.find(c => c.id === tx.customerId)} 
          onClose={() => {
            setIsEditingCustomer(false);
            const updated = customers.find(c => c.id === tx.customerId);
            if(updated) setTx(prev => ({ ...prev, name: updated.name, phone: updated.phone }));
          }} 
        />
      )}
    </div>
  );
};