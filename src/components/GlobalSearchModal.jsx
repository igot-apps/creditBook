import { useState, useMemo, useEffect } from "react";
import { Search, X, User, Package, FileText, ArrowRight } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { formatCurrency, formatDate } from "../utils/helpers";
import { ProductService } from "../services/ProductService";

export const GlobalSearchModal = ({ onClose }) => {
  const { customers, recentActivity, setSelectedCustomer, setView } = useApp();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Load products for search
    if (window.currentStoreId) { // We'll pass this or use context
       // Fallback: In a real app, ensure currentStore is in context. 
       // For now, we assume products are loaded or we fetch them.
    }
  }, []);

  // Note: Ensure currentStore is available in useApp()
  const { currentStore } = useApp();
  useEffect(() => {
    if (currentStore) {
      ProductService.getAll(currentStore.id).then(setProducts);
    }
  }, [currentStore]);

  const results = useMemo(() => {
    if (!query.trim()) return { customers: [], products: [], transactions: [] };
    const q = query.toLowerCase();

    const matchedCustomers = customers.filter(c => 
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    ).slice(0, 5);

    const matchedProducts = products.filter(p => 
      p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
    ).slice(0, 5);

    const matchedTx = recentActivity.filter(t => 
      (t.customerName && t.customerName.toLowerCase().includes(q)) || 
      (t.items && t.items.toLowerCase().includes(q))
    ).slice(0, 5);

    return { customers: matchedCustomers, products: matchedProducts, transactions: matchedTx };
  }, [query, customers, products, recentActivity]);

  const handleSelectCustomer = (c) => {
    setSelectedCustomer(c);
    setView("profile");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-950 z-[100] flex flex-col animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
        <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
          <X size={20} className="text-gray-700 dark:text-gray-300" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search customers, products, transactions..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
            autoFocus
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!query.trim() && (
          <div className="text-center text-gray-400 mt-10">
            <Search size={48} className="mx-auto mb-2 opacity-20" />
            <p>Start typing to search...</p>
          </div>
        )}

        {results.customers.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Customers</h3>
            <div className="space-y-2">
              {results.customers.map(c => (
                <button key={c.id} onClick={() => handleSelectCustomer(c)} className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition text-left">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-700 rounded-full flex items-center justify-center font-bold">{c.name.charAt(0)}</div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 dark:text-white">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.phone}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {results.products.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Products</h3>
            <div className="space-y-2">
              {results.products.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <Package size={20} className="text-blue-500" />
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 dark:text-white">{p.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(p.price)} {p.unit && `/ ${p.unit}`}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.transactions.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Recent Transactions</h3>
            <div className="space-y-2">
              {results.transactions.map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <FileText size={20} className="text-orange-500" />
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{t.customerName}</p>
                    <p className="text-xs text-gray-500 truncate">{t.items} • {formatDate(t.date)}</p>
                  </div>
                  <p className={`font-bold ${t.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(t.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {query.trim() && results.customers.length === 0 && results.products.length === 0 && results.transactions.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <p>No results found for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );
};