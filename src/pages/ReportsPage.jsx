import { useMemo } from "react";
import { TrendingUp, DollarSign, Users, Calendar } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";
import { PageHeader } from "../components/PageHeader";

export const ReportsPage = () => {
  const { currentStore, customers } = useStore();

  const stats = useMemo(() => {
    if (!currentStore) return null;

    const today = new Date().toDateString();
    let todaySales = 0;
    let todayCollections = 0;
    let totalOutstanding = 0;
    let totalRecovered = 0;

    customers.forEach(c => {
      totalOutstanding += Math.max(0, c.balance || 0);
      
      c.history?.forEach(tx => {
        const txDate = new Date(tx.date).toDateString();
        if (txDate === today) {
          todaySales += tx.amount || 0;
          todayCollections += tx.paid || 0;
        }
        totalRecovered += tx.paid || 0;
      });
    });

    return { todaySales, todayCollections, totalOutstanding, totalRecovered };
  }, [currentStore, customers]);

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title="Reports" subtitle="Business Overview" />

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Today's Performance */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-green-600" /> Today's Performance
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
              <p className="text-xs text-green-700 dark:text-green-400 font-bold uppercase mb-1">Sales</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.todaySales)}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
              <p className="text-xs text-blue-700 dark:text-blue-400 font-bold uppercase mb-1">Collected</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.todayCollections)}</p>
            </div>
          </div>
        </div>

        {/* Overall Business Health */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" /> Overall Health
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg">
                  <DollarSign size={20} className="text-red-600 dark:text-red-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Outstanding Debt</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.totalOutstanding)}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                  <Users size={20} className="text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Recovered (All Time)</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.totalRecovered)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {customers.flatMap(c => (c.history || []).map(h => ({ ...h, customerName: c.name })))
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 5)
              .map((tx, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{tx.customerName}</p>
                    <p className="text-xs text-gray-500">{tx.items || "Transaction"} • {formatDate(tx.date).split(',')[0]}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(tx.amount)}</p>
                    {tx.paid > 0 && <p className="text-xs text-green-600">Paid: {formatCurrency(tx.paid)}</p>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};