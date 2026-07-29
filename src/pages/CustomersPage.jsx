import { useState, useMemo } from "react";
import useStore from "../store/useStore";
import { CustomerCard } from "../components/CustomerCard";
import { PageHeader } from "../components/PageHeader";
import { Search, Plus, User, PlusCircle } from "lucide-react";
import { AddCustomerModal } from "../components/AddCustomerModal";

export const CustomersPage = () => {
  const { customers, setView } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [prefillData, setPrefillData] = useState({});

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, searchQuery]);

  // 👇 NEW: Detect if search query is a phone number or a name to pre-fill the modal
  const handleCreateFromSearch = () => {
    const q = searchQuery.trim();
    const isPhone = /^\d+$/.test(q.replace(/\s/g, ''));
    if (isPhone) {
      setPrefillData({ phone: q, name: "" });
    } else {
      setPrefillData({ name: q, phone: "" });
    }
    setIsAddingCustomer(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title="Customers" subtitle={`${customers.length} total`} />

      <div className="p-4 max-w-lg mx-auto space-y-4">
        
        {/* Search & Add */}
        <div className="relative flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name or phone..."
              className="w-full pl-10 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
              autoFocus
            />
            {/* Add Customer Button (Inside the search bar on the right) */}
            <button 
              onClick={() => {
                setPrefillData({});
                setIsAddingCustomer(true);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-green-700 text-white rounded-lg shadow-sm active:scale-95 transition"
              title="Add new customer"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* 👇 NEW: Dropdown suggestion right below the search input */}
          {searchQuery.trim() && filteredCustomers.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-xl shadow-lg z-20 overflow-hidden">
              <button 
                onClick={handleCreateFromSearch}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-green-50 dark:hover:bg-green-900/20 transition active:bg-green-100 dark:active:bg-green-900/30"
              >
                <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <PlusCircle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">Create new customer</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Use "{searchQuery.trim()}"</p>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Customer List */}
        <div className="space-y-3 pt-2">
          {filteredCustomers.length === 0 && !searchQuery.trim() ? (
            // Empty state when there are no customers at all
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <User className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No customers yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Tap the + button to add your first customer</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            // Subtle message when searching yields no results (the dropdown is the main action)
            <div className="text-center py-8">
              <p className="text-gray-400 dark:text-gray-500 text-sm">No existing customers match your search.</p>
            </div>
          ) : (
            // Show the customer list
            filteredCustomers.map(c => (
              <CustomerCard key={c.id} customer={c} />
            ))
          )}
        </div>
      </div>

      {/* Add Customer Modal (passes prefillData if searching) */}
      {isAddingCustomer && (
        <AddCustomerModal 
          initialData={prefillData}
          onClose={() => {
            setIsAddingCustomer(false);
            setPrefillData({}); // Clear prefill data when closing
            setSearchQuery(""); // Optional: clear search after adding
          }} 
        />
      )}
    </div>
  );
};