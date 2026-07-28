import { useState, useMemo } from "react";
import { Search, Plus, User } from "lucide-react";
import useStore from "../store/useStore";
import { CustomerCard } from "../components/CustomerCard";
import { PageHeader } from "../components/PageHeader";

export const CustomersPage = () => {
  const { customers, setView } = useStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title="Customers" subtitle={`${customers.length} total`} />

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Search & Add */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name or phone..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
            />
          </div>
          <button 
            onClick={() => setView("record")}
            className="bg-green-700 text-white p-3 rounded-xl shadow-md active:scale-95 transition"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Customer List */}
        <div className="space-y-3">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <User className="mx-auto text-gray-300 mb-2" size={48} />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No customers found</p>
            </div>
          ) : (
            filteredCustomers.map(c => (
              <CustomerCard key={c.id} customer={c} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};