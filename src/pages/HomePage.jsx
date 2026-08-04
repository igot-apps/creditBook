import { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, Users, Truck, ArrowRight, CheckCircle2, Wallet } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { SupplierService } from "../services/SupplierService";
import { TopBar } from "../components/TopBar";

export const HomePage = () => {
  const { currentStore, customers, setView, setSelectedCustomer } = useStore();
  const currency = currentStore?.currency || "GH₵";
  const [totalSupplierDebt, setTotalSupplierDebt] = useState(0);

  // Fetch Supplier Debt on mount
  useEffect(() => {
    if (currentStore?.id) {
      SupplierService.getAll(currentStore.id).then(suppliers => {
        const debt = suppliers.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);
        setTotalSupplierDebt(debt);
      });
    }
  }, [currentStore?.id]);

  // Calculate Customer Debt
  const totalCustomerDebt = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.balance > 0 && !c.isArchived ? c.balance : 0), 0);
  }, [customers]);

  // Calculate Net Position (Money In - Money Out)
  const netPosition = totalCustomerDebt - totalSupplierDebt;

  // Today's Sales Stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    let todaySales = 0, collectedToday = 0, activeCustomers = 0;

    customers.forEach(c => {
      if (!c.isArchived) {
        activeCustomers++;
        c.history.forEach(tx => {
          if (!tx.isVoid && new Date(tx.date).toDateString() === today) {
            todaySales += (tx.amount || 0);
            collectedToday += (tx.paid || 0);
          }
        });
      }
    });
    return { todaySales, collectedToday, activeCustomers };
  }, [customers]);

  const topDebtors = useMemo(() => {
    return customers.filter(c => !c.isArchived && c.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 5);
  }, [customers]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* 👇 FIXED TOP BAR */}
      <TopBar title="Home" />
      
      {/* 👇 MAIN CONTENT */}
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }}>
        
        {/* Welcome Banner */}
        <div className="bg-green-700 dark:bg-gray-900 text-white px-4 pt-4 pb-6 rounded-b-[2rem] shadow-lg">
          <p className="text-green-100 text-xs uppercase tracking-wider font-semibold">Welcome back,</p>
          <h1 className="text-2xl font-bold mt-1">{currentStore?.name || "Business Owner"}</h1>
          <p className="text-green-100 text-xs mt-2">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="p-4 max-w-lg mx-auto space-y-6 -mt-4">       
          
          {/*  NEW: NET POSITION HERO CARD */}
          <div className={`p-5 rounded-2xl shadow-lg border text-white ${netPosition >= 0 ? 'bg-gradient-to-br from-green-600 to-green-800 border-green-500' : 'bg-gradient-to-br from-red-600 to-red-800 border-red-500'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={18} />
              <h2 className="font-bold text-sm uppercase tracking-wider opacity-90">My Cash Position</h2>
            </div>
            <p className="text-3xl font-bold break-words">
              {formatCurrency(netPosition, currency)}
            </p>
            <p className="text-xs opacity-80 mt-1">
              {netPosition >= 0 ? "You are in a positive position" : "You owe more than you are owed"}
            </p>
          </div>

          {/*  NEW: MONEY IN vs MONEY OUT SPLIT */}
          <div className="grid grid-cols-2 gap-3">
            {/* Money In */}
            <button 
              onClick={() => setView("customers")}
              className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-left active:scale-95 transition"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Users size={14} className="text-green-600 dark:text-green-400" />
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">People Owe Me</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white break-words">{formatCurrency(totalCustomerDebt, currency)}</p>
            </button>

            {/* Money Out */}
            <button 
              onClick={() => setView("suppliers")}
              className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-left active:scale-95 transition"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Truck size={14} className="text-orange-600 dark:text-orange-400" />
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">I Owe Suppliers</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white break-words">{formatCurrency(totalSupplierDebt, currency)}</p>
            </button>
          </div>

          {/* TODAY'S SALES */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-green-600 dark:text-green-400" />
              <h2 className="font-bold text-gray-900 dark:text-white">Today's Sales</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800/30 text-center">
                <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase mb-1">Sales</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(stats.todaySales, currency)}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/30 text-center">
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Payments Received</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(stats.collectedToday, currency)}</p>
              </div>
            </div>
          </div>

          {/* TOP CUSTOMERS OWING */}
          {topDebtors.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingDown size={16} className="text-orange-500" /> Top Customers Owing
                </h3>
                <button onClick={() => setView("followups")} className="text-xs text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                  View All <ArrowRight size={12} />
                </button>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {topDebtors.map(customer => (
                  <button key={customer.id} onClick={() => { setSelectedCustomer(customer); setView("profile"); }} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-left">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {customer.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{customer.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{customer.phone}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-red-600 dark:text-red-400">{formatCurrency(customer.balance, currency)}</p>
                      <p className="text-[10px] text-gray-400">owed</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-900/10 border-2 border-dashed border-green-200 dark:border-green-800/50 p-8 rounded-2xl text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-green-800 dark:text-green-300 font-bold text-lg"> All caught up!</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">No customers owing right now.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};