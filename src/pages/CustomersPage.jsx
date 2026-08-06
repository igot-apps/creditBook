import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Users, Phone } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { AddCustomerModal } from "../components/AddCustomerModal";
import { TopBar } from "../components/TopBar";

export const CustomersPage = () => {
  // 👇 Use global customers and refreshCustomers from useStore
  const { currentStore, customers, refreshCustomers, setSelectedCustomer, setView } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currency = currentStore?.currency || "GH₵";

  // Ensure customers are loaded when the page mounts
  useEffect(() => {
    if (currentStore?.id) {
      refreshCustomers();
    }
  }, [currentStore?.id]);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    );
  }, [customers, searchQuery]);

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setView("profile");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Customers" />
      
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">
        
        {/* Search & Add Button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-xl flex items-center justify-center active:scale-95 transition shadow-md"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Customers List */}
        <div className="space-y-3">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <Users className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {searchQuery ? "No customers found" : "No customers yet"}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                {searchQuery ? "Try a different search term" : "Tap the + button to add your first customer"}
              </p>
            </div>
          ) : (
            filteredCustomers.map(customer => (
              <button 
                key={customer.id} 
                onClick={() => handleSelectCustomer(customer)}
                className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 text-left active:scale-[0.98] transition"
              >
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {customer.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{customer.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 mt-0.5">
                    <Phone size={10} /> {customer.phone || "No phone"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  {customer.balance > 0 ? (
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      Owes {formatCurrency(customer.balance, currency)}
                    </p>
                  ) : customer.balance < 0 ? (
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      Credit {formatCurrency(Math.abs(customer.balance), currency)}
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                      Paid Up
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      <AddCustomerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};