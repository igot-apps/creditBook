import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Users, Check, Loader2, Banknote, Smartphone, CreditCard, Link2, Edit3, RotateCcw } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { CustomerService } from "../services/CustomerService";
import { TransactionService } from "../services/TransactionService";
import { AllocationService } from "../services/AllocationService";
import { TopBar } from "../components/TopBar";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

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
  const [history, setHistory] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
      setSelectedCustomer({
        id: prefillTransaction.customerId,
        name: prefillTransaction.name || "Unknown",
        phone: prefillTransaction.phone || ""
      });
      setMode("existing");
      setPrefillTransaction(null);
    } else if (storeCustomer?.id && !selectedCustomer && !isFixing) {
      setSelectedCustomer(storeCustomer);
      setMode("existing");
    }
  }, [prefillTransaction, storeCustomer, setPrefillTransaction, selectedCustomer, isFixing]);

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
      setMethod(fixTransaction.paymentMethod || "cash");
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
        .filter(t => t.type === 'payment' && isActiveTx(t))
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

  // FIFO preview
  const preview = useMemo(() => {
    let left = parseFloat(amount) || 0;
    const rows = [];
    for (const inv of openInvoices) {
      if (left <= 0) break;
      const apply = Math.min(inv.remaining, left);
      if (apply > 0.009) rows.push({ sale_id: inv.id, name: inv.name, amount: apply });
      left -= apply;
    }
    return { rows, leftover: left };
  }, [openInvoices, amount]);

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
  const handleSavePayment = async () => {
    if (blockIfReadOnly()) return;
    if (isSaving) return;
    if (!selectedCustomer) { showToast("⚠️ Select a customer first"); return; }
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) { showToast("⚠️ Enter a payment amount"); return; }
    setIsSaving(true);
    try {
      let paymentId = null;

      if (isFixing && fixingOldId) {
        // 1) Create the CORRECTED payment, linked to the old one
        paymentId = await TransactionService.create(
          currentStore.id, selectedCustomer.id, 'payment', [], 0, amt, note,
          {
            paymentMethod: method,
            contactName: selectedCustomer.name,
            contactPhone: selectedCustomer.phone,
            correctsTransactionId: fixingOldId,
          }
        );
      } else {
        // Normal payment
        paymentId = await TransactionService.recordPayment(currentStore.id, selectedCustomer.id, amt, note, {
          paymentMethod: method,
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
      showToast("❌ Failed to record payment.");
    } finally {
      setIsSaving(false);
    }
  };

  // 👇 NEW: Undo a correction — restore old, cancel the new one
  const handleUndoFix = async () => {
    if (!undoData) return;
    try {
      await TransactionService.update(undoData.oldId, {
        status: 'active',
        cancelReason: null,
        replacedByTransactionId: null,
      });
      await TransactionService.update(undoData.newId, {
        status: 'cancelled',
        cancelReason: 'Correction undone',
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
  const difference = currentTotal - originalAmount;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title={isFixing ? "Fix Payment" : "Record Payment"} showBack={true} onBack={isFixing ? handleAbortFix : () => setView("profile")} />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">
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
                <button onClick={() => { setMode("search"); setSelectedCustomer(null); }} className="text-xs text-red-600 dark:text-red-400 underline font-semibold px-2 py-1 flex-shrink-0">
                  Change
                </button>
              )}
            </div>
          </div>
        )}

        {mode === "existing" && (
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Payment Amount *</label>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full text-2xl font-bold text-green-700 dark:text-green-400 outline-none bg-transparent border-b border-gray-200 dark:border-gray-700 pb-2 ${noSpinnerClass}`}
                autoFocus
              />
            </div>

            {(parseFloat(amount) || 0) > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase flex items-center gap-1">
                  <Link2 size={11} /> {isFixing ? "Corrected payment will be applied to (oldest first)" : "Payment will be applied to (oldest first)"}
                </p>
                {preview.rows.length === 0 && (
                  <p className="text-xs text-gray-600 dark:text-gray-300">No unpaid invoices — full amount becomes customer credit.</p>
                )}
                {preview.rows.map((a, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-300">{a.name}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(a.amount, currency)}</span>
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

            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
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

            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Note (optional)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)..." className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm resize-none" rows="2" />
            </div>

            <button
              onClick={handleSavePayment}
              disabled={isSaving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg disabled:opacity-60"
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