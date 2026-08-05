import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Truck } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { SupplierService } from "../services/SupplierService";
import { TopBar } from "../components/TopBar";

export const SuppliersPage = () => {
  const { currentStore, showToast, setSelectedSupplier, setView } = useStore();
  const [suppliers, setSuppliers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", phone: "" });

  const currency = currentStore?.currency || "GH₵";

  const loadSuppliers = async () => {
    if (!currentStore?.id) return;
    const loaded = await SupplierService.getAll(currentStore.id);
    setSuppliers(loaded);
  };

  // FIXED: Changed useState to useEffect
  useEffect(() => {
    loadSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(q) || s.phone.includes(q));
  }, [suppliers, searchQuery]);

  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim()) {
      showToast("Supplier name is required!");
      return;
    }
    try {
      await SupplierService.addSupplier(currentStore.id, newSupplier.name, newSupplier.phone);
      showToast("✅ Supplier added!");
      setNewSupplier({ name: "", phone: "" });
      setIsAdding(false);
      await loadSuppliers();
    } catch (error) {
      showToast("❌ Failed to add supplier.");
    }
  };

  const handleSelectSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setView("supplierProfile");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Suppliers" subtitle="People I owe" />
      
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search suppliers..."
              className="w-full pl-10 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
            <button 
              onClick={() => setIsAdding(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm active:scale-95 transition"
              title="Add new supplier"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredSuppliers.length === 0 && !searchQuery.trim() ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <Truck className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No suppliers yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Tap the + button to add a supplier you buy from</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 dark:text-gray-500 text-sm">No suppliers match your search.</p>
            </div>
          ) : (
            filteredSuppliers.map(supplier => (
              <button 
                key={supplier.id} 
                onClick={() => handleSelectSupplier(supplier)}
                className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 text-left active:scale-[0.98] transition"
              >
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  {supplier.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{supplier.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{supplier.phone || "No phone number"}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {supplier.balance > 0 ? (
                    <>
                      <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase">I Owe</p>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(supplier.balance, currency)}</p>
                    </>
                  ) : supplier.balance < 0 ? (
                    <>
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Credit</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(Math.abs(supplier.balance), currency)}</p>
                    </>
                  ) : (
                    <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">Paid</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Truck size={20} className="text-indigo-600" />
                Add New Supplier
              </h3>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-300"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="space-y-4">
              <input 
                placeholder="Supplier Name (e.g., Coca-Cola Distributor)" 
                value={newSupplier.name} 
                onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" 
                autoFocus
              />
              <input 
                type="tel"
                placeholder="Phone Number" 
                value={newSupplier.phone} 
                onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" 
              />
              <button 
                onClick={handleAddSupplier}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg"
              >
                Add Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};