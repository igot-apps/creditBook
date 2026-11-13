import { DiscardInvoiceModal } from "../components/DiscardInvoiceModal";
import { useState, useEffect } from "react";
import { Search, ArrowRight, Clock, TrendingUp, TrendingDown, AlertCircle, Pause, Trash2, ShoppingCart, Truck, Package, Crown } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";
import { CustomerService } from "../services/CustomerService";
import { TransactionService } from "../services/TransactionService";
import { SuspendedTransactionService } from "../services/SuspendedTransactionService";
import { ProductService } from "../services/ProductService";
import { TopBar } from "../components/TopBar";
import { UniversalSearchModal } from "../components/UniversalSearchModal";

// Helper to format time ago (e.g., "15m ago", "2h ago")
const getTimeAgo = (dateString) => {
  if (!dateString) return "Just now";
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const HomePage = () => {
  const {
    currentStore, setView, autoDraft, showToast,
    setSelectedCustomer, setSelectedSupplier, setPrefillTransaction, setResumedSuspendedId, readOnly
  } = useStore();
  
  const [invoiceToDiscard, setInvoiceToDiscard] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [todayStats, setTodayStats] = useState({ received: 0, purchases: 0, outstanding: 0 });
  const [topDebtors, setTopDebtors] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [suspended, setSuspended] = useState([]);
  const [products, setProducts] = useState([]); // Track products
  const currency = currentStore?.currency || "GH₵";

  // Handle both snake_case (Supabase) and camelCase
  const ownerName = currentStore?.owner_name || currentStore?.ownerName || "Shop Owner";

  // 1. Load Dashboard Data from Supabase
  useEffect(() => {
    const loadData = async () => {
      if (!currentStore?.id) return;
      try {
        // Added ProductService.getAll() to fetch products
        const [customers, transactions, suspendedTx, productsData] = await Promise.all([
          CustomerService.getAll({ fetchAll: true }),
          TransactionService.getAll(),
          SuspendedTransactionService.getSuspendedTransactions(),
          ProductService.getAll()
        ]);

        const validCustomers = Array.isArray(customers) ? customers : [];
        const validTransactions = Array.isArray(transactions) ? transactions : [];
        const validProducts = Array.isArray(productsData) ? productsData : [];
        
        const today = new Date().toDateString();
        let received = 0;
        let purchases = 0;
        
        validTransactions.forEach(tx => {
          const isActive = tx.status === 'active' || !tx.status;
          if (!isActive) return;
          if (new Date(tx.created_at || tx.createdAt).toDateString() === today) {
            if (tx.type === 'sale' || tx.type === 'payment') received += (parseFloat(tx.paid) || 0);
            if (tx.type === 'purchase' || tx.type === 'supplier_payment') purchases += (parseFloat(tx.paid) || 0);
          }
        });

        // Calculate Outstanding (Total owed to me)
        const outstanding = validCustomers.reduce(
          (sum, c) => sum + ((parseFloat(c.balance) || 0) > 0 ? (parseFloat(c.balance) || 0) : 0), 0
        );

        setTodayStats({ received, purchases, outstanding });
        setProducts(validProducts); // Save products to state
        
        const debtors = validCustomers
          .filter(c => (parseFloat(c.balance) || 0) > 0)
          .sort((a, b) => (parseFloat(b.balance) || 0) - (parseFloat(a.balance) || 0))
          .slice(0, 3);
          
        setTopDebtors(debtors);
        setRecentCustomers(validCustomers.slice(0, 5));
        setSuspended(Array.isArray(suspendedTx) ? suspendedTx : []);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      }
    };
    loadData();
  }, [currentStore?.id]);

  // 2. Handle "Continue Working" (Auto-Draft)
  const handleContinueDraft = () => {
    if (!autoDraft) return;
    if (autoDraft.draftType === 'sale') {
      setView('record');
    } else if (autoDraft.draftType === 'purchase') {
      setView('recordSupplierPurchase');
    }
  };

  // 3. Handle Resume Suspended Transaction
  const handleResumeSuspended = (tx) => {
    setResumedSuspendedId(tx.id);
    setView(tx.type === 'sale' ? 'record' : 'recordSupplierPurchase');
  };



  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const startTransaction = (view) => {
    setSelectedCustomer(null);
    setSelectedSupplier(null);
    setPrefillTransaction(null);
    setView(view);
  };

  return (
    <div className="app-screen min-h-screen bg-gray-50 dark:bg-gray-950">
      <TopBar title="Dashboard" />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="mx-auto max-w-lg space-y-5 px-4 sm:max-w-2xl sm:px-6">
        
        {/* 1. GREETING & SEARCH TRIGGER */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{getGreeting()},</p>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{ownerName}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Track who owes you and what you owe.</p>
          </div>
          <button
            onClick={() => setShowSearch(true)}
            aria-label="Search CreditBook"
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <Search size={18} />
          </button>
        </div>

        {readOnly && (
          <button onClick={() => setView("subscription")} className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-left text-white shadow-lg active:scale-[.99] transition flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/20"><Crown size={23}/></span>
            <span className="flex-1"><span className="block text-xs font-bold uppercase tracking-wider text-amber-100">Subscription expired</span><span className="block font-black text-lg">Renew to restore full access</span><span className="block text-xs text-amber-50 mt-0.5">Tap here to view plans and make payment.</span></span>
            <ArrowRight size={22}/>
          </button>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={() => startTransaction("record")} className="flex min-h-20 items-center gap-3 rounded-2xl bg-green-700 px-3 py-3 text-left text-white shadow-sm transition active:scale-[0.98]">
            <ShoppingCart size={22} className="shrink-0" />
            <span><strong className="block text-sm">Sell to customer</strong><span className="mt-0.5 block text-[11px] text-green-100">Track payment or amount due</span></span>
          </button>
          <button onClick={() => startTransaction("recordSupplierPurchase")} className="flex min-h-20 items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-left text-indigo-900 shadow-sm transition active:scale-[0.98] dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-100">
            <Truck size={22} className="shrink-0" />
            <span><strong className="block text-sm">Buy from supplier</strong><span className="mt-0.5 block text-[11px] text-indigo-700 dark:text-indigo-300">Track payment or amount owed</span></span>
          </button>
        </div>

        {/* 2. TODAY'S ACTIVITY (Tiny Stats) */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-xl border border-green-100 dark:border-green-900/30">
            <TrendingUp size={14} className="text-green-600 dark:text-green-400 mb-1" />
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Received today</p>
            <p className="break-words text-sm font-bold tabular-nums text-gray-900 dark:text-white">{formatCurrency(todayStats.received, currency)}</p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <TrendingDown size={14} className="text-indigo-600 dark:text-indigo-400 mb-1" />
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Bought today</p>
            <p className="break-words text-sm font-bold tabular-nums text-gray-900 dark:text-white">{formatCurrency(todayStats.purchases, currency)}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-xl border border-orange-100 dark:border-orange-900/30">
            <AlertCircle size={14} className="text-orange-600 dark:text-orange-400 mb-1" />
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Outstanding</p>
            <p className="break-words text-sm font-bold tabular-nums text-gray-900 dark:text-white">{formatCurrency(todayStats.outstanding, currency)}</p>
          </div>
        </div>

        {/* 3. CONTINUE WORKING (Auto-Draft) */}
        {autoDraft && (
          <button
            onClick={handleContinueDraft}
            className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 shadow-sm flex items-center justify-between active:scale-[0.98] transition"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Continue Working</p>
                <p className="font-bold text-gray-900 dark:text-white text-sm">
                  {autoDraft.draftType === 'sale' ? 'Draft Sale' : 'Draft Purchase'}
                </p>
                {autoDraft.updatedAt && <p className="text-xs text-gray-500 dark:text-gray-400">Edited {getTimeAgo(autoDraft.updatedAt).toLowerCase()}</p>}
              </div>
            </div>
            <ArrowRight size={20} className="text-indigo-600 dark:text-indigo-400" />
          </button>
        )}

        {/* 4. SUSPENDED TRANSACTIONS SECTION (Resume + Discard) */}
        {suspended.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Pause size={14} className="text-orange-500" /> Suspended ({suspended.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {suspended.map(tx => (
                <div key={tx.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'sale' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      {tx.type === 'sale' ? <ShoppingCart size={16} /> : <Truck size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {tx.type === 'sale' ? 'Sale' : 'Purchase'} • {tx.contactName || "Unknown"}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {tx.items?.length || 0} items • {tx.type === 'sale' ? formatDate(tx.createdAt) : getTimeAgo(tx.createdAt || tx.created_at)}
                      </p>
                      {tx.type === 'sale' && (
                        <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-600 dark:text-gray-300">
                          <span>Paid {formatCurrency(tx.paid, currency)}</span>
                          {(Number(tx.pendingCreditAmount) || 0) > 0 && <span className="font-semibold text-indigo-600 dark:text-indigo-400">Credit pending {formatCurrency(tx.pendingCreditAmount, currency)}</span>}
                          <span className="font-semibold">Remaining {formatCurrency(Math.max(0, (Number(tx.amount) || 0) - (Number(tx.paid) || 0) - (Number(tx.pendingCreditAmount) || 0)), currency)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleResumeSuspended(tx)}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg active:scale-95 transition"
                    >
                      Resume
                    </button>
                    <button
                      onClick={() => setInvoiceToDiscard({ ...tx, type: tx.type === "sale" ? "sale" : "purchase" })}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg active:scale-95 transition"
                      title="Delete suspended invoice"
                      aria-label={`Delete suspended invoice for ${tx.contactName || "unknown contact"}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. QUICK ACTIONS (Only shows "Add Products" if you have zero products) */}
        {products.length === 0 && (
          <button
            onClick={() => setView('products')}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-5 rounded-2xl shadow-md flex flex-col items-center gap-2 active:scale-95 transition"
          >
            <Package size={28} />
            <span className="font-bold text-base">Add Products</span>
            <span className="text-[10px] font-medium opacity-90">You need products to record sales</span>
          </button>
        )}

        {/* 6. RECENT CUSTOMERS (Horizontal Scroll) */}
        {recentCustomers.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2 px-1">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Recent Customers</h3>
              <button onClick={() => setView('customers')} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">View All</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recentCustomers.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCustomer(c); setView('profile'); }}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16"
                >
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center font-bold text-lg">
                    {(c.name || "?").charAt(0)}
                  </div>
                  <p className="text-[10px] font-medium text-gray-700 dark:text-gray-300 truncate w-full text-center">{(c.name || "Unknown").split(' ')[0]}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 7. CUSTOMERS TO FOLLOW UP */}
        {topDebtors.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <AlertCircle size={14} className="text-orange-500" /> Follow Ups
              </h3>
              <button onClick={() => setView('customers')} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">View All</button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {topDebtors.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCustomer(c); setView('profile'); }}
                  className="w-full flex items-center justify-between p-3 active:bg-gray-50 dark:active:bg-gray-700/50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center text-xs font-bold">
                      {(c.name || "?").charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{c.name || "Unknown"}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{c.phone || "No phone"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{formatCurrency(c.balance || 0, currency)}</p>
                    <p className="text-[9px] text-gray-400">Owes</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Universal Search Modal */}
      <DiscardInvoiceModal invoice={invoiceToDiscard} onClose={() => setInvoiceToDiscard(null)} onDiscarded={invoice => {
        setSuspended(list => list.filter(entry => entry.id !== invoice.id));
        setInvoiceToDiscard(null);
      }} />
      <UniversalSearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  );
};
