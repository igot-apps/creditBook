import { useState, useEffect } from "react";
import { Search, ArrowRight, Clock, TrendingUp, TrendingDown, AlertCircle, User, Plus, FileText } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";
import { CustomerService } from "../services/CustomerService";
import { TransactionService } from "../services/TransactionService";
import { TopBar } from "../components/TopBar";
import { UniversalSearchModal } from "../components/UniversalSearchModal";

export const HomePage = () => {
  const { 
    currentStore, setView, autoDraft, clearAutoDraft,
    setSelectedCustomer, setSelectedSupplier, setPrefillTransaction
  } = useStore();

  const [showSearch, setShowSearch] = useState(false);
  const [todayStats, setTodayStats] = useState({ received: 0, purchases: 0, outstanding: 0 });
  const [topDebtors, setTopDebtors] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);

  const currency = currentStore?.currency || "GH₵";
  const ownerName = currentStore?.ownerName || "Shop Owner";

  // 1. Load Dashboard Data
  useEffect(() => {
    const loadData = async () => {
      if (!currentStore?.id) return;
      
      try {
        // Fetch Customers & Transactions in parallel
        const [customers, transactions] = await Promise.all([
          CustomerService.getAll(currentStore.id),
          TransactionService.getAll(currentStore.id)
        ]);

        // Calculate Today's Stats
        const today = new Date().toDateString();
        let received = 0;
        let purchases = 0;
        
        transactions.forEach(tx => {
          if (new Date(tx.date || tx.createdAt).toDateString() === today) {
            if (tx.type === 'sale' || tx.type === 'payment') received += (tx.paid || 0);
            if (tx.type === 'purchase') purchases += (tx.amount || 0);
          }
        });

        // Calculate Outstanding (Total owed to me)
        const outstanding = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);

        setTodayStats({ received, purchases, outstanding });

        // Top Debtors (Follow Ups)
        const debtors = customers
          .filter(c => c.balance > 0)
          .sort((a, b) => b.balance - a.balance)
          .slice(0, 3);
        setTopDebtors(debtors);

        // Recent Customers (Just taking the first 3 for now as a placeholder)
        setRecentCustomers(customers.slice(0, 3));

      } catch (error) {
        console.error("Failed to load dashboard data", error);
      }
    };

    loadData();
  }, [currentStore?.id]);

  // 2. Handle "Continue Working"
  const handleContinueDraft = () => {
    if (!autoDraft) return;
    
    if (autoDraft.draftType === 'sale') {
      setView('record'); // The RecordPage will automatically pick up the autoDraft from the store
    } else if (autoDraft.draftType === 'purchase') {
      setView('recordSupplierPurchase');
    }
  };

  // 3. Handle Quick Actions
  const handleQuickSale = () => {
    setPrefillTransaction(null); // Clear any old prefill
    setView('record');
  };

  const handleQuickPurchase = () => {
    setPrefillTransaction(null);
    setView('recordSupplierPurchase');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Dashboard" />
      
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-5">
        
        {/* 1. GREETING & SEARCH TRIGGER */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{getGreeting()},</p>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{ownerName} 👋</h1>
          </div>
          <button 
            onClick={() => setShowSearch(true)}
            className="w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 shadow-sm active:scale-95 transition"
          >
            <Search size={18} />
          </button>
        </div>

        {/* 2. TODAY'S ACTIVITY (Tiny Stats) */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-xl border border-green-100 dark:border-green-900/30">
            <TrendingUp size={14} className="text-green-600 dark:text-green-400 mb-1" />
            <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold">Received</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{formatCurrency(todayStats.received, currency)}</p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <TrendingDown size={14} className="text-indigo-600 dark:text-indigo-400 mb-1" />
            <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold">Purchases</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{formatCurrency(todayStats.purchases, currency)}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-xl border border-orange-100 dark:border-orange-900/30">
            <AlertCircle size={14} className="text-orange-600 dark:text-orange-400 mb-1" />
            <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold">Outstanding</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{formatCurrency(todayStats.outstanding, currency)}</p>
          </div>
        </div>

        {/* 3. CONTINUE WORKING OR QUICK ACTIONS */}
        {autoDraft ? (
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
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Last edited just now</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-indigo-600 dark:text-indigo-400" />
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleQuickSale}
              className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-2xl shadow-md flex flex-col items-center gap-2 active:scale-95 transition"
            >
              <Plus size={24} />
              <span className="font-bold text-sm">Record Sale</span>
            </button>
            <button 
              onClick={handleQuickPurchase}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl shadow-md flex flex-col items-center gap-2 active:scale-95 transition"
            >
              <FileText size={24} />
              <span className="font-bold text-sm">Record Purchase</span>
            </button>
          </div>
        )}

        {/* 4. RECENT CUSTOMERS (Horizontal Scroll) */}
        {recentCustomers.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2 px-1">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Recent Customers</h3>
              <button onClick={() => setView('customers')} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">View All</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {recentCustomers.map(c => (
                <button 
                  key={c.id}
                  onClick={() => { setSelectedCustomer(c); setView('profile'); }}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16"
                >
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center font-bold text-lg">
                    {c.name.charAt(0)}
                  </div>
                  <p className="text-[10px] font-medium text-gray-700 dark:text-gray-300 truncate w-full text-center">{c.name.split(' ')[0]}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. CUSTOMERS TO FOLLOW UP */}
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
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{c.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{c.phone || "No phone"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{formatCurrency(c.balance, currency)}</p>
                    <p className="text-[9px] text-gray-400">Owes</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Universal Search Modal */}
      <UniversalSearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  );
};