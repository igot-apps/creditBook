import { useState, useEffect, useMemo } from "react";
import { Check, AlertCircle, User, Search, PlusCircle, ArrowLeft, FileText, Copy, Contact, Save, Edit3, MessageSquare, Send, XCircle, Package, Lock } from "lucide-react";
import useStore from "../store/useStore";
import { formatDate, formatCurrency, isValidPhone } from "../utils/helpers";
import { openSMS, openWhatsApp } from "../utils/communication";
import { CustomerService } from "../services/CustomerService";
import { ProductService } from "../services/ProductService";
import { PageHeader } from "../components/PageHeader";
import { EditCustomerModal } from "../components/EditCustomerModal";
import { DraftsCard } from "../components/DraftsCard";
import { DetailedInvoice } from "../components/DetailedInvoice";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const RecordPage = () => {
  const { currentStore, customers, refreshCustomers, showToast, triggerConfetti, setView, prefillTransaction, setPrefillTransaction, saveDraft, deleteDraft, drafts } = useStore();
  
  // 👇 1. Get dynamic currency from store, default to GH₵
  const currency = currentStore?.currency || "GH₵";

  const [mode, setMode] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [tx, setTx] = useState({ customerId: null, name: "", phone: "", items: "", amount: "", paid: "", customerNote: "", internalNote: "" });
  const [phoneError, setPhoneError] = useState("");
  const [recordMode, setRecordMode] = useState("quick");
  const [sendMethod, setSendMethod] = useState("none");

  const [products, setProducts] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);

  useEffect(() => { if (currentStore?.id) ProductService.getAll(currentStore.id).then(setProducts); }, [currentStore?.id]);

  useEffect(() => {
    if (prefillTransaction) {
      setTx({
        customerId: prefillTransaction.customerId || null, name: prefillTransaction.name || "", phone: prefillTransaction.phone || "",
        items: prefillTransaction.items || "", amount: prefillTransaction.amount ? prefillTransaction.amount.toString() : "", paid: prefillTransaction.paid ? prefillTransaction.paid.toString() : "",
        customerNote: prefillTransaction.customerNote || "", internalNote: prefillTransaction.internalNote || ""
      });
      if (prefillTransaction.invoiceItems?.length > 0) { setRecordMode("detailed"); setInvoiceItems(prefillTransaction.invoiceItems); } else { setRecordMode("quick"); }
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

  const handleSelectCustomer = (customer) => { setTx({ customerId: customer.id, name: customer.name, phone: customer.phone, items: "", amount: "", paid: "", customerNote: "", internalNote: "" }); setMode("existing"); setSearchQuery(""); };
  const handleCreateInline = () => {
    const isPhone = /^\d+$/.test(searchQuery.replace(/\s/g, ''));
    if (isPhone) setTx(prev => ({ ...prev, phone: searchQuery, customerId: null }));
    else setTx(prev => ({ ...prev, name: searchQuery, customerId: null }));
    setMode("new"); setSearchQuery("");
  };
  const resetToSearch = () => {
    setTx({ customerId: null, name: "", phone: "", items: "", amount: "", paid: "", customerNote: "", internalNote: "" });
    setInvoiceItems([]); setMode("search"); setSearchQuery(""); setPhoneError(""); setEditingDraftId(null);
  };
  const handleResumeDraft = (draft) => {
    setPrefillTransaction({ ...draft, isDraft: true, customerId: draft.customerId, name: draft.name, phone: draft.phone, items: draft.items, amount: draft.amount, paid: draft.paid, customerNote: draft.customerNote || "", internalNote: draft.internalNote || "", invoiceItems: draft.invoiceItems });
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

  const handleCopyPreview = async () => {
    const textToCopy = sendMethod === "sms" ? smsMessage : sendMethod === "whatsapp" ? whatsappMessage : "No message selected.";
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(textToCopy);
      else {
        const textArea = document.createElement("textarea"); textArea.value = textToCopy;
        textArea.style.position = "fixed"; textArea.style.left = "-999999px"; document.body.appendChild(textArea);
        textArea.focus(); textArea.select(); document.execCommand('copy'); textArea.remove();
      }
      showToast("Text copied!");
    } catch (err) { showToast("Failed to copy."); }
  };

  const handleSaveDraft = async () => {
    if (!tx.name && !tx.phone && invoiceItems.length === 0) { showToast("Add a customer or items to save a draft."); return; }
    try {
      await saveDraft({ id: editingDraftId, customerId: tx.customerId, name: tx.name, phone: tx.phone, items: tx.items, amount: tx.amount, paid: tx.paid, customerNote: tx.customerNote, internalNote: tx.internalNote, recordMode, invoiceItems: recordMode === "detailed" ? invoiceItems : null });
      showToast("Draft saved successfully!"); resetToSearch(); setView("home");
    } catch (error) { showToast("Failed to save draft."); }
  };

  const saveAndSend = async () => {
    const amount = parseFloat(tx.amount) || 0; const paid = parseFloat(tx.paid) || 0;
    if (amount === 0 && paid === 0) return;
    if (!currentStore?.id) { showToast("Database not ready."); return; }
    if (!tx.customerId && !isValidPhone(tx.phone)) { setPhoneError("Please enter a valid phone number."); showToast("⚠️ Invalid phone number"); return; }
    setPhoneError("");
    
    const noteString = tx.customerNote ? ` (Note: ${tx.customerNote})` : "";
    const itemsString = (recordMode === "detailed" ? invoiceItems.map(i => `${i.quantity}x ${i.name}`).join(", ") : tx.items) + noteString;
    
    try {
      const result = await CustomerService.addTransaction(currentStore.id, tx.customerId, tx.name, tx.phone, amount, paid, itemsString, recordMode === "detailed" ? invoiceItems : null, tx.internalNote);
      if (editingDraftId) await deleteDraft(editingDraftId);
      await refreshCustomers();
      if (amount - paid <= 0 && paid > 0) triggerConfetti();

      const latestTx = result.history[result.history.length - 1]; 
      const invNum = latestTx?.invoiceNumber || "";

      const refLine = invNum ? `Ref: ${invNum}\n\n` : "";
      const finalSms = smsMessage.replace("Ref: (Auto-generated)\n\n", refLine);
      const finalWhatsapp = whatsappMessage.replace("*Ref:* (Auto-generated)\n\n", invNum ? `*Ref:* ${invNum}\n\n` : "");

      if (sendMethod === "sms" && tx.phone) {
        openSMS(tx.phone, finalSms);
      } else if (sendMethod === "whatsapp" && tx.phone) {
        openWhatsApp(tx.phone, finalWhatsapp);
      }

      resetToSearch(); setView("home"); 
      showToast(sendMethod === "none" ? "Transaction saved" : `Saved & sent via ${sendMethod.toUpperCase()}!`);
    } catch (error) {
      const realError = error.message || error.toString();
      if (realError.includes("already exists")) { setPhoneError(realError); showToast(realError); } else showToast(`Error: ${realError.substring(0, 60)}`);
    }
  };

  const isExistingCustomer = mode === "existing";
  const currentBal = tx.customerId ? (customers.find(c => c.id === tx.customerId)?.balance || 0) : 0;
  const amountVal = parseFloat(tx.amount) || 0; const paidVal = parseFloat(tx.paid) || 0;
  const totalDue = currentBal + amountVal; const newBal = totalDue - paidVal;
  const isOverpayment = paidVal > totalDue && totalDue > 0;

  // 👇 2. Updated SMS Message with dynamic currency
  const smsMessage = useMemo(() => {
    const pad = (str, len) => str.padEnd(len);
    let msg = "Account Summary\n\n";

    if (currentBal > 0) msg += `${pad("Old Balance", 16)}${formatCurrency(currentBal, currency)}\n`;
    if (amountVal > 0) msg += `${pad("+ Items bought", 16)}${formatCurrency(amountVal, currency)}\n`;
    if (paidVal > 0) msg += `${pad("- Paid", 16)}${formatCurrency(paidVal, currency)}\n`;

    msg += "──────────────────────\n";
    msg += `${pad("Total Owing", 16)}${formatCurrency(newBal < 0 ? 0 : newBal, currency)}\n\n`;

    if (newBal <= 0 && (currentBal > 0 || amountVal > 0)) {
      msg += "Account fully paid.\n\n";
    }

    if (tx.customerNote) {
      msg += `Note:\n${tx.customerNote}\n\n`;
    }

    msg += `Ref: (Auto-generated)\n\nThanks!\n- ${currentStore?.name || "Store"}`;
    return msg;
  }, [currentBal, amountVal, paidVal, newBal, currentStore, tx.customerNote, currency]);

  // 👇 3. Updated WhatsApp Message with dynamic currency
  const whatsappMessage = useMemo(() => {
    const itemsList = recordMode === "detailed" && invoiceItems.length > 0
      ? invoiceItems.map(i => `- ${i.quantity}x ${i.name} @ ${formatCurrency(i.price, currency)} = ${formatCurrency(i.quantity * i.price, currency)}`).join('\n')
      : tx.items || "General Purchase";
      
    let msg = ` *INVOICE* - ${currentStore?.name || "Store"}\nDate: ${formatDate(new Date())}\nCustomer: ${tx.name || "Walk-in Customer"}\n\n *Items:*\n${itemsList}\n\n💰 *Payment Summary:*\nSubtotal: ${formatCurrency(amountVal, currency)}\n` +
      (paidVal > 0 ? `Paid: ${formatCurrency(paidVal, currency)}\n` : '') +
      `\n *Balance Update:*\nOld Debt: ${formatCurrency(currentBal, currency)}\nNew Balance: ${formatCurrency(newBal < 0 ? 0 : newBal, currency)}` +
      (newBal < 0 ? `\n*(You have a credit of ${formatCurrency(Math.abs(newBal), currency)})*` : '') + `\n\n`;
      
    if (tx.customerNote) {
        msg += `📝 *Note:* ${tx.customerNote}\n\n`;
    }
    
    msg += `*Ref:* (Auto-generated)\n\nThank you for your patronage! `;
    return msg;
  }, [currentBal, amountVal, paidVal, tx.name, tx.items, tx.customerNote, newBal, currentStore, recordMode, invoiceItems, currency]);

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
        {mode === "search" && !editingDraftId && <DraftsCard drafts={drafts} onResume={handleResumeDraft} />}
        
        {mode === "search" && (
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Find or add a customer</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search or add a customer..." className="w-full pl-10 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-base" autoFocus />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2.5 ml-1 flex items-center gap-1.5"><span className="text-green-600">💡</span> Search a customer or type a new name.</p>
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map(c => (
                <button key={c.id} onClick={() => handleSelectCustomer(c)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">{c.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</p><p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.phone}</p></div>
                  {/* 👇 4. Updated formatCurrency */}
                  {c.balance > 0 && <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full flex-shrink-0">{formatCurrency(c.balance, currency)}</span>}
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
                {/*  5. Updated formatCurrency */}
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(currentBal, currency)}</p>
              </div>
            )}
          </div>
        )}
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
        {(mode === "existing" || mode === "new") && (
          <>
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button onClick={() => setRecordMode("quick")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${recordMode === "quick" ? "bg-white dark:bg-gray-700 shadow-sm text-green-700 dark:text-green-400" : "text-gray-500"}`}><FileText size={16} /> Quick Note</button>
              <button onClick={() => setRecordMode("detailed")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${recordMode === "detailed" ? "bg-white dark:bg-gray-700 shadow-sm text-green-700 dark:text-green-400" : "text-gray-500"}`}><Package size={16} /> Detailed Invoice</button>
            </div>

            {recordMode === "quick" && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <div>
                  <label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Customer Note (Optional)</label>
                  <textarea placeholder="e.g., Will send remaining USD5 tonight." value={tx.customerNote} onChange={e => setTx({...tx, customerNote: e.target.value})} className="w-full text-sm mt-1 outline-none dark:text-white bg-transparent border-b border-gray-200 dark:border-gray-700 pb-2" rows="2" />
                  <p className="text-[10px] text-gray-400 mt-1">Automatically included in SMS/WhatsApp receipts.</p>
                </div>
                <div>
                  <label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase flex items-center gap-1">
                    <Lock size={12} /> Internal Note (Private)
                  </label>
                  <textarea placeholder="e.g., Customer usually pays after salary." value={tx.internalNote} onChange={e => setTx({...tx, internalNote: e.target.value})} className="w-full text-sm mt-1 outline-none dark:text-white bg-transparent border-b border-gray-200 dark:border-gray-700 pb-2" rows="2" />
                  <p className="text-[10px] text-gray-400 mt-1">Visible only to you. Never sent to the customer.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Total Amount</label>
                    <input type="number" inputMode="decimal" placeholder="0.00" value={tx.amount} onChange={e => setTx({...tx, amount: e.target.value})} className={`w-full text-2xl font-bold text-gray-900 dark:text-white mt-1 outline-none bg-transparent ${noSpinnerClass}`} />
                  </div>
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Money Paid</label>
                    <input type="number" inputMode="decimal" placeholder="0.00" value={tx.paid} onChange={e => setTx({...tx, paid: e.target.value})} className={`w-full text-2xl font-bold text-green-700 dark:text-green-400 mt-1 outline-none bg-transparent ${noSpinnerClass}`} />
                  </div>
                </div>
              </div>
            )}
            {recordMode === "detailed" && (
              <DetailedInvoice tx={tx} setTx={setTx} invoiceItems={invoiceItems} setInvoiceItems={setInvoiceItems} products={products} setProducts={setProducts} currentStore={currentStore} showToast={showToast} />
            )}

            {isOverpayment && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /><div><p className="font-bold text-sm">Overpayment Detected</p><p className="text-sm mt-1">Credit of {formatCurrency(Math.abs(newBal), currency)}.</p></div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">What to do after saving?</p>
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${sendMethod === 'none' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                <input type="radio" name="sendMethod" value="none" checked={sendMethod === 'none'} onChange={() => setSendMethod('none')} className="accent-green-600 w-4 h-4" />
                <div className="flex-1 flex items-center gap-2"><XCircle size={18} className="text-gray-500" /><div><p className="font-bold text-sm text-gray-900 dark:text-white">Save Only</p><p className="text-[10px] text-gray-500">Don't send any message</p></div></div>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${sendMethod === 'sms' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                <input type="radio" name="sendMethod" value="sms" checked={sendMethod === 'sms'} onChange={() => setSendMethod('sms')} className="accent-blue-600 w-4 h-4" />
                <div className="flex-1 flex items-center gap-2"><MessageSquare size={18} className="text-blue-500" /><div><p className="font-bold text-sm text-gray-900 dark:text-white">Send via SMS</p><p className="text-[10px] text-gray-500">Short text message</p></div></div>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${sendMethod === 'whatsapp' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                <input type="radio" name="sendMethod" value="whatsapp" checked={sendMethod === 'whatsapp'} onChange={() => setSendMethod('whatsapp')} className="accent-green-600 w-4 h-4" />
                <div className="flex-1 flex items-center gap-2"><Send size={18} className="text-green-500" /><div><p className="font-bold text-sm text-gray-900 dark:text-white">Send via WhatsApp</p><p className="text-[10px] text-gray-500">Detailed formatted receipt</p></div></div>
              </label>
            </div>

            {sendMethod !== "none" && (
              <div className="bg-gray-900 text-gray-100 p-4 rounded-2xl shadow-xl space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">{sendMethod === "sms" ? "SMS Preview" : "WhatsApp Preview"}</p>
                  <button onClick={handleCopyPreview} className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white px-2.5 py-1.5 rounded-lg transition active:scale-95"><Copy size={14} /> Copy</button>
                </div>
                <div className="font-mono text-xs leading-relaxed whitespace-pre-line bg-black/40 p-3 rounded-lg border border-gray-700 max-h-40 overflow-y-auto">{sendMethod === "sms" ? smsMessage : whatsappMessage}</div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button onClick={handleSaveDraft} className="w-full bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-bold text-sm py-3 rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2"><FileText size={16} /> Save as Draft</button>
              <button onClick={saveAndSend} disabled={!tx.amount && !tx.paid} className="w-full bg-green-700 hover:bg-green-800 text-white font-bold text-xl py-4 rounded-2xl shadow-lg disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center gap-2"><Check size={24} /> {editingDraftId ? "Finalize Transaction" : "Save Transaction"}</button>
            </div>
          </>
        )}
      </div>
      {isEditingCustomer && tx.customerId && (
        <EditCustomerModal customer={customers.find(c => c.id === tx.customerId)} onClose={() => { setIsEditingCustomer(false); const updated = customers.find(c => c.id === tx.customerId); if(updated) setTx(prev => ({ ...prev, name: updated.name, phone: updated.phone })); }} />
      )}
    </div>
  );
};