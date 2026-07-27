import { useState, useEffect } from "react";
import { Calendar, TrendingUp } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { formatCurrency } from "../utils/helpers";
import { ReportService } from "../services/ReportService";
import { PageHeader } from "../components/PageHeader";

export const ReportsPage = () => {
  const [dailyReport, setDailyReport] = useState(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [mostOverdue, setMostOverdue] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [daily, trend, top, overdue] = await Promise.all([
        ReportService.getDailySales(),
        ReportService.getSalesTrend(7),
        ReportService.getTopCustomers(5),
        ReportService.getMostOverdue(5)
      ]);
      setDailyReport(daily);
      setSalesTrend(trend);
      setTopCustomers(top);
      setMostOverdue(overdue);
    };
    load();
  }, []);

  const maxSales = Math.max(...salesTrend.map(d => d.sales), 1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title="Reports & Analytics" subtitle="Your business at a glance" />

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {dailyReport && (
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Calendar size={18} className="text-green-700 dark:text-green-400" /> Today's Summary
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Sales</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(dailyReport.totalSales)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Collected</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-400">{formatCurrency(dailyReport.totalCollected)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Txns</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{dailyReport.transactionCount}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-700 dark:text-green-400" /> Last 7 Days
          </h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {salesTrend.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-24">
                  <div 
                    className="bg-green-600 dark:bg-green-500 rounded-t-lg w-full transition-all"
                    style={{ height: `${(day.sales / maxSales) * 100}%`, minHeight: day.sales > 0 ? '4px' : '0' }}
                    title={formatCurrency(day.sales)}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Top Customers</h3>
          <div className="space-y-3">
            {topCustomers.map((c, i) => {
              const maxPurchase = topCustomers[0]?.totalPurchases || 1;
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400 w-6">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{c.name}</span>
                      <span className="font-bold text-green-700 dark:text-green-400 text-sm">{formatCurrency(c.totalPurchases)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-600 dark:bg-green-500 rounded-full" style={{ width: `${(c.totalPurchases / maxPurchase) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {topCustomers.length === 0 && <p className="text-center text-gray-400 py-4">No customers yet</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Highest Outstanding Debt</h3>
          <div className="space-y-2">
            {mostOverdue.map((c, i) => (
              <div key={c.id} className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{c.daysSinceContact} days since contact</p>
                </div>
                <p className="font-bold text-red-600 dark:text-red-400">{formatCurrency(c.balance)}</p>
              </div>
            ))}
            {mostOverdue.length === 0 && <p className="text-center text-gray-400 py-4">No outstanding debts!</p>}
          </div>
        </div>
      </div>
    </div>
  );
};