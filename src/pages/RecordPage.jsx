import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Users, FileText, Check } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { CustomerService } from "../services/CustomerService";
import { ProductService } from "../services/ProductService";
import { DetailedInvoice } from "../components/DetailedInvoice";
import { TopBar } from "../components/TopBar";

export const RecordPage = () => {
  const { currentStore, setView, showToast, autoDraft, saveDraft, clearAutoDraft } = useStore();
  const currency = currentStore?.currency || "GH₵";

  const [mode, setMode] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [tx, setTx] = useState({ amount: "0", paid: "", discount: "", note: "" });

  // 1. Load Data
  useEffect(() => {
    if (currentStore?.id) {
      CustomerService.getAll(currentStore.id)
        .then(res => setCustomers(Array.isArray(res) ? res : []))
        .catch(() => setCustomers([]));
      ProductService.getAll(currentStore.id)
        .then(res => setProducts(Array.isArray(res) ? res : []))
        .catch(() => setProducts([]));
    }
  }, [currentStore?.id]);

  // 2. Restore Auto-Draft on Mount
  useEffect(() => {
    if (autoDraft && autoDraft.customerId && mode === "search") {
      const draftCustomer = customers.find(c => c.id === autoDraft.customerId);
      if (draftCustomer) {
        setSelectedCustomer(draftCustomer);
        setMode("existing");
        setInvoiceItems(autoDraft.invoiceItems || []);
        setTx(autoDraft.tx || { amount: "0", paid: "", discount: "", note: "" });
        showToast("📝 Draft restored!");
      }
    }
  }, [autoDraft, customers, mode]);

  // 3. Auto-Save Draft on Change (Debounced implicitly by React batching, safe for IndexedDB)
  useEffect(() => {
    if (mode === "existing" && selectedCustomer && (invoiceItems.length > 0 || tx.paid || tx.note)) {
      const draftData = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        invoiceItems,
        tx
      };
      // Save silently in the background
      saveDraft(draftData, true); 
    }
  }, [invoiceItems, tx, selectedCustomer, mode, saveDraft]);

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

  const handleCreateCustomer = () => {
    const name = searchQuery.trim();
    if (name) {
      CustomerService.addCustomer(currentStore.id, name, "")
        .then(id => {
          const newCustomer = { id, name, phone: "", balance: 0 };
          setSelectedCustomer(newCustomer);
          setMode("existing");
          setSearchQuery("");
          showToast("✅ Customer created!");
          CustomerService.getAll(currentStore.id).then(setCustomers);
        })
        .catch(() => showToast("❌ Failed to create customer."));
    }
  };

  const handleSaveInvoice = async () => {
    if (!selectedCustomer) return;
    const finalAmount = parseFloat(tx.amount) || 0;
    const finalPaid = parseFloat(tx.paid) || 0;

    if (finalAmount === 0 && finalPaid === 0 && !tx.note.trim() && invoiceItems.length === 0) {
      showToast("⚠️ Please add items, a payment amount, or a note.");
      return;
    }

    try {
      await CustomerService.addTransaction(
        currentStore.id,
        selectedCustomer.id,
        finalAmount,
        finalPaid,
        invoiceItems,
        tx.note
      );
      
      // 👇 Clear the auto-draft on success
      await clearAutoDraft();
      
      showToast("✅ Sale recorded!");
      setView("customers");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to record sale.");
    }
  };

  // Clear draft if user explicitly cancels/changes customer
  const handleReset = () => {
    clearAutoDraft();
    setMode("search");
    setSelectedCustomer(null);
    setInvoiceItems([]);
    setTx({ amount: "0", paid: "", discount: "", note: "" });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Record Sale" showBack={true} onBack={() => { handleReset(); setView("customers"); }} />
      
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">
        
        {mode === "search" && (
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Users size={16} className="text-green-600" /> Select Customer
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search customers..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                autoFocus
              />
            </div>
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {Array.isArray(filteredCustomers) && filteredCustomers.map(c => (
                <button key={c.id} onClick={() => handleSelectCustomer(c)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.phone || "No phone"}</p>
                  </div>
                  {c.balance > 0 && (
                    <p className="text-xs font-bold text-orange-600 dark:text-orange-400">
                      Owes: {formatCurrency(c.balance, currency)}
                    </p>
                  )}
                </button>
              ))}
              {searchQuery.trim() && filteredCustomers.length === 0 && (
                <button onClick={handleCreateCustomer} className="w-full flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 transition text-left">
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
                {selectedCustomer.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-600 dark:text-green-400 uppercase font-bold">Selling to</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{selectedCustomer.name}</p>
              </div>
              <button onClick={handleReset} className="text-xs text-red-600 dark:text-red-400 underline font-semibold px-2 py-1 flex-shrink-0">Change</button>
            </div>
          </div>
        )}

        {mode === "existing" && (
          <DetailedInvoice 
            tx={tx} 
            setTx={setTx} 
            invoiceItems={invoiceItems} 
            setInvoiceItems={setInvoiceItems} 
            products={products} 
            currentStore={currentStore} 
            showToast={showToast} 
          />
        )}

        {mode === "existing" && (
          <button 
            onClick={handleSaveInvoice}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg"
          >
            <Check size={24} /> Save Sale
          </button>
        )}
      </div>
    </div>
  );
};