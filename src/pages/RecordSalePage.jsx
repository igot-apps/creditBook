import { DiscardInvoiceModal } from "../components/DiscardInvoiceModal";
import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Users, Check, Pause, Loader2 } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";
import { CustomerService } from "../services/CustomerService";
import { ProductService } from "../services/ProductService";
import { TransactionService } from "../services/TransactionService";
import { SuspendedTransactionService } from "../services/SuspendedTransactionService";
import { DetailedInvoice } from "../components/DetailedInvoice";
import { TopBar } from "../components/TopBar";

export const RecordSalePage = () => {
  const {
    currentStore, setView, prefillTransaction, setPrefillTransaction, showToast,
    autoDraft, saveDraft, clearAutoDraft,
    fixTransaction, setFixTransaction, lastScrollPosition, setLastScrollPosition,
    setSelectedCustomer: setStoreSelectedCustomer,
    resumedSuspendedId, clearResumedSuspended,
    readOnly
  } = useStore();

  // 👇 VIEW-ONLY GUARD
  const blockIfReadOnly = () => {
    if (readOnly) {
      showToast("👁️ View-only mode — renew your subscription to make changes");
      return true;
    }
    return false;
  };

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
  const [replacementId, setReplacementId] = useState(null);
  const [originalAmount, setOriginalAmount] = useState(0);
  const [originalPaid, setOriginalPaid] = useState(0);
  const [fixReason, setFixReason] = useState("");
  const [invoiceToDiscard, setInvoiceToDiscard] = useState(null);
  const [suspendedId, setSuspendedId] = useState(null);
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString());
  const [isSaving, setIsSaving] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);

  // Load Draft on Mount
  useEffect(() => { useStore.getState().loadDraft('sale'); }, []);

  useEffect(() => {
    if (currentStore?.id) {
      CustomerService.getAll({ fetchAll: true }).then(res => setCustomers(Array.isArray(res) ? res : [])).catch(() => setCustomers([]));
      ProductService.getAll().then(res => setProducts(Array.isArray(res) ? res : [])).catch(() => setProducts([]));
    }
  }, [currentStore?.id]);

  // Load Suspended Sale if resumed from Home Page
  useEffect(() => {
    if (resumedSuspendedId) {
      let cancelled = false;
      SuspendedTransactionService.getSuspendedTransactions().then(all => {
        if (cancelled) return;
        const susp = all.find(s => s.id === resumedSuspendedId && s.type === 'sale');
        if (susp) {
          setSelectedCustomer({
            id: susp.contactId,
            name: susp.contactName || "Unknown Customer",
            phone: susp.contactPhone || ""
          });
          setInvoiceItems(susp.items || []);
          setTx({
            amount: (susp.amount || 0).toString(),
            paid: (susp.paid || 0).toString(),
            invoicePayments: susp.invoicePayments || [],
            discount: (susp.discount || 0).toString(),
            note: susp.note || ""
          });
          setSuspendedId(susp.id);
          setSaleDate(susp.createdAt || new Date().toISOString());
          setMode("existing");
          showToast("⏸️ Resumed suspended sale");
        } else {
          showToast("Suspended sale is no longer available");
        }
      }).catch(() => {
        if (!cancelled) showToast("Failed to load suspended sale");
      }).finally(() => {
        if (!cancelled) clearResumedSuspended();
      });
      return () => { cancelled = true; };
    }
  }, [resumedSuspendedId, clearResumedSuspended, showToast]);

  // Handle Prefill from Profile Page
  useEffect(() => {
    if (prefillTransaction && prefillTransaction.customerId) {
      const customer = customers.find(c => c.id === prefillTransaction.customerId) || {
        id: prefillTransaction.customerId,
        name: prefillTransaction.name || "Unknown",
        phone: prefillTransaction.phone || ""
      };
      setSelectedCustomer(customer);
      setMode("existing");
      if (prefillTransaction.paid !== undefined) setTx(prev => ({ ...prev, paid: prefillTransaction.paid.toString() }));
      setPrefillTransaction(null);
      clearAutoDraft('sale');
    }
  }, [prefillTransaction, customers, setPrefillTransaction, clearAutoDraft]);

  // Handle Fix Transaction (snake_case-safe + fetches REAL customer name)
  useEffect(() => {
    if (!fixTransaction || !fixTransaction.id) return;
    const contactId = fixTransaction.contact_id || fixTransaction.contactId;
    const startFixMode = (customer) => {
      setSelectedCustomer(customer);
      setInvoiceItems(fixTransaction.items || []);
      setTx({
        amount: fixTransaction.amount?.toString() || "0",
        paid: fixTransaction.paid?.toString() || "",
        invoicePayments: fixTransaction.invoice_payments || [],
        discount: fixTransaction.discount?.toString() || "",
        note: fixTransaction.note || ""
      });
      setOriginalAmount(parseFloat(fixTransaction.amount) || 0);
      setOriginalPaid(Number(fixTransaction.paid) || 0);
      setFixReason(fixTransaction.fixReason || "");
      setMode("existing");
      setIsFixing(true);
      setFixingOldId(fixTransaction.id);
      setReplacementId(crypto.randomUUID());
      setFixTransaction(null);
    };
    if (contactId) {
      CustomerService.getById(contactId)
        .then(c => startFixMode(c || { id: contactId, name: "Unknown Customer", phone: "" }))
        .catch(() => startFixMode({ id: contactId, name: "Unknown Customer", phone: "" }));
    } else {
      startFixMode({ id: null, name: "Unknown Customer", phone: "" });
    }
  }, [fixTransaction, setFixTransaction]);

  const handleAbortFix = () => {
    if (!isSaving) setView("profile");
  };

  // Restore Auto-Draft
  useEffect(() => {
    if (autoDraft?.draftType === 'sale' && !selectedCustomer && !prefillTransaction && !resumedSuspendedId && !fixTransaction && !isFixing) {
      const draftCustomer = customers.find(c => c.id === autoDraft.customerId) || {
        id: autoDraft.customerId,
        name: autoDraft.customerName || 'Unknown',
        phone: autoDraft.customerPhone || ''
      };
      setSelectedCustomer(draftCustomer);
      setInvoiceItems(autoDraft.invoiceItems || []);
      setSuspendedId(autoDraft.suspendedId || null);
      setSaleDate(autoDraft.saleDate || autoDraft.updatedAt || new Date().toISOString());
      setTx({
        amount: autoDraft.amount || "0",
        paid: autoDraft.paid || "",
        invoicePayments: autoDraft.invoicePayments || [],
        discount: autoDraft.discount || "",
        note: autoDraft.note || ""
      });
      setMode("existing");
    }
  }, [autoDraft, customers, selectedCustomer, prefillTransaction, resumedSuspendedId, fixTransaction, isFixing]);

  // Save Auto-Draft (debounced)
  useEffect(() => {
    if (mode === 'existing' && selectedCustomer && !isFixing) {
      const draftData = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        invoiceItems,
        suspendedId,
        saleDate,
        amount: tx.amount,
        paid: tx.paid,
        invoicePayments: tx.invoicePayments,
        discount: tx.discount,
        note: tx.note,
        draftType: 'sale'
      };
      const timeoutId = setTimeout(() => { saveDraft(draftData, true); }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedCustomer, invoiceItems, suspendedId, saleDate, tx, mode, saveDraft, isFixing]);

  const resetSale = () => {
    setMode("search");
    setSelectedCustomer(null);
    setSuspendedId(null);
    setInvoiceItems([]);
    setTx({ amount: "0", paid: "", discount: "", note: "" });
    setSaleDate(new Date().toISOString());
    clearAutoDraft('sale');
  };

  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
  }, [customers, searchQuery]);

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setMode("existing");
    setSearchQuery("");
  };

  // 👇 GUARDED: inline customer creation
  const handleCreateCustomer = () => {
    if (blockIfReadOnly()) return;
    const name = searchQuery.trim();
    if (name) {
      CustomerService.addCustomer(currentStore.id, name, "").then(id => {
        setSelectedCustomer({ id, name, phone: "", balance: 0 });
        setMode("existing");
        setSearchQuery("");
        showToast("✅ Customer created!");
        CustomerService.getAll({ fetchAll: true }).then(setCustomers);
      }).catch(() => showToast("❌ Failed to create customer."));
    }
  };

  // 👇 GUARDED: suspend
  const handleSuspendSale = async () => {
    if (blockIfReadOnly()) return;
    if (isSuspending || isSaving) return;
    if (!selectedCustomer) { showToast("️ Select a customer first"); return; }
    if (Number(tx.paid) < 0) { showToast("Enter a non-negative amount paid"); return; }
    if (invoiceItems.length === 0 && !tx.note.trim() && parseFloat(tx.amount) === 0) {
      showToast("⚠️ Add items before suspending"); return;
    }
    setIsSuspending(true);
    try {
      const data = {
        id: suspendedId,
        storeId: currentStore.id,
        type: 'sale',
        contactId: selectedCustomer.id,
        contactName: selectedCustomer.name,
        contactPhone: selectedCustomer.phone,
        items: invoiceItems,
        createdAt: saleDate,
        amount: parseFloat(tx.amount) || 0,
        paid: parseFloat(tx.paid) || 0,
        invoicePayments: tx.invoicePayments,
        discount: parseFloat(tx.discount) || 0,
        note: tx.note
      };
      await SuspendedTransactionService.suspendTransaction(data);
      clearAutoDraft('sale');
      showToast("Invoice suspended");
      setView("home");
    } catch (error) {
      console.error(error);
      if (error.message?.includes('invoice_payments') && ['PGRST204', '42703'].includes(error.code)) {
        showToast("Apply the invoice payments migration in Supabase, then retry.");
      } else {
        showToast("❌ Failed to suspend sale");
      }
    } finally {
      setIsSuspending(false);
    }
  };



  // 👇 GUARDED: save sale
  const handleSaveInvoice = async () => {
    if (blockIfReadOnly()) return;
    if (isSaving || isSuspending) return;
    if (!selectedCustomer) return;
    const finalAmount = parseFloat(tx.amount) || 0;
    const finalPaid = parseFloat(tx.paid) || 0;
    if (finalPaid < 0) { showToast("Enter a non-negative amount paid"); return; }
    if (finalAmount === 0 && finalPaid === 0 && !tx.note.trim() && invoiceItems.length === 0) {
      showToast("⚠️ Please add items, a payment amount, or a note."); return;
    }
    setIsSaving(true);
    try {
      const extraData = {
        invoicePayments: tx.invoicePayments,
        contactName: selectedCustomer.name,
        contactPhone: selectedCustomer.phone,
        discount: parseFloat(tx.discount) || 0
      };
      if (isFixing && fixingOldId) {
        await TransactionService.correct(fixingOldId, replacementId, {
          amount: finalAmount,
          paid: finalPaid,
          discount: extraData.discount,
          note: tx.note,
          items: invoiceItems,
          invoice_payments: extraData.invoicePayments || [],
        }, fixReason);
        showToast("Correction saved");
      } else {
        await TransactionService.create(currentStore.id, selectedCustomer.id, 'sale', invoiceItems, finalAmount, finalPaid, tx.note, extraData);
        await CustomerService.updateBalance(selectedCustomer.id);
        clearAutoDraft('sale');
        if (suspendedId) {
          await SuspendedTransactionService.deleteSuspendedTransaction(suspendedId);
          setSuspendedId(null);
        }
        showToast("Customer invoice saved");
      }
      setLastScrollPosition(window.scrollY);
      setStoreSelectedCustomer(selectedCustomer);
      setView("profile");
    } catch (error) {
      console.error(error);
      showToast(error.code === "P0001" ? error.message : "Failed to record sale.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentTotal = parseFloat(tx.amount) || 0;
  const difference = currentTotal - originalAmount;
  const balanceChange = difference - ((Number(tx.paid) || 0) - originalPaid);

  return (
    <div className="app-screen min-h-screen bg-gray-50 dark:bg-gray-950">
      <TopBar title={isFixing ? "Fix Customer Invoice" : "Sell to Customer"} showBack={true} onBack={isFixing ? handleAbortFix : () => setView("customers")} />
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

        {mode === "search" && resumedSuspendedId && (
          <p role="status" className="text-sm text-gray-500 dark:text-gray-400">Loading suspended sale…</p>
        )}

        {mode === "search" && !resumedSuspendedId && (
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Users size={16} className="text-green-600" /> Select Customer</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search customers..." className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" autoFocus />
            </div>
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {Array.isArray(filteredCustomers) && filteredCustomers.map(c => (
                <button key={c.id} onClick={() => handleSelectCustomer(c)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">{(c.name || "?").charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.phone || "No phone"}</p>
                  </div>
                </button>
              ))}
              {searchQuery.trim() && filteredCustomers.length === 0 && (
                <button onClick={handleCreateCustomer} className="w-full flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:bg-green-800 text-green-700 dark:text-green-400 transition text-left">
                  <Plus size={20} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Create new customer</p>
                    <p className="text-xs opacity-80 truncate">Use "{searchQuery}"</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {mode === "existing" && selectedCustomer && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-green-100 dark:border-green-900/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                {(selectedCustomer.name || "?").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-600 dark:text-green-400 uppercase font-bold">{isFixing ? "Correcting sale for" : "Selling to"}</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{selectedCustomer.name || "Unknown Customer"}</p>
                {!isFixing && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {suspendedId ? "Created on " : "Draft started on "}{formatDate(saleDate)}
                  </p>
                )}
              </div>
              {!isFixing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInvoiceToDiscard({ id: suspendedId, type: "sale", contactName: selectedCustomer.name })}
                    disabled={isSaving || isSuspending}
                    className="text-xs text-red-600 dark:text-red-400 underline font-semibold px-2 py-1 flex-shrink-0"
                  >
                    Discard Draft
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    onClick={resetSale}
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
          <DetailedInvoice tx={tx} setTx={setTx} invoiceItems={invoiceItems} setInvoiceItems={setInvoiceItems} products={products} setProducts={setProducts} currentStore={currentStore} showToast={showToast} createdAt={isFixing ? undefined : saleDate} />
        )}

        {mode === "existing" && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Add a note (optional)</label>
            <textarea value={tx.note} onChange={e => setTx({ ...tx, note: e.target.value })} placeholder="Add a note (optional)..." className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm resize-none" rows="2" />
          </div>
        )}

        {mode === "existing" && !isFixing && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleSuspendSale}
              disabled={isSuspending || isSaving}
              className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-sm disabled:opacity-60"
            >
              {isSuspending ? <><Loader2 className="animate-spin" size={20} /> Suspending...</> : <><Pause size={20} /> Suspend Invoice</>}
            </button>
            <button
              onClick={handleSaveInvoice}
              disabled={isSaving || isSuspending}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg disabled:opacity-60"
            >
              {isSaving ? <><Loader2 className="animate-spin" size={24} /> Saving...</> : <><Check size={24} /> Save Invoice</>}
            </button>
          </div>
        )}

        {mode === "existing" && isFixing && (
          <button
            onClick={handleSaveInvoice}
            disabled={isSaving || isSuspending}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg disabled:opacity-60"
          >
            {isSaving ? <><Loader2 className="animate-spin" size={24} /> Saving...</> : <><Check size={24} /> Save Corrected Invoice</>}
          </button>
        )}
      </div>


      <DiscardInvoiceModal invoice={invoiceToDiscard} onClose={() => setInvoiceToDiscard(null)} onDiscarded={() => {
        setInvoiceToDiscard(null);
        setView("home");
      }} />
    </div>
  );
};
