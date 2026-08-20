import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Users, Check, Loader2, Banknote, Smartphone, CreditCard } from "lucide-react";
import useStore from "../store/useStore";
import { CustomerService } from "../services/CustomerService";
import { TransactionService } from "../services/TransactionService";
import { TopBar } from "../components/TopBar";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "momo", label: "MoMo", icon: Smartphone },
  { id: "bank", label: "Bank", icon: CreditCard },
];

export const RecordPaymentPage = () => {
  const {
    currentStore, setView, prefillTransaction, setPrefillTransaction,
    selectedCustomer: storeCustomer, showToast, readOnly
  } = useStore();

  // 👇 VIEW-ONLY GUARD
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
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load customers for the search mode
  useEffect(() => {
    if (currentStore?.id) {
      CustomerService.getAll({ fetchAll: true })
        .then(res => setCustomers(Array.isArray(res) ? res : []))
        .catch(() => setCustomers([]));
    }
  }, [currentStore?.id]);

  // 👇 AUTO-SELECT: coming from a profile means we already know the customer
  useEffect(() => {
    if (prefillTransaction?.customerId) {
      setSelectedCustomer({
        id: prefillTransaction.customerId,
        name: prefillTransaction.name || "Unknown",
        phone: prefillTransaction.phone || ""
      });
      setMode("existing");
      setPrefillTransaction(null);
    } else if (storeCustomer?.id && !selectedCustomer) {
      setSelectedCustomer(storeCustomer);
      setMode("existing");
    }
  }, [prefillTransaction, storeCustomer, setPrefillTransaction, selectedCustomer]);

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

  // 👇 GUARDED: save payment
  const handleSavePayment = async () => {
    if (blockIfReadOnly()) return;
    if (isSaving) return;
    if (!selectedCustomer) { showToast("⚠️ Select a customer first"); return; }
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) { showToast("⚠️ Enter a payment amount"); return; }
    setIsSaving(true);
    try {
      await TransactionService.recordPayment(currentStore.id, selectedCustomer.id, amt, note, {
        paymentMethod: method,
        contactName: selectedCustomer.name,
        contactPhone: selectedCustomer.phone
      });

      // Recalculate the customer's balance from active transactions
      const history = await TransactionService.getHistory(selectedCustomer.id);
      let bal = 0;
      (Array.isArray(history) ? history : []).forEach(t => {
        if (t.status && t.status !== 'active') return;
        const a = parseFloat(t.amount) || 0;
        const p = parseFloat(t.paid) || 0;
        if (t.type === 'sale') bal += a - p;
        else if (t.type === 'payment') bal -= p;
      });
      await CustomerService.updateBalance(selectedCustomer.id, bal);

      showToast("✅ Payment recorded!");
      setStoreSelectedCustomer(selectedCustomer);
      setView("profile");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to record payment.");
    } finally {
      setIsSaving(false);
    }
  };

  // Keep the store setter referenced (used after save)
  const setStoreSelectedCustomer = (c) => useStore.setState({ selectedCustomer: c });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Record Payment" showBack={true} onBack={() => setView("profile")} />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">

        {mode === "search" && (
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Users size={16} className="text-blue-600" /> Who is paying?</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search customers..." className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" autoFocus />
            </div>
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {Array.isArray(filteredCustomers) && filteredCustomers.map(c => (
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
                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold">Receiving payment from</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{selectedCustomer.name || "Unknown Customer"}</p>
              </div>
              <button
                onClick={() => { setMode("search"); setSelectedCustomer(null); }}
                className="text-xs text-red-600 dark:text-red-400 underline font-semibold px-2 py-1 flex-shrink-0"
              >
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
              {isSaving ? <><Loader2 className="animate-spin" size={24} /> Saving...</> : <><Check size={24} /> Save Payment</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};