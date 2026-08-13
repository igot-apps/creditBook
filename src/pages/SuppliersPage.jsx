import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Plus, Phone, MessageCircle, DollarSign, ShoppingCart, X, Star, ChevronRight, Loader2 } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { openWhatsApp, openDialer } from "../utils/communication";
import { AddSupplierModal } from "../components/supplier/AddSupplierModal";
import { TopBar } from "../components/TopBar";
import { SupplierService } from "../services/SupplierService";

export const SuppliersPage = () => {
  const { currentStore, setSelectedSupplier, setView, setPrefillTransaction } = useStore();
  const currency = currentStore?.currency || "GH₵";

  const [suppliers, setSuppliers] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionSupplier, setActionSupplier] = useState(null);

  const LIMIT = 30;
  const observer = useRef();

  // 1. Debounce Search (Waits 300ms after typing stops to query Supabase)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setSuppliers([]);
      setPage(0);
      setHasMore(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 2. Fetch Data (Infinite Scroll Logic)
  const fetchSuppliers = useCallback(async (currentPage, search, append) => {
    setIsLoading(true);
    try {
      const newSuppliers = await SupplierService.getAll({ 
        limit: LIMIT, 
        offset: currentPage * LIMIT, 
        search 
      });
      
      if (newSuppliers.length < LIMIT) setHasMore(false);
      else setHasMore(true);
      
      setSuppliers(prev => append ? [...prev, ...newSuppliers] : newSuppliers);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers(page, debouncedSearch, page > 0);
  }, [page, debouncedSearch, fetchSuppliers]);

  // 3. Intersection Observer (Triggers next page load when scrolling to bottom)
  const lastSupplierElementRef = useCallback(node => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore]);

  // Refresh list after adding/editing a supplier
  const handleRefresh = () => {
    setSuppliers([]);
    setPage(0);
    setHasMore(true);
  };

  const handleRecordPurchase = (supplier) => {
    setActionSupplier(null);
    setSelectedSupplier(supplier);
    setPrefillTransaction({ supplierId: supplier.id, name: supplier.name, phone: supplier.phone, type: "purchase", amount: "", paid: "0" });
    setView("recordSupplierPurchase");
  };

  const handleMakePayment = (supplier) => {
    setActionSupplier(null);
    setSelectedSupplier(supplier);
    setView("recordSupplierPayment");
  };

  const handleViewProfile = (supplier) => {
    setActionSupplier(null);
    setSelectedSupplier(supplier);
    setView("supplierProfile");
  };

  const generateMessage = (s) =>
    `Hello ${s.name}, this is ${currentStore?.name || "Store"}. My outstanding balance with you is ${formatCurrency(s.balance || 0, currency)}. I will make the payment by the end of the week. Thank you!`;

  const renderSupplierCard = (supplier, index) => {
    const balance = parseFloat(supplier.balance) || 0;
    const isFavorite = supplier.is_favourite || supplier.isFavourite;
    const isLast = index === suppliers.length - 1;
    
    return (
      <button 
        key={supplier.id} 
        ref={isLast ? lastSupplierElementRef : null}
        onClick={() => handleViewProfile(supplier)}
        className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-left active:scale-[0.98] transition relative overflow-hidden"
      >
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
            balance > 0 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
          }`}>
            {(supplier.name || "?").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 dark:text-white truncate">{supplier.name}</p>
              {isFavorite && <Star size={12} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
              <Phone size={10} /> {supplier.phone || "No phone"}
            </p>
          </div>
          <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
            {balance > 0 ? (
              <>
                <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(balance, currency)}
                </p>
                <p className="text-[9px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded-md">You Owe</p>
              </>
            ) : balance < 0 ? (
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                Credit {formatCurrency(Math.abs(balance), currency)}
              </p>
            ) : (
              <p className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                Settled
              </p>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Suppliers" />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto">
        
        {/* Search & Add Button */}
        <div className="flex gap-2 mb-4 sticky top-0 bg-gray-50 dark:bg-gray-950 py-2 z-10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name or phone..."
              className="w-full pl-9 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl flex items-center gap-1.5 font-bold text-sm active:scale-95 transition shadow-md"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Supplier List */}
        <div className="space-y-3 pb-8">
          {suppliers.map((supplier, index) => renderSupplierCard(supplier, index))}
        </div>

        {/* Infinite Scroll Sentinel & Loading States */}
        <div className="py-6 flex flex-col items-center gap-2">
          {isLoading && (
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Loader2 className="animate-spin" size={20} />
              <span className="text-sm font-semibold">Loading more...</span>
            </div>
          )}
          {!isLoading && !hasMore && suppliers.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              ✨ You've reached the end ({suppliers.length} suppliers)
            </p>
          )}
          {!isLoading && suppliers.length === 0 && !searchQuery && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 font-medium">No suppliers yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Tap "Add" to create your first supplier.</p>
            </div>
          )}
          {!isLoading && suppliers.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 font-medium">No suppliers found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>

      <AddSupplierModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaved={handleRefresh} />

      {/* ACTION BOTTOM SHEET */}
      {actionSupplier && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setActionSupplier(null)}>
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-3xl p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{actionSupplier.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(parseFloat(actionSupplier.balance) || 0) > 0 ? `You owe ${formatCurrency(actionSupplier.balance, currency)}` : "Settled"}
                </p>
              </div>
              <button onClick={() => setActionSupplier(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={20} className="text-gray-600 dark:text-gray-300" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleRecordPurchase(actionSupplier)} className="flex flex-col items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl active:scale-95 transition">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center"><ShoppingCart size={24} /></div>
                <span className="font-bold text-gray-900 dark:text-white text-sm">Record Purchase</span>
              </button>
              <button onClick={() => handleMakePayment(actionSupplier)} className="flex flex-col items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl active:scale-95 transition">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center"><DollarSign size={24} /></div>
                <span className="font-bold text-gray-900 dark:text-white text-sm">Make Payment</span>
              </button>
              <button onClick={() => { setActionSupplier(null); openDialer(actionSupplier.phone); }} className="flex flex-col items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl active:scale-95 transition">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center"><Phone size={24} /></div>
                <span className="font-bold text-gray-900 dark:text-white text-sm">Call</span>
              </button>
              <button onClick={() => { setActionSupplier(null); openWhatsApp(actionSupplier.phone, generateMessage(actionSupplier)); }} className="flex flex-col items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl active:scale-95 transition">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center"><MessageCircle size={24} /></div>
                <span className="font-bold text-gray-900 dark:text-white text-sm">WhatsApp</span>
              </button>
            </div>
            <button onClick={() => handleViewProfile(actionSupplier)} className="w-full mt-4 py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition flex items-center justify-center gap-1">
              View Full Profile <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};