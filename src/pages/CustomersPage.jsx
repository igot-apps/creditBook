import { useState, useMemo } from "react";
import { Search, X, Users } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { CustomerCard } from "../components/CustomerCard";
import { PageHeader } from "../components/PageHeader";

export const CustomersPage = () => {
  const { customers, setView } = useApp();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title="All Customers" subtitle={`${filteredCustomers.length} customer${filteredCustomers.length !== 1 ? "s" : ""}`} />

      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-10 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="space-y-3">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <Users className="mx-auto text-gray-300 mb-2" size={48} />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {searchQuery ? "No customers match your search" : "No customers yet"}
              </p>
              {!searchQuery && (
                <button onClick={() => setView("record")} className="mt-3 text-green-700 dark:text-green-400 font-bold">Add your first customer</button>
              )}
            </div>
          ) : (
            filteredCustomers.map(c => <CustomerCard key={c.id} customer={c} />)
          )}
        </div>
      </div>
    </div>
  );
};