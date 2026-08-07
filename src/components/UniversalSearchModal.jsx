import { useState, useEffect, useRef } from "react";
import { Search, X, Users, Truck, Package, ArrowRight } from "lucide-react";
import useStore from "../store/useStore";
import { CustomerService } from "../services/CustomerService";
import { SupplierService } from "../services/SupplierService";
import { ProductService } from "../services/ProductService";
import { formatCurrency } from "../utils/helpers";

export const UniversalSearchModal = ({ isOpen, onClose }) => {
  const { 
    currentStore, setView, 
    setSelectedCustomer, setSelectedSupplier 
  } = useStore();

  const [query, setQuery] = useState("");
  const [data, setData] = useState({ customers: [], suppliers: [], products: [] });
  const inputRef = useRef(null);

  // 1. Fetch all data instantly when modal opens
  useEffect(() => {
    if (isOpen && currentStore?.id) {
      Promise.all([
        CustomerService.getAll(currentStore.id),
        SupplierService.getAll(currentStore.id),
        ProductService.getAll(currentStore.id)
      ]).then(([customers, suppliers, products]) => {
        setData({ customers, suppliers, products });
      });
      
      // Auto-focus the search bar
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
    }
  }, [isOpen, currentStore?.id]);

  // 2. Filter in-memory for instant results
  const filtered = (() => {
    if (!query.trim()) return { customers: [], suppliers: [], products: [] };
    const q = query.toLowerCase();
    
    return {
      customers: data.customers.filter(c => c.name.toLowerCase().includes(q)).slice(0, 5),
      suppliers: data.suppliers.filter(s => s.name.toLowerCase().includes(q)).slice(0, 5),
      products: data.products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 5)
    };
  })();

  const hasResults = filtered.customers.length > 0 || filtered.suppliers.length > 0 || filtered.products.length > 0;

  // 3. Handle Selection
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setView("profile");
    onClose();
  };

  const handleSelectSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setView("supplierProfile");
    onClose();
  };

  const handleSelectProduct = () => {
    // Navigate to products page to view/manage it
    setView("products");
    onClose();
  };

  if (!isOpen) return null;

  const currency = currentStore?.currency || "GH₵";

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-950 flex flex-col">
      {/* Header & Search */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 pt-safe pb-4 px-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-2 -ml-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition active:scale-95">
            <X size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="font-bold text-lg text-gray-900 dark:text-white">Search Everything</h1>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, suppliers, products..."
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white text-base"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-200 dark:bg-gray-700 rounded-full">
              <X size={14} className="text-gray-600 dark:text-gray-300" />
            </button>
          )}
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!query.trim() ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Start typing to search...</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Find anyone or anything instantly.</p>
          </div>
        ) : !hasResults ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-500 dark:text-gray-400 font-medium">No results found for "{query}"</p>
          </div>
        ) : (
          <>
            {/* Customers */}
            {filtered.customers.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">Customers</h3>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {filtered.customers.map(c => (
                    <button 
                      key={c.id} 
                      onClick={() => handleSelectCustomer(c)}
                      className="w-full flex items-center gap-3 p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 active:bg-gray-50 dark:active:bg-gray-700 transition text-left"
                    >
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.phone || "No phone"}</p>
                      </div>
                      {c.balance > 0 && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-bold text-orange-600 dark:text-orange-400">{formatCurrency(c.balance, currency)}</p>
                          <p className="text-[9px] text-gray-400">Owes</p>
                        </div>
                      )}
                      <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suppliers */}
            {filtered.suppliers.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">Suppliers</h3>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {filtered.suppliers.map(s => (
                    <button 
                      key={s.id} 
                      onClick={() => handleSelectSupplier(s)}
                      className="w-full flex items-center gap-3 p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 active:bg-gray-50 dark:active:bg-gray-700 transition text-left"
                    >
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{s.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.phone || "No phone"}</p>
                      </div>
                      {s.balance > 0 && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-bold text-orange-600 dark:text-orange-400">{formatCurrency(s.balance, currency)}</p>
                          <p className="text-[9px] text-gray-400">I Owe</p>
                        </div>
                      )}
                      <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Products */}
            {filtered.products.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">Products</h3>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {filtered.products.map(p => (
                    <button 
                      key={p.id} 
                      onClick={handleSelectProduct}
                      className="w-full flex items-center gap-3 p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 active:bg-gray-50 dark:active:bg-gray-700 transition text-left"
                    >
                      <div className="text-2xl flex-shrink-0">{ProductService.getCategoryEmoji(p.category)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {p.category || "Uncategorized"} {p.brand && `• ${p.brand}`}
                        </p>
                      </div>
                      <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};