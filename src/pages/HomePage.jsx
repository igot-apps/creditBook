import { useState, useMemo } from "react";
import { Search, Users, TrendingUp, DollarSign } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { CustomerCard } from "../components/CustomerCard";
import { Confetti } from "../components/Confetti";

export const HomePage = () => {
  const { currentStore, customers, setView } = useStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, searchQuery]);

  const totalDebt = useMemo(() => customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0), [customers]);
  const todaySales = useMemo(() => {
    if (!currentStore) return 0;
    const today = new Date().toDateString();
    return customers.reduce((sum, c) => sum + (c.history || []).filter(h => new Date(h.date).toDateString() === today).reduce((s, h) => s + (h.amount || 0), 0), 0);
  }, [customers, currentStore]);

  // 👇 CHANGED: Show a loading spinner instead of a blank screen
  if (!currentStore) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Loading your business data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <Confetti />
      
      <div className="bg-green-700 dark:bg-gray-900 text-white p-6 pb-8 rounded-b-[2rem] shadow-lg relative">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-green-100 dark:text-gray-400 text-sm font-medium">{currentStore.name}</p>
            <h1 className="text-2xl font-bold">Good Day, {currentStore.ownerName || "Owner"}!</h1>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <p className="text-green-100 text-sm">Total Outstanding Debt</p>
          <p className="text-4xl font-bold mt-1">{formatCurrency(totalDebt)}</p>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-green-600" />
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">Today's Sales</p>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(todaySales)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-1">Customers Owing</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{customers.filter(c => c.balance > 0).length}</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Customers</h2>
            <button onClick={() => setView("customers")} className="text-green-700 dark:text-green-400 text-sm font-semibold">View All</button>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name or phone..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
            />
          </div>

          <div className="space-y-3">
            {(searchQuery ? filteredCustomers : customers).slice(0, 5).map(c => (
              <CustomerCard key={c.id} customer={c} />
            ))}
            {customers.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <Users className="mx-auto text-gray-300 mb-2" size={48} />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No customers yet</p>
                <button onClick={() => setView("record")} className="mt-3 text-green-700 dark:text-green-400 font-bold">Add your first customer</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};