import { useState, useMemo } from "react";
import { Store, Search, Users } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { formatCurrency } from "../utils/helpers";
import { CustomerCard } from "../components/CustomerCard";
import { Confetti } from "../components/Confetti";

export const HomePage = () => {
  const { store, customers, totalDebt, todaySales, setView } = useApp();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.includes(q)
    );
  }, [customers, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <Confetti />
      
      <div className="bg-green-700 dark:bg-gray-900 text-white p-6 pb-12 rounded-b-[2.5rem] shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-green-100 dark:text-gray-400 text-sm font-medium">{store.name}</p>
            <h1 className="text-2xl font-bold">Good Day, {store.owner}!</h1>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Store size={20} />
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <p className="text-green-100 text-sm">Total Outstanding Debt</p>
          <p className="text-4xl font-bold mt-1">{formatCurrency(totalDebt)}</p>
        </div>
      </div>

      <div className="px-4 -mt-6 max-w-lg mx-auto space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">Today's Sales</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(todaySales)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">Customers Owing</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{customers.filter(c => c.balance > 0).length}</p>
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
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
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