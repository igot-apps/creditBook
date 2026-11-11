import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus, Truck, Check, Loader2, Banknote, Smartphone, CreditCard } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";
import { SupplierService } from "../services/SupplierService";
import { TransactionService } from "../services/TransactionService";
import { AllocationService } from "../services/AllocationService";
import { TopBar } from "../components/TopBar";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const normalizeList = (list) => (Array.isArray(list) ? list : []).map(tx => ({
  ...tx,
  createdAt: tx.created_at || tx.createdAt,
  contactId: tx.contact_id || tx.contactId,
  replacedByTransactionId: tx.replaced_by_transaction_id || tx.replacedByTransactionId,
}));

const isActiveTx = (tx) => tx.status === 'active' || !tx.status;

const METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "momo", label: "MoMo", icon: Smartphone },
  { id: "bank", label: "Bank", icon: CreditCard },
];

export const RecordSupplierPaymentPage = () => {
  const {
    currentStore, setView, prefillTransaction, setPrefillTransaction,
    selectedSupplier: storeSupplier, showToast, readOnly
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
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [history, setHistory] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [amount, setAmount] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const invoicePaymentRequest = useRef(null);

  useEffect(() => {
    if (currentStore?.id) {
      SupplierService.getAll({ fetchAll: true })
        .then(res => setSuppliers(Array.isArray(res) ? res : []))
        .catch(() => setSuppliers([]));
    }
  }, [currentStore?.id]);

  // Auto-select when coming from a supplier profile
  useEffect(() => {
    if (prefillTransaction?.supplierId) {
      setInvoiceId(prefillTransaction.invoiceId || "");
      setSelectedSupplier({
        id: prefillTransaction.supplierId,
        name: prefillTransaction.name || "Unknown",
        phone: prefillTransaction.phone || ""
      });
      setMode("existing");
      setPrefillTransaction(null);
    } else if (storeSupplier?.id && !selectedSupplier) {
      setSelectedSupplier(storeSupplier);
      setMode("existing");
    }
  }, [prefillTransaction, storeSupplier, setPrefillTransaction, selectedSupplier]);

  // Load history + allocations for the selected supplier
  useEffect(() => {
    if (selectedSupplier?.id) {
      Promise.all([
        TransactionService.getHistory(selectedSupplier.id).then(res => normalizeList(res)).catch(() => []),
        AllocationService.getByContact(selectedSupplier.id).catch(() => []),
      ]).then(([h, a]) => { setHistory(h); setAllocations(a); });
    } else {
      setHistory([]);
      setAllocations([]);
    }
  }, [selectedSupplier?.id]);

  // 👇 Open purchases computed LOCALLY — always real numbers
  const openInvoices = useMemo(() => {
    const activePayIds = new Set(
      (Array.isArray(history) ? history : [])
        .filter(t => ['supplier_payment', 'purchase'].includes(t.type) && isActiveTx(t) && !t.replacedByTransactionId)
        .map(t => t.id)
    );
    const map = {};
    (Array.isArray(allocations) ? allocations : []).forEach(a => {
      if (activePayIds.has(a.payment_id) && a.sale_id) {
        map[a.sale_id] = (map[a.sale_id] || 0) + (parseFloat(a.amount) || 0);
      }
    });
    return (Array.isArray(history) ? history : [])
      .filter(tx => tx.type === 'purchase' && isActiveTx(tx) && !tx.replacedByTransactionId)
      .map(tx => {
        const remaining = Math.max(
          0,
          (parseFloat(tx.amount) || 0) - (parseFloat(tx.paid) || 0) - (map[tx.id] || 0)
        );
        return {
          id: tx.id,
          name: "Purchase #" + String(tx.id || "").slice(-6).toUpperCase(),
          remaining: remaining,
          date: tx.created_at || tx.createdAt,
        };
      })
      .filter(x => x.remaining > 0.009)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [history, allocations]);

  const selectedInvoice = openInvoices.find(invoice => invoice.id === invoiceId);

  const filteredSuppliers = useMemo(() => {
    if (!Array.isArray(suppliers)) return [];
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(q) || (s.phone && s.phone.includes(q)));
  }, [suppliers, searchQuery]);

  const handleSelectSupplier = (supplier) => {
    setInvoiceId("");
    setSelectedSupplier(supplier);
    setMode("existing");
    setSearchQuery("");
  };

  const handleCreateSupplier = () => {
    if (blockIfReadOnly()) return;
    const name = searchQuery.trim();
    if (name) {
      SupplierService.addSupplier(currentStore.id, name, "").then(id => {
        setSelectedSupplier({ id: id, name: name, phone: "", balance: 0 });
        setMode("existing");
        setSearchQuery("");
        showToast("✅ Supplier created!");
        SupplierService.getAll({ fetchAll: true }).then(setSuppliers);
      }).catch(() => showToast("❌ Failed to create supplier."));
    }
  };

  const handleSavePayment = async () => {
    if (blockIfReadOnly()) return;
    if (isSaving) return;
    if (!selectedSupplier) { showToast("⚠️ Select a supplier first"); return; }
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) { showToast("⚠️ Enter a payment amount"); return; }
    if (!selectedInvoice) { showToast("Select a purchase invoice"); return; }
    const paymentReference = reference.trim();
    if (method === "momo" && !paymentReference) {
      showToast("Enter the MoMo transaction ID");
      return;
    }
    setIsSaving(true);
    try {
      const key = JSON.stringify([invoiceId, amt, method, paymentReference, note]);
      if (invoicePaymentRequest.current?.key !== key) {
        invoicePaymentRequest.current = { key, id: crypto.randomUUID() };
      }
      await TransactionService.recordInvoicePayment({
        id: invoicePaymentRequest.current.id,
        invoiceId,
        amount: amt,
        method,
        reference: paymentReference,
        note,
      });

      showToast("Payment added to the selected invoice");
      useStore.setState({ selectedSupplier: selectedSupplier });
      setView("supplierProfile");
    } catch (error) {
      console.error(error);
      showToast(error.code === "P0001" ? error.message : "Failed to record payment.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="app-screen min-h-screen bg-gray-50 dark:bg-gray-950">
      <TopBar title="Pay Supplier" showBack={true} onBack={() => setView("supplierProfile")} />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">

        {mode === "search" && (
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Truck size={16} className="text-indigo-600" /> Who are you paying?</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search suppliers..." className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" autoFocus />
            </div>
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {filteredSuppliers.map(s => (
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
                <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase font-bold">Paying to</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{selectedSupplier.name || "Unknown Supplier"}</p>
              </div>
              <button onClick={() => { setMode("search"); setSelectedSupplier(null); }} className="text-xs text-red-600 dark:text-red-400 underline font-semibold px-2 py-1 flex-shrink-0">
                Change
              </button>
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

            <label className="block text-sm font-medium">
              Purchase invoice
              <select value={invoiceId} onChange={e => setInvoiceId(e.target.value)} className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                <option value="">Select an unpaid invoice</option>
                {openInvoices.map(invoice => (
                  <option key={invoice.id} value={invoice.id}>{invoice.name} · {formatDate(invoice.date)} · {formatCurrency(invoice.remaining, currency)} due</option>
                ))}
              </select>
            </label>
            {selectedInvoice && (
              <div className="space-y-2 rounded-xl bg-indigo-50 p-3 text-sm dark:bg-indigo-900/20">
                <div className="flex justify-between"><span>Current balance</span><strong>{formatCurrency(selectedInvoice.remaining, currency)}</strong></div>
                <div className="flex justify-between"><span>Remaining after payment</span><strong>{formatCurrency(Math.max(0, selectedInvoice.remaining - (Number(amount) || 0)), currency)}</strong></div>
                {Number(amount) > selectedInvoice.remaining + 0.009 && (
                  <div className="flex justify-between"><span>Supplier credit added</span><strong>{formatCurrency(Number(amount) - selectedInvoice.remaining, currency)}</strong></div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium">{method === "momo" ? "MoMo transaction ID" : "Payment reference (optional)"}
                <input value={reference} onChange={e => setReference(e.target.value)} className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
              </label>
            </div>
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
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
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
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)..." className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm resize-none" rows="2" />
            </div>

            <button
              onClick={handleSavePayment}
              disabled={isSaving || !selectedInvoice}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg disabled:opacity-60"
            >
              {isSaving ? <><Loader2 className="animate-spin" size={24} /> Saving...</> : <><Check size={24} /> Save Payment</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
