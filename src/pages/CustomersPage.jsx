import { useState, useEffect, useRef } from "react";
import { Search, Plus, Star, Phone, Loader2, Users } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { AddCustomerModal } from "../components/customer/AddCustomerModal";
import { TopBar } from "../components/TopBar";
import { CustomerService } from "../services/CustomerService";

export const CustomersPage = () => {
  const { currentStore, setSelectedCustomer, setView } = useStore();
  const currency = currentStore?.currency || "GH₵";

  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // 👇 Forces a refetch even when page is already 0 (fixes "must reload to see new customer")
  const [refreshKey, setRefreshKey] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const LIMIT = 30;
  const observer = useRef();

  // 1. Debounce typing ONLY — never clears the list here (this was the empty-list bug)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 2. When the search term actually changes, restart from page 0
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  // 3. Single fetch effect with stale-response guard (page 0 replaces, page > 0 appends)
  useEffect(() => {
    let stale = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await CustomerService.getAll({
          limit: LIMIT,
          offset: page * LIMIT,
          search: debouncedSearch
        });
        if (stale) return; // a newer request finished first — ignore this one
        setHasMore(res.length >= LIMIT);
        setCustomers(prev => (page > 0 ? [...prev, ...res] : res));
      } catch (error) {
        if (!stale) console.error(error);
      } finally {
        if (!stale) setIsLoading(false);
      }
    };
    load();
    return () => { stale = true; };
  }, [page, debouncedSearch, refreshKey]);

  // 4. Intersection Observer (loads next batch at the bottom)
  const lastCustomerElementRef = (node) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  };

  // 👇 Refresh after add/edit — refreshKey guarantees the fetch effect re-runs
  const handleRefresh = () => {
    setPage(0);
    setHasMore(true);
    setRefreshKey(k => k + 1);
  };

  const handleViewProfile = (customer) => {
    setSelectedCustomer(customer);
    setView("profile");
  };

  const renderCustomerCard = (customer, index) => {
    const balance = parseFloat(customer.balance) || 0;
    const isFavorite = customer.is_favourite || customer.isFavourite;
    const isLast = index === customers.length - 1;

    return (
      <button
        key={customer.id}
        ref={isLast ? lastCustomerElementRef : null}
        onClick={() => handleViewProfile(customer)}
        className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-left active:scale-[0.98] transition relative overflow-hidden"
      >
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
            balance > 0 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
          }`}>
            {(customer.name || "?").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 dark:text-white truncate">{customer.name || "Unknown"}</p>
              {isFavorite && <Star size={12} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
              <Phone size={10} /> {customer.phone || "No phone"}
            </p>
          </div>
          <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
            {balance > 0 ? (
              <>
                <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{formatCurrency(balance, currency)}</p>
                <p className="text-[9px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded-md">Owes</p>
              </>
            ) : balance < 0 ? (
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Credit {formatCurrency(Math.abs(balance), currency)}</p>
            ) : (
              <p className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">Paid Up</p>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Customers" />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto">

        {/* Search & Add Button */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name or phone..."
              className="w-full pl-9 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 rounded-xl flex items-center gap-1.5 font-bold text-sm active:scale-95 transition shadow-md"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Customer List */}
        <div className="space-y-3 pb-8">
          {customers.map((customer, index) => renderCustomerCard(customer, index))}
        </div>

        {/* Infinite Scroll Sentinel & Loading States */}
        <div className="py-6 flex flex-col items-center gap-2">
          {isLoading && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Loader2 className="animate-spin" size={20} />
              <span className="text-sm font-semibold">Loading more...</span>
            </div>
          )}
          {!isLoading && !hasMore && customers.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              ✨ You've reached the end ({customers.length} customers)
            </p>
          )}
          {!isLoading && customers.length === 0 && !searchQuery && (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600 opacity-70" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No customers yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Tap "Add" to create your first customer.</p>
            </div>
          )}
          {!isLoading && customers.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 font-medium">No customers found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Customer Modal — onSaved triggers instant refresh + duplicate-phone protected */}
      <AddCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleRefresh}
      />
    </div>
  );
};