import { DiscardInvoiceModal } from "../components/DiscardInvoiceModal";
import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus, Users, Check, Pause, Loader2, List, Zap, AlertTriangle, WalletCards } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";
import { CustomerService } from "../services/CustomerService";
import { ProductService } from "../services/ProductService";
import { TransactionService } from "../services/TransactionService";
import { SuspendedTransactionService } from "../services/SuspendedTransactionService";
import { DetailedInvoice } from "../components/DetailedInvoice";
import { TopBar } from "../components/TopBar";
import { InvoicePayments } from "../components/InvoicePayments";
import { AllocationService } from "../services/AllocationService";
import { paymentCreditAvailable } from "../utils/paymentCredit";

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
  const [invoiceStyle, setInvoiceStyle] = useState("itemized");
  const [quickDescription, setQuickDescription] = useState("Items not listed");
  const [pendingCreditAmount, setPendingCreditAmount] = useState("0");
  const [creditHistory, setCreditHistory] = useState([]);
  const [creditAllocations, setCreditAllocations] = useState([]);
  const [creditLoaded, setCreditLoaded] = useState(false);
  const [creditLoadError, setCreditLoadError] = useState(false);
  const [creditReloadKey, setCreditReloadKey] = useState(0);
  const [showCreditEditor, setShowCreditEditor] = useState(false);
  const finalizeIds = useRef({ invoiceId: crypto.randomUUID(), operationId: crypto.randomUUID() });

  const quickInvoiceItem = () => ({
    productId: null,
    name: quickDescription.trim() || "Items not listed",
    brand: "",
    unitName: "Quick invoice",
    quantity: 1,
    price: parseFloat(tx.amount) || 0,
    total: parseFloat(tx.amount) || 0,
    isQuickInvoice: true,
  });
  const effectiveItems = invoiceStyle === "quick" ? [quickInvoiceItem()] : invoiceItems;

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
          const quickItem = (susp.items || []).find(item => item.isQuickInvoice);
          setInvoiceItems(quickItem ? [] : (susp.items || []));
          if (quickItem) { setInvoiceStyle("quick"); setQuickDescription(quickItem.name || "Items not listed"); }
          setTx({
            amount: (susp.amount || 0).toString(),
            paid: (susp.paid || 0).toString(),
            invoicePayments: susp.invoicePayments || [],
            discount: (susp.discount || 0).toString(),
            note: susp.note || ""
          });
          setSuspendedId(susp.id);
          setPendingCreditAmount(String(susp.pendingCreditAmount || 0));
          setSaleDate(susp.createdAt || new Date().toISOString());
          setMode("existing");
          showToast("⏸️ Resumed suspended invoice");
        } else {
          showToast("Suspended invoice is no longer available");
        }
      }).catch(() => {
        if (!cancelled) showToast("Failed to load suspended invoice");
      }).finally(() => {
        if (!cancelled) clearResumedSuspended();
      });
      return () => { cancelled = true; };
    }
  }, [resumedSuspendedId, clearResumedSuspended, showToast]);

  useEffect(() => {
    if (!selectedCustomer?.id || isFixing) {
      setCreditHistory([]);
      setCreditAllocations([]);
      setCreditLoaded(false);
      setCreditLoadError(false);
      return;
    }
    setCreditLoaded(false);
    setCreditLoadError(false);
    Promise.all([
      TransactionService.getHistory(selectedCustomer.id),
      AllocationService.getByContact(selectedCustomer.id),
    ]).then(([history, allocations]) => {
      setCreditHistory(Array.isArray(history) ? history : []);
      setCreditAllocations(Array.isArray(allocations) ? allocations : []);
      setCreditLoaded(true);
    }).catch(() => setCreditLoadError(true));
  }, [selectedCustomer?.id, suspendedId, isFixing, creditReloadKey]);

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
      const quickItem = (fixTransaction.items || []).find(item => item.isQuickInvoice);
      setInvoiceItems(quickItem ? [] : (fixTransaction.items || []));
      if (quickItem) { setInvoiceStyle("quick"); setQuickDescription(quickItem.name || "Items not listed"); }
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
      const quickDraftItem = (autoDraft.invoiceItems || []).find(item => item.isQuickInvoice);
      setInvoiceItems(quickDraftItem ? [] : (autoDraft.invoiceItems || []));
      setInvoiceStyle(autoDraft.invoiceStyle || (quickDraftItem ? "quick" : "itemized"));
      setQuickDescription(autoDraft.quickDescription || quickDraftItem?.name || "Items not listed");
      setSuspendedId(autoDraft.suspendedId || null);
      setPendingCreditAmount(String(autoDraft.pendingCreditAmount || 0));
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
        invoiceStyle,
        quickDescription,
        suspendedId,
        saleDate,
        amount: tx.amount,
        paid: tx.paid,
        invoicePayments: tx.invoicePayments,
        pendingCreditAmount,
        discount: tx.discount,
        note: tx.note,
        draftType: 'sale'
      };
      const timeoutId = setTimeout(() => { saveDraft(draftData, true); }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedCustomer, invoiceItems, invoiceStyle, quickDescription, suspendedId, saleDate, pendingCreditAmount, tx, mode, saveDraft, isFixing]);

  const resetSale = () => {
    setMode("search");
    setSelectedCustomer(null);
    setSuspendedId(null);
    setInvoiceItems([]);
    setInvoiceStyle("itemized");
    setQuickDescription("Items not listed");
    setTx({ amount: "0", paid: "", discount: "", note: "" });
    setPendingCreditAmount("0");
    setSaleDate(new Date().toISOString());
    clearAutoDraft('sale');
  };

  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
  }, [customers, searchQuery]);

  const creditSources = useMemo(() => creditHistory
    .map(source => ({ source, available: paymentCreditAvailable(source, creditHistory, creditAllocations) }))
    .filter(entry => entry.available > 0.009)
    .sort((a, b) => new Date(a.source.received_at || a.source.created_at) - new Date(b.source.received_at || b.source.created_at)),
  [creditHistory, creditAllocations]);
  const totalCreditAvailable = creditSources.reduce((sum, entry) => sum + entry.available, 0);
  const invoiceTotal = parseFloat(tx.amount) || 0;
  const paidUpfront = Number(tx.paid) || 0;
  const invoiceCreditLimit = Math.max(0, invoiceTotal - paidUpfront);
  const maxPendingCredit = creditLoaded ? Math.min(totalCreditAvailable, invoiceCreditLimit) : invoiceCreditLimit;
  const pendingCredit = Math.min(Number(pendingCreditAmount) || 0, maxPendingCredit);
  const balanceAfterPendingCredit = Math.max(0, invoiceTotal - paidUpfront - pendingCredit);

  useEffect(() => {
    if (creditLoaded && (Number(pendingCreditAmount) || 0) > maxPendingCredit + 0.009) {
      setPendingCreditAmount(maxPendingCredit.toFixed(2));
    }
  }, [creditLoaded, maxPendingCredit, pendingCreditAmount]);

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
    if (invoiceStyle === "quick" && (parseFloat(tx.amount) || 0) <= 0) { showToast("⚠️ Enter the invoice total"); return; }
    if (effectiveItems.length === 0 && !tx.note.trim() && parseFloat(tx.amount) === 0) {
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
        items: effectiveItems,
        createdAt: saleDate,
        amount: parseFloat(tx.amount) || 0,
        paid: parseFloat(tx.paid) || 0,
        pendingCreditAmount: pendingCredit,
        invoicePayments: tx.invoicePayments,
        discount: parseFloat(tx.discount) || 0,
        note: tx.note
      };
      await SuspendedTransactionService.suspendTransaction(data);
      clearAutoDraft('sale');
      showToast("Invoice suspended");
      setView("home");
    } catch (error) {
      console.error("Sale save failed", { code: error?.code, message: error?.message, details: error?.details, hint: error?.hint });
      if ((error.message?.includes('invoice_payments') || error.message?.includes('pending_credit_amount')) && ['PGRST204', '42703'].includes(error.code)) {
        showToast("Apply the latest suspended invoice migration in Supabase, then retry.");
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
    if ((Number(pendingCreditAmount) || 0) > 0 && !creditLoaded) { showToast("Wait for customer credit to finish loading, then try again."); return; }
    if (invoiceStyle === "quick" && finalAmount <= 0) { showToast("⚠️ Enter the invoice total"); return; }
    if (finalAmount === 0 && finalPaid === 0 && !tx.note.trim() && effectiveItems.length === 0) {
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
          items: effectiveItems,
          invoice_payments: extraData.invoicePayments || [],
        }, fixReason);
        showToast("Correction saved");
      } else {
        if (suspendedId) {
          await TransactionService.finalizeSuspendedSale({
            invoiceId: finalizeIds.current.invoiceId,
            operationId: finalizeIds.current.operationId,
            suspendedId,
            storeId: currentStore.id,
            contactId: selectedCustomer.id,
            items: effectiveItems,
            amount: finalAmount,
            paid: finalPaid,
            discount: extraData.discount,
            note: tx.note,
            invoicePayments: extraData.invoicePayments,
            createdAt: saleDate,
            creditAmount: pendingCredit,
          });
          setSuspendedId(null);
        } else if (pendingCredit > 0) {
          await TransactionService.createInvoiceWithCredit({
            invoiceId: finalizeIds.current.invoiceId,
            operationId: finalizeIds.current.operationId,
            storeId: currentStore.id,
            contactId: selectedCustomer.id,
            invoiceType: 'sale',
            items: effectiveItems,
            amount: finalAmount,
            paid: finalPaid,
            discount: extraData.discount,
            note: tx.note,
            invoicePayments: extraData.invoicePayments,
            createdAt: saleDate,
            creditAmount: pendingCredit,
          });
        } else {
          await TransactionService.create(currentStore.id, selectedCustomer.id, 'sale', effectiveItems, finalAmount, finalPaid, tx.note, extraData);
          await CustomerService.updateBalance(selectedCustomer.id);
        }
        clearAutoDraft('sale');
        showToast("Customer invoice saved");
      }
      setLastScrollPosition(window.scrollY);
      setStoreSelectedCustomer(selectedCustomer);
      setView("profile");
    } catch (error) {
      console.error(error);
      if (error.code === "PGRST202" || error.message?.includes("pending_credit_amount")) {
        showToast("Apply the pending credit migration in Supabase, then retry.");
      } else {
        showToast(error?.message || "Failed to save invoice.");
      }
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
          <p role="status" className="text-sm text-gray-500 dark:text-gray-400">Loading suspended invoice…</p>
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
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-2 px-1 text-xs font-bold uppercase text-gray-500 dark:text-gray-400">How do you want to record this invoice?</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setInvoiceStyle("itemized")} className={`rounded-xl border p-3 text-left transition ${invoiceStyle === "itemized" ? "border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500 dark:bg-green-950/30 dark:text-green-300" : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"}`}><List size={19}/><span className="mt-1 block text-sm font-black">Itemized</span><span className="block text-[10px] opacity-80">List each product for a detailed invoice</span></button>
              <button onClick={() => { if (invoiceItems.length > 0 && invoiceStyle !== "quick" && !window.confirm("Use Quick Invoice instead? Your itemized products will remain in the draft if you switch back.")) return; setInvoiceStyle("quick"); setTx(prev => ({ ...prev, discount: "" })); }} className={`rounded-xl border p-3 text-left transition ${invoiceStyle === "quick" ? "border-indigo-500 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-300" : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"}`}><Zap size={19}/><span className="mt-1 block text-sm font-black">Quick Invoice</span><span className="block text-[10px] opacity-80">Enter total and payment</span></button>
            </div>
          </div>
        )}

        {mode === "existing" && invoiceStyle === "itemized" && (
          <DetailedInvoice tx={tx} setTx={setTx} invoiceItems={invoiceItems} setInvoiceItems={setInvoiceItems} products={products} setProducts={setProducts} currentStore={currentStore} showToast={showToast} createdAt={isFixing ? undefined : saleDate} />
        )}

        {mode === "existing" && invoiceStyle === "quick" && (
          <div className="space-y-4 rounded-2xl border-2 border-indigo-200 bg-white p-4 shadow-sm dark:border-indigo-900 dark:bg-gray-800">
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle size={19} className="mt-0.5 shrink-0"/><div><p className="text-sm font-bold">Quick invoice — items are not listed</p><p className="mt-0.5 text-xs">This tracks the customer’s payment and balance, but it will not update individual product records.</p></div></div>
            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400">What was bought? <span className="font-normal normal-case">(optional)</span><input value={quickDescription} onChange={event => setQuickDescription(event.target.value)} placeholder="Items not listed" className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"/></label>
            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Invoice total *<div className="relative mt-1.5"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">{currency}</span><input type="text" inputMode="decimal" value={tx.amount} onChange={event => { const value=event.target.value.replace(/[^0-9.]/g, ''); setTx(prev => ({ ...prev, amount: value })); }} placeholder="0.00" className="w-full rounded-xl border-2 border-indigo-200 bg-indigo-50 py-3 pl-14 pr-4 text-right text-2xl font-black text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200"/></div></label>
            <InvoicePayments paid={tx.paid} invoicePayments={tx.invoicePayments} total={parseFloat(tx.amount) || 0} currency={currency} onChange={(paid, invoicePayments) => setTx(prev => ({ ...prev, paid, invoicePayments }))}/>
            <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-3 text-base font-black dark:border-gray-700"><span className="text-gray-700 dark:text-gray-200">Balance remaining</span><span className="text-red-600 dark:text-red-400">{formatCurrency(Math.max(0, (parseFloat(tx.amount)||0) - (Number(tx.paid)||0)), currency)}</span></div>
            <div className="flex justify-between text-xs text-gray-500"><span>Invoice date</span><span>{formatDate(saleDate)}</span></div>
          </div>
        )}

        {mode === "existing" && !isFixing && (
          <section className="space-y-3 rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm dark:border-indigo-900 dark:bg-gray-800" aria-labelledby="pending-credit-title">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><WalletCards size={20}/></div>
                <div>
                  <h2 id="pending-credit-title" className="font-bold text-gray-900 dark:text-white">Customer credit</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{creditLoaded ? `${formatCurrency(totalCreditAvailable, currency)} available` : creditLoadError ? "Credit check failed" : "Checking available credit…"}</p>
                </div>
              </div>
              {creditLoaded && totalCreditAvailable > 0.009 && (
                <button type="button" onClick={() => setShowCreditEditor(value => !value)} className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
                  {pendingCredit > 0 ? "Change credit" : "Apply credit"}
                </button>
              )}
            </div>
            {showCreditEditor && creditLoaded && totalCreditAvailable > 0.009 && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-950/20">
                <label className="block text-xs font-bold uppercase text-indigo-800 dark:text-indigo-300">Credit to apply
                  <div className="relative mt-1.5"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-indigo-600">{currency}</span><input aria-label="Credit to apply" type="text" inputMode="decimal" value={pendingCreditAmount} onChange={event => setPendingCreditAmount(event.target.value.replace(/[^0-9.]/g, ''))} className="w-full rounded-xl border border-indigo-200 bg-white py-3 pl-12 pr-3 text-right text-lg font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:border-indigo-800 dark:bg-gray-900"/></div>
                </label>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-indigo-800 dark:text-indigo-300"><span>Maximum for this invoice</span><strong>{formatCurrency(maxPendingCredit, currency)}</strong></div>
                <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => { setPendingCreditAmount("0"); setShowCreditEditor(false); }} className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300">Remove</button><button type="button" onClick={() => setShowCreditEditor(false)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Apply</button></div>
              </div>
            )}
            {pendingCredit > 0 && (
              <dl className="space-y-2 border-t border-gray-100 pt-3 text-sm dark:border-gray-700">
                <div className="flex justify-between gap-3"><dt className="text-indigo-700 dark:text-indigo-300">Credit to apply</dt><dd className="font-bold text-indigo-700 dark:text-indigo-300">-{formatCurrency(pendingCredit, currency)}</dd></div>
                <div className="flex justify-between gap-3 border-t border-dashed border-gray-200 pt-2 text-base dark:border-gray-700"><dt className="font-bold">Remaining after credit</dt><dd className="font-black text-orange-600 dark:text-orange-400">{formatCurrency(balanceAfterPendingCredit, currency)}</dd></div>
              </dl>
            )}
            {pendingCredit > 0 && <p className="rounded-lg bg-amber-50 p-2.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Pending — credit will be applied oldest first only when this invoice is saved.</p>}
            {creditLoadError && <div className="flex items-center justify-between gap-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300"><span>Could not check customer credit.</span><button type="button" onClick={() => setCreditReloadKey(value => value + 1)} className="font-bold underline">Retry</button></div>}
            {creditLoaded && totalCreditAvailable <= 0.009 && <p className="text-sm text-gray-500 dark:text-gray-400">No customer credit is currently available.</p>}
          </section>
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
