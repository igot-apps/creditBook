import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus, Users, Check, Loader2, Banknote, Smartphone, CreditCard, Link2, Edit3, RotateCcw } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";
import { CustomerService } from "../services/CustomerService";
import { TransactionService } from "../services/TransactionService";
import { AllocationService } from "../services/AllocationService";
import { TopBar } from "../components/TopBar";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const toLocalDateTime = (value = new Date()) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const normalizeList = (list) => (Array.isArray(list) ? list : []).map(tx => ({
  ...tx,
  createdAt: tx.created_at || tx.createdAt,
  contactId: tx.contact_id || tx.contactId,
  replacedByTransactionId: tx.replaced_by_transaction_id || tx.replacedByTransactionId,
  correctsTransactionId: tx.corrects_transaction_id || tx.correctsTransactionId,
  paymentMethod: tx.payment_method || tx.paymentMethod,
}));
const isActiveTx = (tx) => tx.status === 'active' || !tx.status;
const isLive = (tx) => isActiveTx(tx) && !tx.replacedByTransactionId;

// Customer-level aggregate balance (single source of truth)
const recomputeBalance = (list) => {
  let bal = 0;
  (Array.isArray(list) ? list : []).forEach(t => {
    if (!isLive(t)) return;
    const a = parseFloat(t.amount) || 0;
    const p = parseFloat(t.paid) || 0;
    if (t.type === 'sale') bal += a - p;
    else if (t.type === 'payment') bal -= p;
  });
  return bal;
};

const METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "momo", label: "MoMo", icon: Smartphone },
  { id: "bank", label: "Bank", icon: CreditCard },
];

