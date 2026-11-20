import { useState, useMemo, useEffect } from "react";
import { TrendingUp, TrendingDown, Users, Truck, ArrowUpRight, Calendar } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { TransactionService } from "../services/TransactionService";
import { CustomerService } from "../services/CustomerService";
import { SupplierService } from "../services/SupplierService";
import { TopBar } from "../components/TopBar";
import { SkeletonStats, SkeletonList } from "../components/Skeleton";

// Debt forgiveness is recorded as a payment with a write_off marker. It reduces
// outstanding debt but is not money that actually came in.
const isWriteOff = (tx) =>
  tx.payment_method === "write_off" || (tx.note || "").startsWith("[FORGIVEN]");

export const ReportsPage = () => {
  const {
    currentStore,
    setView,
    setSelectedCustomer,
    setSelectedSupplier
  } = useStore();

  const currency = currentStore?.currency || "GH₵";
  const [timeframe, setTimeframe] = useState("today");
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch transactions + contact balances directly (Single Source of Truth)
  useEffect(() => {
    if (currentStore?.id) {
      Promise.allSettled([
        TransactionService.getAll(currentStore.id)
          .then(setTransactions)
          .catch(() => setTransactions([])),
        CustomerService.getAll({ fetchAll: true })
          .then(setCustomers)
          .catch(() => setCustomers([])),
        SupplierService.getAll({ fetchAll: true })
          .then(setSuppliers)
          .catch(() => setSuppliers([])),
      ]).finally(() => setLoading(false));
    }
  }, [currentStore?.id]);

  // 2. Helper to check if a date falls within the selected timeframe
  const isDateInRange = (dateString) => {
    if (timeframe === "all") return true;
    if (!dateString) return false;

    const date = new Date(dateString);
    const now = new Date();
    
    if (timeframe === "today") return date.toDateString() === now.toDateString();
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

  // 3. Calculate Report Stats safely
  const stats = useMemo(() => {
    let totalSales = 0;
    let totalPurchases = 0;
    let paymentsReceived = 0;
    let paymentsMade = 0;

    // Calculate from the flat transactions array
    if (Array.isArray(transactions)) {
      transactions.forEach(tx => {
        const isActive = tx.status === 'active' || !tx.status;
        if (!isActive || tx.isVoid) return;

        if (isDateInRange(tx.created_at || tx.createdAt || tx.date)) {
          const paid = isWriteOff(tx) ? 0 : (parseFloat(tx.paid) || 0);
          if (tx.type === 'sale') {
            totalSales += (parseFloat(tx.amount) || 0);
            paymentsReceived += paid;
          } else if (tx.type === 'purchase') {
            totalPurchases += (parseFloat(tx.amount) || 0);
            paymentsMade += paid;
          } else if (tx.type === 'payment') {
            paymentsReceived += paid;
          } else if (tx.type === 'supplier_payment') {
            paymentsMade += paid;
          }
        }
      });
    }

    // Get top 5 customers currently owing money (Safe fallbacks)
    const topDebtors = (Array.isArray(customers) ? customers : [])
      .filter(c => !(c.is_archived || c.isArchived) && (parseFloat(c.balance) || 0) > 0)
      .sort((a, b) => (parseFloat(b.balance) || 0) - (parseFloat(a.balance) || 0))
      .slice(0, 5);

    // Get top 5 suppliers currently owed money (Safe fallbacks)
    const topCreditors = (Array.isArray(suppliers) ? suppliers : [])
      .filter(s => !(s.is_archived || s.isArchived) && (parseFloat(s.balance) || 0) > 0)
      .sort((a, b) => (parseFloat(b.balance) || 0) - (parseFloat(a.balance) || 0))
      .slice(0, 5);

    return { totalSales, totalPurchases, paymentsReceived, paymentsMade, topDebtors, topCreditors };
  }, [transactions, customers, suppliers, timeframe]);

  const timeframes = [
    { key: "today", label: "Today" },
    { key: "week", label: "Last 7 Days" },
    { key: "month", label: "This Month" },
    { key: "all", label: "All Time" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Reports" subtitle="Business performance" />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-6">
        
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

        {loading ? (
          <div className="space-y-6">
            <SkeletonStats count={2} label="Loading reports" />
            <SkeletonStats count={2} label="Loading balances" />
            <SkeletonList rows={3} label="Loading top contacts" />
          </div>
        ) : (<>
        {/* MONEY IN vs MONEY OUT SPLIT */}
        <div className="grid grid-cols-2 gap-3">
          {/* Money In */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp size={14} className="text-green-600 dark:text-green-400" />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Total Sales</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white break-words">{formatCurrency(stats.totalSales, currency)}</p>
            <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 font-semibold">Received: {formatCurrency(stats.paymentsReceived, currency)}</p>
          </div>
          
          {/* Money Out */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <TrendingDown size={14} className="text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Total Purchases</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white break-words">{formatCurrency(stats.totalPurchases, currency)}</p>
            <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-1 font-semibold">Paid: {formatCurrency(stats.paymentsMade, currency)}</p>
          </div>
        </div>

        {/* TOP CUSTOMERS OWING */}
        {stats.topDebtors.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users size={16} className="text-red-500" /> People Owe Me
              </h3>
              <button onClick={() => setView("customers")} className="text-xs text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
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
                    {(customer.name || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{customer.name || "Unknown"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{customer.phone || "No phone"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-red-600 dark:text-red-400">{formatCurrency(customer.balance, currency)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TOP SUPPLIERS OWED */}
        {stats.topCreditors.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Truck size={16} className="text-orange-500" /> I Owe Suppliers
              </h3>
              <button onClick={() => setView("suppliers")} className="text-xs text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                View All <ArrowUpRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {stats.topCreditors.map(supplier => (
                <button 
                  key={supplier.id} 
                  onClick={() => { setSelectedSupplier(supplier); setView("supplierProfile"); }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-left"
                >
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {(supplier.name || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{supplier.name || "Unknown"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{supplier.phone || "No phone"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-orange-600 dark:text-orange-400">{formatCurrency(supplier.balance, currency)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.totalSales === 0 && stats.totalPurchases === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
            <Calendar className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No activity for this period</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try selecting "All Time" to see older data.</p>
          </div>
        )}
        </>)}
      </div>
    </div>
  );
};