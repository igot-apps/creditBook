import { useState, useEffect, useRef } from "react";
import { Search, Users, Truck, Package, X, ChevronRight, Loader2 } from "lucide-react";
import useStore from "../store/useStore";
import { CustomerService } from "../services/CustomerService";
import { SupplierService } from "../services/SupplierService";
import { ProductService } from "../services/ProductService";

export const UniversalSearchModal = ({ isOpen, onClose }) => {
  const { setSelectedCustomer, setSelectedSupplier, setView } = useStore();

  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);

  // Reset + autofocus each time it opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setCustomers([]);
      setSuppliers([]);
      setProducts([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Debounced search across ALL three sources
  useEffect(() => {
    if (!isOpen) return;
    const q = query.trim();
    if (!q) {
      setCustomers([]); setSuppliers([]); setProducts([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const [c, s, p] = await Promise.all([
          CustomerService.getAll({ search: q, limit: 8 }).catch(() => []),
          SupplierService.getAll({ search: q, limit: 8 }).catch(() => []),
          ProductService.getAll().catch(() => []),
        ]);
        setCustomers(Array.isArray(c) ? c.slice(0, 8) : []);
        setSuppliers(Array.isArray(s) ? s.slice(0, 8) : []);
        const ql = q.toLowerCase();
        setProducts(
          (Array.isArray(p) ? p : [])
            .filter(pr => (pr.name || "").toLowerCase().includes(ql) || (pr.brand || "").toLowerCase().includes(ql))
            .slice(0, 8)
        );
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const openCustomer = (c) => { setSelectedCustomer(c); onClose(); setView("profile"); };
  const openSupplier = (s) => { setSelectedSupplier(s); onClose(); setView("supplierProfile"); };
  const openProducts = () => { onClose(); setView("products"); };

  const hasResults = customers.length > 0 || suppliers.length > 0 || products.length > 0;

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-16" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl max-h-[75vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, suppliers, products..."
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white text-sm"
          />
          <button onClick={onClose} className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full flex-shrink-0">
            <X size={16} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {query.trim() === "" && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-8">
              Type a name, phone number, or product...
            </p>
          )}

          {isSearching && (
            <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
              <Loader2 className="animate-spin" size={18} />
              <span className="text-xs">Searching...</span>
            </div>
          )}

          {!isSearching && query.trim() !== "" && !hasResults && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-8">No matches for "{query}"</p>
          )}

          {/* CUSTOMERS */}
          {customers.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 mb-1 px-1 flex items-center gap-1">
                <Users size={12} /> Customers ({customers.length})
              </p>
              <div className="space-y-1">
                {customers.map(c => (
                  <button key={c.id} onClick={() => openCustomer(c)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition">
                    <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {(c.name || "?").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{c.phone || "No phone"}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SUPPLIERS */}
          {suppliers.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 mb-1 px-1 flex items-center gap-1">
                <Truck size={12} /> Suppliers ({suppliers.length})
              </p>
              <div className="space-y-1">
                {suppliers.map(s => (
                  <button key={s.id} onClick={() => openSupplier(s)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {(s.name || "?").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{s.phone || "No phone"}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PRODUCTS */}
          {products.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 mb-1 px-1 flex items-center gap-1">
                <Package size={12} /> Products ({products.length})
              </p>
              <div className="space-y-1">
                {products.map(pr => (
                  <button key={pr.id} onClick={openProducts} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                      <Package size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{pr.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{pr.brand || "No brand"}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};