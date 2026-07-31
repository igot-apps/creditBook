import { useMemo } from "react";
import { TrendingUp, Banknote, CreditCard, Users, AlertCircle, Plus, ArrowRight } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";

export const HomePage = () => {
  const { currentStore, customers, setView, setSelectedCustomer } = useStore();

  // 1. Calculate "Today's Work" and Overall Stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    let todaySales = 0;
    let collectedToday = 0;
    let totalOutstanding = 0;
    let activeCustomers = 0;

    customers.forEach(c => {
      if (!c.isArchived) {
        activeCustomers++;
        if (c.balance > 0) totalOutstanding += c.balance;

        c.history.forEach(tx => {
          if (!tx.isVoid && new Date(tx.date).toDateString() === today) {
            todaySales += (tx.amount || 0);
            collectedToday += (tx.paid || 0);
          }
        });
      }
    });

    const creditGivenToday = Math.max(0, todaySales - collectedToday);

    return { todaySales, collectedToday, creditGivenToday, totalOutstanding, activeCustomers };
  }, [customers]);

  // 2. Get Top 5 Debtors for quick follow-ups
  const topDebtors = useMemo(() => {
    return customers
      .filter(c => !c.isArchived && c.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);
  }, [customers]);

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
    setView("profile");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="bg-green-700 dark:bg-gray-900 text-white p-6 pb-8 rounded-b-[2rem] shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-green-100 text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold">{currentStore?.name || "Business Owner"}</h1>
          </div>
          <button 
            onClick={() => setView("record")}
            className="bg-white text-green-700 p-3 rounded-full shadow-lg active:scale-95 transition"
          >
            <Plus size={24} />
          </button>
        </div>
        <p className="text-green-100 text-xs mt-4">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6 -mt-4">
        
        {/* 👇 HERO SECTION: TODAY'S WORK */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-green-600 dark:text-green-400" />
            <h2 className="font-bold text-gray-900 dark:text-white">Today's Work</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {/* Today's Sales */}
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800/30 text-center">
              <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase mb-1">Sales</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight break-words">{formatCurrency(stats.todaySales)}</p>
            </div>
            
            {/* Collected Today */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/30 text-center">
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Collected</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight break-words">{formatCurrency(stats.collectedToday)}</p>
            </div>
            
            {/* Credit Given Today */}
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-800/30 text-center">
              <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase mb-1">Credit Given</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight break-words">{formatCurrency(stats.creditGivenToday)}</p>
            </div>
          </div>
        </div>

        {/* 👇 SECONDARY SECTION: OVERALL BUSINESS HEALTH */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-red-500" />
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Outstanding</p>
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.totalOutstanding)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-gray-500" />
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Customers</p>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.activeCustomers}</p>
          </div>
        </div>

        {/* 👇 TERTIARY SECTION: TOP DEBTORS (Actionable Intelligence) */}
        {topDebtors.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertCircle size={16} className="text-orange-500" /> Top Debtors
              </h3>
              <button onClick={() => setView("customers")} className="text-xs text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                View All <ArrowRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {topDebtors.map(customer => (
                <button 
                  key={customer.id} 
                  onClick={() => handleCustomerClick(customer)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-left"
                >
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {customer.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{customer.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{customer.phone}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-red-600 dark:text-red-400">{formatCurrency(customer.balance)}</p>
                    <p className="text-[10px] text-gray-400">owed</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State if no debtors */}
        {topDebtors.length === 0 && (
          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 p-6 rounded-2xl text-center">
            <p className="text-green-800 dark:text-green-300 font-bold"> All caught up!</p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">No outstanding debts right now.</p>
          </div>
        )}

      </div>
    </div>
  );
};