export const RecordPaymentPage = () => {
  const {
    currentStore, setView, prefillTransaction, setPrefillTransaction,
    selectedCustomer: storeCustomer, showToast, readOnly,
    fixTransaction, setFixTransaction
  } = useStore();
  const currency = currentStore?.currency || "GH₵";

  const blockIfReadOnly = () => {
    if (readOnly) {
      showToast("🔒 Subscription expired — please renew to continue.");
      return true;
    }
    return false;
  };

  const [mode, setMode] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isChangingCustomer, setIsChangingCustomer] = useState(false);
  const [history, setHistory] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [amount, setAmount] = useState("");
  const [invoiceId, setInvoiceId] = useState(null);
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [duplicatePayment, setDuplicatePayment] = useState(null);
  const [isCheckingReference, setIsCheckingReference] = useState(false);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const invoicePaymentRequest = useRef(null);

  // 👇 NEW: Fix/correction state
  const [isFixing, setIsFixing] = useState(false);
  const [fixingOldId, setFixingOldId] = useState(null);
  const [originalAmount, setOriginalAmount] = useState(0);
  const [fixReason, setFixReason] = useState("");
  const [undoData, setUndoData] = useState(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  useEffect(() => {
    if (currentStore?.id) {
      CustomerService.getAll({ fetchAll: true })
        .then(res => setCustomers(Array.isArray(res) ? res : []))
        .catch(() => setCustomers([]));
    }
  }, [currentStore?.id]);

  // Auto-select when coming from a profile
  useEffect(() => {
    if (prefillTransaction?.customerId) {
      setInvoiceId(prefillTransaction.invoiceId || null);
      setSelectedCustomer({
        id: prefillTransaction.customerId,
        name: prefillTransaction.name || "Unknown",
        phone: prefillTransaction.phone || ""
      });
      setMode("existing");
      setPrefillTransaction(null);
    } else if (storeCustomer?.id && !selectedCustomer && !isFixing && !isChangingCustomer) {
      setSelectedCustomer(storeCustomer);
      setMode("existing");
    }
  }, [prefillTransaction, storeCustomer, setPrefillTransaction, selectedCustomer, isFixing, isChangingCustomer]);

  // Load history + allocations for the selected customer
  const reloadHistory = async (contactId) => {
    const [h, a] = await Promise.all([
      TransactionService.getHistory(contactId).then(res => normalizeList(res)).catch(() => []),
      AllocationService.getByContact(contactId).catch(() => []),
    ]);
    setHistory(h);
    setAllocations(a);
    return h;
  };

  useEffect(() => {
    if (selectedCustomer?.id) {
      reloadHistory(selectedCustomer.id);
    } else {
      setHistory([]);
      setAllocations([]);
    }
  }, [selectedCustomer?.id]);

  // ==========================================
  // 👇 NEW: FIX MODE — consume fixTransaction for payments
  // ==========================================
  useEffect(() => {
    if (!fixTransaction || !fixTransaction.id || fixTransaction.type !== 'payment') return;
    const contactId = fixTransaction.contact_id || fixTransaction.contactId;
    const startFix = (customer) => {
      setSelectedCustomer(customer);
      setMode("existing");
      setAmount((parseFloat(fixTransaction.paid) || 0).toString());
      setMethod(fixTransaction.paymentMethod || fixTransaction.payment_method || "cash");
      setReference(fixTransaction.reference || "");
      setReceivedAt(toLocalDateTime(fixTransaction.received_at || fixTransaction.created_at || fixTransaction.createdAt));
      setNote(fixTransaction.note || "");
      setOriginalAmount(parseFloat(fixTransaction.paid) || 0);
      setFixReason(fixTransaction.fixReason || "");
      setIsFixing(true);
      setFixingOldId(fixTransaction.id);
      // Mark old payment as being corrected → its allocations stop counting while editing
      TransactionService.update(fixTransaction.id, { status: 'being_corrected' })
        .then(() => reloadHistory(customer.id))
        .catch(() => {});
      setFixTransaction(null);
    };
    if (contactId) {
      CustomerService.getById(contactId)
        .then(c => startFix(c || { id: contactId, name: "Unknown Customer", phone: "" }))
        .catch(() => startFix({ id: contactId, name: "Unknown Customer", phone: "" }));
    } else {
      startFix({ id: null, name: "Unknown Customer", phone: "" });
    }
  }, [fixTransaction, setFixTransaction]);

  const handleAbortFix = async () => {
    if (fixingOldId) {
      await TransactionService.update(fixingOldId, { status: 'active' }).catch(() => {});
    }
    setIsFixing(false);
    setFixingOldId(null);
    setFixReason("");
    setMode("search");
    setSelectedCustomer(null);
    setAmount("");
    setNote("");
    setView("profile");
  };

  // ==========================================
  // Open invoices (orphan-proof: payment active AND sale live)
  // ==========================================
  const openInvoices = useMemo(() => {
    const activePayIds = new Set(
      (Array.isArray(history) ? history : [])
        .filter(t => ['payment', 'sale'].includes(t.type) && isLive(t))
        .map(t => t.id)
    );
    const liveSaleIds = new Set(
      (Array.isArray(history) ? history : [])
        .filter(t => t.type === 'sale' && isActiveTx(t) && !t.replacedByTransactionId)
        .map(t => t.id)
    );
    const map = {};
    (Array.isArray(allocations) ? allocations : []).forEach(a => {
      if (activePayIds.has(a.payment_id) && liveSaleIds.has(a.sale_id)) {
        map[a.sale_id] = (map[a.sale_id] || 0) + (parseFloat(a.amount) || 0);
      }
    });
    return (Array.isArray(history) ? history : [])
      .filter(tx => tx.type === 'sale' && isActiveTx(tx) && !tx.replacedByTransactionId)
      .map(tx => ({
        id: tx.id,
        name: "Sale #" + String(tx.id || "").slice(-6).toUpperCase(),
        remaining: Math.max(0, (parseFloat(tx.amount) || 0) - (parseFloat(tx.paid) || 0) - (map[tx.id] || 0)),
        date: tx.created_at || tx.createdAt,
      }))
      .filter(x => x.remaining > 0.009)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [history, allocations]);

  const selectedInvoice = openInvoices.find(invoice => invoice.id === invoiceId);

  // FIFO preview for account payments, or allocate directly to a selected invoice.
  const preview = useMemo(() => {
    let left = parseFloat(amount) || 0;
    const rows = [];
    const invoices = invoiceId ? openInvoices.filter(invoice => invoice.id === invoiceId) : openInvoices;
    for (const inv of invoices) {
      if (left <= 0) break;
      const apply = Math.min(inv.remaining, left);
      if (apply > 0.009) rows.push({ sale_id: inv.id, name: inv.name, amount: apply, remaining: inv.remaining - apply });
      left -= apply;
    }
    return { rows, leftover: left };
  }, [openInvoices, amount, invoiceId]);

  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
  }, [customers]);

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setMode("existing");
    setSearchQuery("");
  };

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

  // ==========================================
  // SAVE (normal + correction)
  // ==========================================
  const checkMomoReference = async (paymentReference) => {
    const payment = await TransactionService.findMomoPayment(currentStore.id, paymentReference);
    if (!payment) return false;
    const customer = customers.find(c => c.id === payment.contact_id);
    setDuplicatePayment({
      customer: customer?.name || "Customer on the existing payment",
      amount: payment.paid,
      date: payment.received_at || payment.created_at,
    });
    return true;
  };

  const handleCheckMomoReference = async () => {
    setIsCheckingReference(true);
    setDuplicatePayment(null);
    try {
      if (!await checkMomoReference(reference.trim().toUpperCase())) {
        showToast("No recorded payment with that MoMo transaction ID");
      }
    } catch (error) {
      console.error(error);
      showToast("Could not check the MoMo transaction ID");
    } finally {
      setIsCheckingReference(false);
    }
  };

  const handleSavePayment = async () => {
    if (blockIfReadOnly()) return;
    if (isSaving || isCheckingReference) return;
    if (!selectedCustomer) { showToast("⚠️ Select a customer first"); return; }
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) { showToast("⚠️ Enter a payment amount"); return; }
    if (invoiceId && !selectedInvoice) {
      showToast("This invoice no longer has a balance to pay");
      return;
    }
    const paymentReference = method === "momo" ? reference.trim().toUpperCase() : null;
    if (method === "momo" && !paymentReference) {
      showToast("Enter the MoMo transaction ID");
      return;
    }
    const invoice = history.find(tx => tx.id === invoiceId);
    if (paymentReference && invoice?.invoice_payments?.some(payment => payment.reference === paymentReference)) {
      showToast("This reference is already on the invoice");
      return;
    }
    const paymentDate = receivedAt ? new Date(receivedAt) : new Date();
    if (!Number.isFinite(paymentDate.getTime()) || paymentDate > new Date()) {
      showToast("Enter a valid payment date and time");
      return;
    }
    setIsSaving(true);
    setDuplicatePayment(null);
    try {
      const paymentDetails = {
        paymentMethod: method,
        reference: paymentReference || (method !== "momo" ? reference.trim() : null),
        receivedAt: paymentDate.toISOString(),
      };
      if (invoiceId && !isFixing) {
        const key = JSON.stringify([invoiceId, amt, method, paymentDetails.reference, note, receivedAt]);
        if (invoicePaymentRequest.current?.key !== key) {
          invoicePaymentRequest.current = { key, id: crypto.randomUUID() };
        }
        await TransactionService.recordInvoicePayment({
          id: invoicePaymentRequest.current.id,
          invoiceId,
          amount: amt,
          method,
          reference: paymentDetails.reference,
          note,
          receivedAt: paymentDetails.receivedAt,
        });
        showToast("Payment added to the selected invoice");
        useStore.setState({ selectedCustomer });
        setView("profile");
        return;
      }

      if (paymentReference && await checkMomoReference(paymentReference)) return;
      let paymentId = null;

      if (isFixing && fixingOldId) {
        // 1) Create the CORRECTED payment, linked to the old one
        paymentId = await TransactionService.create(
          currentStore.id, selectedCustomer.id, 'payment', [], 0, amt, note,
          {
            ...paymentDetails,
            contactName: selectedCustomer.name,
            contactPhone: selectedCustomer.phone,
            correctsTransactionId: fixingOldId,
          }
        );
      } else {
        // Normal payment
        paymentId = await TransactionService.recordPayment(currentStore.id, selectedCustomer.id, amt, note, {
          ...paymentDetails,
          contactName: selectedCustomer.name,
          contactPhone: selectedCustomer.phone,
        });
        // Safety net: if no id came back, recover it so allocations are never skipped
        if (!paymentId) {
          const fresh = normalizeList(await TransactionService.getHistory(selectedCustomer.id));
          const candidate = fresh
            .filter(t => t.type === 'payment' && isActiveTx(t) && !(t.note || '').startsWith('[FORGIVEN]') && Math.abs((parseFloat(t.paid) || 0) - amt) <= 0.009)
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
          paymentId = candidate ? candidate.id : null;
        }
      }

      // 2) Persist FIFO allocations (upsert — can never duplicate)
      if (paymentId && preview.rows.length > 0) {
        await AllocationService.createMany(
          preview.rows.map(r => ({
            payment_id: paymentId,
            sale_id: r.sale_id,
            contact_id: selectedCustomer.id,
            amount: r.amount,
          }))
        );
      }

      // 3) For corrections: retire the OLD payment (its allocations auto-invalidate)
      if (isFixing && fixingOldId) {
        await TransactionService.update(fixingOldId, {
          status: 'cancelled',
          replacedByTransactionId: paymentId,
          cancelReason: `Replaced by corrected payment${fixReason ? ` — ${fixReason}` : ""}`,
        });
        setUndoData({ newId: paymentId, oldId: fixingOldId, customerId: selectedCustomer.id });
        setShowUndoToast(true);
        setTimeout(() => { setShowUndoToast(false); setUndoData(null); }, 10000);
      }

      // 4) Recalculate aggregate balance
      const fresh = normalizeList(await TransactionService.getHistory(selectedCustomer.id));
      await CustomerService.updateBalance(selectedCustomer.id, recomputeBalance(fresh));

      showToast(isFixing ? "✅ Payment corrected!" : "✅ Payment recorded & applied to invoices!");
      useStore.setState({ selectedCustomer: selectedCustomer });
      setView("profile");
    } catch (error) {
      console.error(error);
      if (error.code === '23505' && paymentReference) {
        const found = await checkMomoReference(paymentReference).catch(() => false);
        if (!found) showToast("This MoMo transaction ID is already recorded");
      } else {
        showToast("❌ Failed to record payment.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 👇 NEW: Undo a correction — restore old, cancel the new one
  const handleUndoFix = async () => {
    if (!undoData) return;
    try {
      await TransactionService.update(undoData.newId, {
        status: 'cancelled',
        cancelReason: 'Correction undone',
      });
      await TransactionService.update(undoData.oldId, {
        status: 'active',
        cancelReason: null,
        replacedByTransactionId: null,
      });
      const fresh = normalizeList(await TransactionService.getHistory(undoData.customerId));
      await CustomerService.updateBalance(undoData.customerId, recomputeBalance(fresh));
      setShowUndoToast(false);
      setUndoData(null);
      showToast("✅ Correction undone.");
      setView("profile");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to undo.");
    }
  };

  const currentTotal = parseFloat(amount) || 0;
  const invoiceBalance = invoiceId
    ? selectedInvoice?.remaining || 0
    : openInvoices.reduce((sum, invoice) => sum + invoice.remaining, 0);
  const appliedAmount = preview.rows.reduce((sum, row) => sum + row.amount, 0);
  const remainingAfterPayment = Math.max(0, invoiceBalance - appliedAmount);
  const difference = currentTotal - originalAmount;

  return (
    <div className="app-screen min-h-screen bg-gray-50 dark:bg-gray-950">
      <TopBar title={isFixing ? "Fix Payment" : "Record Payment"} showBack={true} onBack={isFixing ? handleAbortFix : () => setView("profile")} />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="mx-auto max-w-lg space-y-4 px-4 md:max-w-5xl md:space-y-5 md:px-8">
        {/* 👇 NEW: correction banner */}
        {isFixing && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-3 rounded-r-xl shadow-sm">
            <p className="text-[10px] font-bold text-yellow-800 dark:text-yellow-400 uppercase tracking-wider mb-1">Correcting Previous Payment</p>
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
          </div>
        )}

        {mode === "search" && (
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Users size={16} className="text-blue-600" /> Who is paying?</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search customers..." className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" autoFocus />
            </div>
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {filteredCustomers.map(c => (
                <button key={c.id} onClick={() => handleSelectCustomer(c)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">{(c.name || "?").charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.phone || "No phone"}</p>
                  </div>
                </button>
              ))}
              {searchQuery.trim() && filteredCustomers.length === 0 && (
                <button onClick={handleCreateCustomer} className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 transition text-left">
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
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-900/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                {(selectedCustomer.name || "?").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold">{isFixing ? "Correcting payment for" : "Receiving payment from"}</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{selectedCustomer.name || "Unknown Customer"}</p>
              </div>
              {!isFixing && (
                <button onClick={() => { setIsChangingCustomer(true); setMode("search"); setSelectedCustomer(null); setInvoiceId(null); }} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950">
                  Change
                </button>
              )}
            </div>
          </div>
        )}

        {mode === "existing" && (
          <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] md:items-start md:gap-x-6">
            <div className="min-w-0 space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:p-6">
              {invoiceId && <p className="text-sm font-semibold">Payment for {selectedInvoice?.name || "selected invoice"}</p>}
              <div>
                <label htmlFor="payment-amount" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">Payment amount</label>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:focus-within:ring-blue-900">
                <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">{currency}</span>
                <input
                  id="payment-amount"
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`min-w-0 w-full bg-transparent py-3 text-2xl font-bold tabular-nums text-gray-900 outline-none dark:text-white ${noSpinnerClass}`}
                  autoFocus
                />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {METHODS.map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        aria-pressed={method === m.id}
                        onClick={() => { if (method !== m.id) setReference(""); setMethod(m.id); setDuplicatePayment(null); }}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition ${
                          method === m.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <Icon size={18} />
                        <span className="text-xs font-bold">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {method === "momo" && (
                <div>
                  <label htmlFor="momo-reference" className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">MoMo transaction ID *</label>
                  <input
                    id="momo-reference"
                    value={reference}
                    onChange={e => { setReference(e.target.value); setDuplicatePayment(null); }}
                    autoComplete="off"
                    disabled={isCheckingReference || isSaving}
                    spellCheck={false}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl dark:text-white"
                  />
                  <button type="button" onClick={handleCheckMomoReference} disabled={!reference.trim() || isCheckingReference || isSaving} className="mt-2 text-sm font-semibold text-blue-700 dark:text-blue-400 disabled:opacity-50">
                    {isCheckingReference ? "Checking…" : "Look up transaction ID"}
                  </button>
                  {duplicatePayment && (
                    <p role="alert" className="mt-2 text-sm text-amber-800 dark:text-amber-300">
                      Already recorded for {duplicatePayment.customer} · {formatCurrency(duplicatePayment.amount, currency)} · {formatDate(duplicatePayment.date)}
                    </p>
                  )}
                </div>
              )}
              {method !== "momo" && (
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">
                  Payment reference (optional)
                  <input value={reference} onChange={e => setReference(e.target.value)} className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                </label>
              )}

              <div>
                <label htmlFor="payment-received-at" className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Date and time received</label>
                <input
                  id="payment-received-at"
                  type="datetime-local"
                  value={receivedAt || toLocalDateTime()}
                  max={toLocalDateTime()}
                  onChange={e => setReceivedAt(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Note (optional)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)..." className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm resize-none" rows="2" />
              </div>
            </div>

            <aside className="min-w-0 space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:col-start-2 md:row-span-2 md:row-start-1 md:p-6" aria-labelledby="payment-summary-title">
              <h2 id="payment-summary-title" className="font-bold text-gray-900 dark:text-white">Payment summary</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600 dark:text-gray-300">Invoice balance</dt>
                  <dd className="font-semibold tabular-nums">{formatCurrency(invoiceBalance, currency)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                  <dt className="font-semibold">Remaining after payment</dt>
                  <dd className="font-bold tabular-nums">{formatCurrency(remainingAfterPayment, currency)}</dd>
                </div>
              </dl>
            {(parseFloat(amount) || 0) > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase flex items-center gap-1">
                  <Link2 size={11} /> {invoiceId ? "Payment for selected invoice" : "Payment will be applied oldest first"}
                </p>
                {preview.rows.length === 0 && !invoiceId && (
                  <p className="text-xs text-gray-600 dark:text-gray-300">No unpaid invoices — full amount becomes customer credit.</p>
                )}
                {preview.rows.map((a, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-300">{a.name}</span>
                    <span className="text-right text-gray-900 dark:text-white">
                      <strong>{formatCurrency(a.amount, currency)} applied</strong>
                      <span className="block text-gray-500 dark:text-gray-400">{formatCurrency(a.remaining, currency)} remaining</span>
                    </span>
                  </div>
                ))}
                {preview.leftover > 0.009 && (
                  <div className="flex justify-between text-xs pt-1 border-t border-blue-100 dark:border-blue-900/30">
                    <span className="text-gray-600 dark:text-gray-300">Left as customer credit</span>
                    <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(preview.leftover, currency)}</span>
                  </div>
                )}
              </div>
            )}
            </aside>

            <button
              onClick={handleSavePayment}
              disabled={isSaving || isCheckingReference}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 md:col-start-1 md:w-auto md:justify-self-end"
            >
              {isSaving ? <><Loader2 className="animate-spin" size={24} /> Saving...</> : isFixing ? <><Edit3 size={24} /> Save Corrected Payment</> : <><Check size={24} /> Save Payment</>}
            </button>
          </div>
        )}
      </div>

      {/* 👇 NEW: Undo correction toast */}
      {showUndoToast && (
        <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-4 rounded-xl shadow-2xl flex items-center justify-between z-[200] animate-in slide-in-from-bottom-5">
          <div>
            <p className="font-bold text-sm">Payment corrected successfully!</p>
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
