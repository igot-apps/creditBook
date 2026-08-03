import { useState, useMemo } from "react";
import { TrendingUp, Wallet, CreditCard, AlertCircle, Calendar, Users, Package, ArrowUpRight } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { PageHeader } from "../components/PageHeader";

export const ReportsPage = () => {
  const { currentStore, customers, setView, setSelectedCustomer } = useStore();
  const currency = currentStore?.currency || "GH₵";
  
  // Timeframe filters
  const [timeframe, setTimeframe] = useState("today"); // today, week, month, all

  // Helper to check if a date falls within the selected timeframe
  const isDateInRange = (dateString) => {
    if (timeframe === "all") return true;
    const date = new Date(dateString);
    const now = new Date();
    
    if (timeframe === "today") {
      return date.toDateString() === now.toDateString();
    }
    if (timeframe === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return date >= weekAgo;
    }
    if (timeframe === "month") {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Calculate Report Stats
  const stats = useMemo(() => {
    let totalSales = 0;
    let totalPayments = 0;
    let totalCreditSales = 0;
    let transactionCount = 0;

    customers.forEach(c => {
      if (c.isArchived) return;
      
      c.history.forEach(tx => {
        if (tx.isVoid) return; // Ignore cancelled sales
        
        if (isDateInRange(tx.date)) {
          const amount = parseFloat(tx.amount) || 0;
          const paid = parseFloat(tx.paid) || 0;
          
          totalSales += amount;
          totalPayments += paid;
          transactionCount++;
        }
      });
    });

    totalCreditSales = Math.max(0, totalSales - totalPayments);

    // Get top 5 customers currently owing money (Live data, not filtered by timeframe)
    const topDebtors = customers
      .filter(c => !c.isArchived && c.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);

    // Get top 5 products sold (if using detailed invoices)
    const productMap = {};
    customers.forEach(c => {
      if (c.isArchived) return;
      c.history.forEach(tx => {
        if (tx.isVoid || !tx.invoiceItems) return;
        if (timeframe !== "all" && !isDateInRange(tx.date)) return;
        
        tx.invoiceItems.forEach(item => {
          if (!productMap[item.name]) productMap[item.name] = { qty: 0, revenue: 0 };
          productMap[item.name].qty += parseFloat(item.quantity) || 0;
          productMap[item.name].revenue += (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
        });
      });
    });
    const topProducts = Object.entries(productMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return { totalSales, totalPayments, totalCreditSales, transactionCount, topDebtors, topProducts };
  }, [customers, timeframe]);

  const timeframes = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "all", label: "All Time" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title="Reports" subtitle="Business performance" />
      
      <div className="p-4 max-w-lg mx-auto space-y-6">
        
        {/* Timeframe Selector */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto scrollbar-hide">
          {timeframes.map(tf => (
            <button
              key={tf.key}
              onClick={() => setTimeframe(tf.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition whitespace-nowrap ${
                timeframe === tf.key 
                  ? "bg-white dark:bg-gray-700 text-green-700 dark:text-green-400 shadow-sm" 
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Total Sales</p>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white break-words">{formatCurrency(stats.totalSales, currency)}</p>
            <p className="text-[10px] text-gray-400 mt-1">{stats.transactionCount} sales recorded</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Wallet size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Payments Received</p>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white break-words">{formatCurrency(stats.totalPayments, currency)}</p>
            <p className="text-[10px] text-gray-400 mt-1">Cash & Mobile Money</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <CreditCard size={16} className="text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Credit Sales</p>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white break-words">{formatCurrency(stats.totalCreditSales, currency)}</p>
            <p className="text-[10px] text-gray-400 mt-1">Goods given on credit</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Current Amount Owed</p>
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-400 break-words">
              {formatCurrency(customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0), currency)}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Total outstanding debt</p>
          </div>
        </div>

        {/* Top Customers Owing */}
        {stats.topDebtors.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users size={16} className="text-red-500" /> Top Customers Owing
              </h3>
              <button onClick={() => setView("followups")} className="text-xs text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                View All <ArrowUpRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {stats.topDebtors.map(customer => (
                <button 
                  key={customer.id} 
                  onClick={() => { setSelectedCustomer(customer); setView("profile"); }}
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
                    <p className="font-bold text-red-600 dark:text-red-400">{formatCurrency(customer.balance, currency)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Top Products Sold (Only shows if detailed invoices are used) */}
        {stats.topProducts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Package size={16} className="text-blue-500" /> Top Products Sold
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {stats.topProducts.map((product, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{product.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{product.qty} units sold</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{formatCurrency(product.revenue, currency)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.totalSales === 0 && stats.topDebtors.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
            <Calendar className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No sales recorded for this period</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try selecting "All Time" to see older data.</p>
          </div>
        )}
      </div>
    </div>
  );
};